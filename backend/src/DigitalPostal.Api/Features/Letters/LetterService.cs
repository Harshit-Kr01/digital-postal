using System.Text.Json;
using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;
using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Features.Letters;

public abstract record SendLetterResult
{
    public sealed record Success(SendLetterResponse Response) : SendLetterResult;
    public sealed record Cached(SendLetterResponse Response, int StatusCode) : SendLetterResult;
    public sealed record RateLimited(string Message) : SendLetterResult;
    public sealed record NotFound(string Message) : SendLetterResult;
    public sealed record BadRequest(string Message) : SendLetterResult;
}

public abstract record GetLetterResult
{
    public sealed record Full(LetterDetailResponse Letter) : GetLetterResult;
    public sealed record Redacted(InTransitLetterSummaryResponse Letter) : GetLetterResult;
    public sealed record NotFound() : GetLetterResult;
}

public abstract record GetJourneyResult
{
    public sealed record Success(LetterJourneyResponse Journey) : GetJourneyResult;
    public sealed record NotFound() : GetJourneyResult;
}

public class LetterService
{
    private const int MaxContentLength = 5000;
    private const int MaxLettersPerHour = 10;

    private readonly AppDbContext _db;
    private readonly IDeliveryTimeCalculator _deliveryCalculator;
    private readonly LetterAuthorizer _authorizer;

    public LetterService(AppDbContext db, IDeliveryTimeCalculator deliveryCalculator, LetterAuthorizer? authorizer = null)
    {
        _db = db;
        _deliveryCalculator = deliveryCalculator;
        _authorizer = authorizer ?? new LetterAuthorizer();
    }

    public async Task<SendLetterResult> SendLetterAsync(
        Guid senderId,
        SendLetterRequest request,
        string? idempotencyKey,
        CancellationToken ct = default)
    {
        // 1. Validate basic input
        if (request.RecipientId == Guid.Empty)
        {
            return new SendLetterResult.BadRequest("RecipientId is required.");
        }

        if (request.RecipientId == senderId)
        {
            return new SendLetterResult.BadRequest("You cannot send a letter to yourself.");
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return new SendLetterResult.BadRequest("Letter content cannot be empty.");
        }

        if (request.Content.Length > MaxContentLength)
        {
            return new SendLetterResult.BadRequest($"Letter content exceeds maximum length of {MaxContentLength} characters.");
        }

        // 2. Handle Idempotency check
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            var existingRecord = await _db.IdempotencyRecords
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.SenderId == senderId && r.Key == idempotencyKey, ct);

            if (existingRecord != null)
            {
                var cachedResponse = JsonSerializer.Deserialize<SendLetterResponse>(existingRecord.ResponseBody);
                if (cachedResponse != null)
                {
                    return new SendLetterResult.Cached(cachedResponse, existingRecord.ResponseStatusCode);
                }
            }
        }

        // 3. Rate limiting check (e.g. max 10 letters per hour)
        var oneHourAgo = DateTimeOffset.UtcNow.AddHours(-1);
        var recentLetterCount = await _db.Letters
            .CountAsync(l => l.SenderId == senderId && l.CreatedAtUtc >= oneHourAgo, ct);

        if (recentLetterCount >= MaxLettersPerHour)
        {
            return new SendLetterResult.RateLimited($"You have reached the limit of {MaxLettersPerHour} letters per hour. Please try again later.");
        }

        // 4. Fetch Sender with Location
        var sender = await _db.Users
            .Include(u => u.CurrentLocation)
            .FirstOrDefaultAsync(u => u.Id == senderId, ct);

        if (sender?.CurrentLocation == null)
        {
            return new SendLetterResult.BadRequest("Sender does not have an active postal location.");
        }

        // 5. Fetch Recipient with Location
        var recipient = await _db.Users
            .Include(u => u.CurrentLocation)
            .FirstOrDefaultAsync(u => u.Id == request.RecipientId, ct);

        if (recipient == null || recipient.Status != UserStatus.Active)
        {
            return new SendLetterResult.NotFound("Recipient not found or inactive.");
        }

        if (recipient.CurrentLocation == null)
        {
            return new SendLetterResult.BadRequest("Recipient does not have an active postal location.");
        }

        // 6. Create immutable location snapshots
        var originSnapshot = new LocationSnapshot(
            sender.CurrentLocation.City,
            sender.CurrentLocation.Region,
            sender.CurrentLocation.Country,
            sender.CurrentLocation.CountryCode,
            sender.CurrentLocation.Latitude,
            sender.CurrentLocation.Longitude,
            sender.CurrentLocation.TimeZone
        );

        var destinationSnapshot = new LocationSnapshot(
            recipient.CurrentLocation.City,
            recipient.CurrentLocation.Region,
            recipient.CurrentLocation.Country,
            recipient.CurrentLocation.CountryCode,
            recipient.CurrentLocation.Latitude,
            recipient.CurrentLocation.Longitude,
            recipient.CurrentLocation.TimeZone
        );

        // 7. Calculate Distance & Delivery Time
        var now = DateTimeOffset.UtcNow;
        var estimate = _deliveryCalculator.Calculate(originSnapshot, destinationSnapshot, now);

        // 8. Build Letter Entity
        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            RecipientId = recipient.Id,
            OriginLocation = originSnapshot,
            DestinationLocation = destinationSnapshot,
            Content = request.Content.Trim(),
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = now,
            EstimatedDeliveryAtUtc = estimate.EstimatedDeliveryAtUtc,
            DistanceKm = estimate.DistanceKm,
            CalculationVersion = "1.0",
            CreatedAtUtc = now
        };

        // 9. Record DISPATCHED Event
        var dispatchedEvent = new LetterEvent
        {
            Id = Guid.NewGuid(),
            LetterId = letter.Id,
            EventType = LetterEventType.DISPATCHED,
            LocationSnapshot = originSnapshot with { },
            OccurredAtUtc = now
        };
        letter.Events.Add(dispatchedEvent);

        // 10. Check & Apply Origin Stamp
        var originStamp = await _db.Stamps
            .Where(s => s.LocationId == sender.CurrentLocationId && s.IsActive)
            .OrderBy(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(ct);

        if (originStamp != null)
        {
            var letterStamp = new LetterStamp
            {
                Id = Guid.NewGuid(),
                LetterId = letter.Id,
                StampId = originStamp.Id,
                StampSnapshot = new StampSnapshot(
                    originStamp.Name,
                    originStamp.ImageUrl,
                    originStamp.Version
                ),
                LetterEventId = dispatchedEvent.Id,
                AppliedAtUtc = now
            };
            letter.Stamps.Add(letterStamp);
        }

        // 11. Create Anonymous Recipient Notification
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = recipient.Id,
            LetterId = letter.Id,
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "New Letter in Transit",
            Body = "Someone has sent you a letter.",
            CreatedAtUtc = now
        };

        var response = new SendLetterResponse(
            letter.Id,
            letter.RecipientId,
            letter.SentAtUtc,
            letter.EstimatedDeliveryAtUtc,
            letter.DistanceKm,
            letter.Status.ToString()
        );

        // 12. Save Idempotency Record
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            var record = new IdempotencyRecord
            {
                Id = Guid.NewGuid(),
                SenderId = senderId,
                Key = idempotencyKey,
                ResponseStatusCode = StatusCodes.Status201Created,
                ResponseBody = JsonSerializer.Serialize(response),
                CreatedAtUtc = now
            };
            _db.IdempotencyRecords.Add(record);
        }

        _db.Letters.Add(letter);
        _db.Notifications.Add(notification);

        await _db.SaveChangesAsync(ct);

        return new SendLetterResult.Success(response);
    }

    public async Task<GetLetterResult> GetLetterByIdAsync(
        Guid letterId,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        var letter = await _db.Letters
            .Include(l => l.Sender)
            .Include(l => l.Stamps)
            .Include(l => l.Events)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == letterId, ct);

        // Access check: only sender or recipient can access
        if (letter == null || (letter.SenderId != currentUserId && letter.RecipientId != currentUserId))
        {
            return new GetLetterResult.NotFound();
        }

        // Privacy rule: Recipient viewing in-transit letter gets redacted view
        if (letter.RecipientId == currentUserId && letter.Status == LetterStatus.IN_TRANSIT)
        {
            var redacted = new InTransitLetterSummaryResponse(
                letter.Id,
                letter.EstimatedDeliveryAtUtc,
                letter.Status.ToString()
            );
            return new GetLetterResult.Redacted(redacted);
        }

        // Sender or delivered recipient gets full details
        var full = new LetterDetailResponse(
            letter.Id,
            letter.SenderId,
            letter.Sender?.DisplayName ?? string.Empty,
            letter.RecipientId,
            letter.OriginLocation,
            letter.DestinationLocation,
            letter.Content,
            letter.SentAtUtc,
            letter.EstimatedDeliveryAtUtc,
            letter.DeliveredAtUtc,
            letter.DistanceKm,
            letter.Status.ToString(),
            letter.Stamps.Select(s => new LetterStampDetailDto(
                s.StampSnapshot.Name,
                s.StampSnapshot.ImageUrl,
                s.StampSnapshot.Version,
                s.AppliedAtUtc
            )).ToList(),
            letter.Events.OrderBy(e => e.OccurredAtUtc).Select(e => new LetterEventDetailDto(
                e.EventType.ToString(),
                e.OccurredAtUtc
            )).ToList()
        );

        return new GetLetterResult.Full(full);
    }

    public async Task<GetJourneyResult> GetJourneyAsync(
        Guid letterId,
        Guid currentUserId,
        CancellationToken ct = default)
    {
        var letter = await _db.Letters
            .Include(l => l.Events)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == letterId, ct);

        if (letter == null || !_authorizer.CanViewJourney(letter, currentUserId))
        {
            return new GetJourneyResult.NotFound();
        }

        var events = letter.Events
            .OrderBy(e => e.OccurredAtUtc)
            .Select(e => new LetterJourneyEventDto(
                e.EventType.ToString(),
                e.OccurredAtUtc,
                FormatEventDisplayLabel(e)
            ))
            .ToList();

        return new GetJourneyResult.Success(new LetterJourneyResponse(letter.Id, events));
    }

    private static string FormatEventDisplayLabel(LetterEvent e) =>
        e.EventType switch
        {
            LetterEventType.DISPATCHED when e.LocationSnapshot != null =>
                $"Dispatched from {e.LocationSnapshot.City}, {e.LocationSnapshot.Country}",
            LetterEventType.DISPATCHED => "Dispatched",
            LetterEventType.IN_TRANSIT when e.LocationSnapshot != null =>
                $"In transit via {e.LocationSnapshot.City}, {e.LocationSnapshot.Country}",
            LetterEventType.IN_TRANSIT => "In transit",
            LetterEventType.ARRIVED_AT_DESTINATION when e.LocationSnapshot != null =>
                $"Arrived at destination hub: {e.LocationSnapshot.City}, {e.LocationSnapshot.Country}",
            LetterEventType.ARRIVED_AT_DESTINATION => "Arrived at destination hub",
            LetterEventType.DELIVERED when e.LocationSnapshot != null =>
                $"Delivered to {e.LocationSnapshot.City}, {e.LocationSnapshot.Country}",
            LetterEventType.DELIVERED => "Delivered",
            _ => e.EventType.ToString()
        };
}
