using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;
using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Features.Letters;

public static class LetterEndpoints
{
    private const int MaxContentLength = 5000;

    public static RouteGroupBuilder MapLetterEndpoints(this RouteGroupBuilder group)
    {
        var letters = group.MapGroup("/letters")
                           .WithTags("Letters")
                           .RequireAuthorization();

        letters.MapPost("/", async (
            SendLetterRequest request,
            [FromHeader(Name = "Idempotency-Key")] string? headerIdempotencyKey,
            ClaimsPrincipal principal,
            AppDbContext db,
            IDeliveryTimeCalculator deliveryCalculator,
            CancellationToken ct) =>
        {
            var senderIdStr = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                           ?? principal.FindFirstValue("sub")
                           ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(senderIdStr, out var senderId))
            {
                return Results.Unauthorized();
            }

            // Validate Request Content & Recipient
            if (request.RecipientId == Guid.Empty)
            {
                return Results.BadRequest(new { error = "RecipientId is required." });
            }

            if (request.RecipientId == senderId)
            {
                return Results.BadRequest(new { error = "You cannot send a letter to yourself." });
            }

            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return Results.BadRequest(new { error = "Letter content cannot be empty." });
            }

            if (request.Content.Length > MaxContentLength)
            {
                return Results.BadRequest(new { error = $"Letter content exceeds maximum length of {MaxContentLength} characters." });
            }

            // Handle Idempotency
            var idempotencyKey = !string.IsNullOrWhiteSpace(headerIdempotencyKey)
                ? headerIdempotencyKey.Trim()
                : request.IdempotencyKey?.Trim();

            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                var existingRecord = await db.IdempotencyRecords
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.SenderId == senderId && r.Key == idempotencyKey, ct);

                if (existingRecord != null)
                {
                    var cachedResponse = JsonSerializer.Deserialize<SendLetterResponse>(existingRecord.ResponseBody);
                    return Results.Json(cachedResponse, statusCode: existingRecord.ResponseStatusCode);
                }
            }

            // Fetch Sender with Location
            var sender = await db.Users
                .Include(u => u.CurrentLocation)
                .FirstOrDefaultAsync(u => u.Id == senderId, ct);

            if (sender?.CurrentLocation == null)
            {
                return Results.BadRequest(new { error = "Sender does not have an active postal location." });
            }

            // Fetch Recipient with Location
            var recipient = await db.Users
                .Include(u => u.CurrentLocation)
                .FirstOrDefaultAsync(u => u.Id == request.RecipientId, ct);

            if (recipient == null || recipient.Status != UserStatus.Active)
            {
                return Results.NotFound(new { error = "Recipient not found or inactive." });
            }

            if (recipient.CurrentLocation == null)
            {
                return Results.BadRequest(new { error = "Recipient does not have an active postal location." });
            }

            // Create Location Snapshots (Immutable at time of dispatch)
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

            // Calculate Distance & Delivery Time
            var now = DateTimeOffset.UtcNow;
            var estimate = deliveryCalculator.Calculate(originSnapshot, destinationSnapshot, now);

            // Build Letter Entity
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

            // Record DISPATCHED Event
            var dispatchedEvent = new LetterEvent
            {
                Id = Guid.NewGuid(),
                LetterId = letter.Id,
                EventType = LetterEventType.DISPATCHED,
                LocationSnapshot = originSnapshot,
                OccurredAtUtc = now
            };
            letter.Events.Add(dispatchedEvent);

            // Check and Apply Origin Stamp
            var originStamp = await db.Stamps
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

            // Create Anonymous Recipient Notification
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

            // Save Idempotency Record
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
                db.IdempotencyRecords.Add(record);
            }

            db.Letters.Add(letter);
            db.Notifications.Add(notification);

            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/v1/letters/{letter.Id}", response);
        })
        .WithName("SendLetter")
        .WithSummary("Dispatch a new letter to a recipient");

        return group;
    }
}
