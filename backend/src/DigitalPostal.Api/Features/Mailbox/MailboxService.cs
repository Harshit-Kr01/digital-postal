using System.Globalization;
using DigitalPostal.Api.Common.Pagination;
using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Features.Letters;
using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Features.Mailbox;

public abstract record GetIncomingLetterResult
{
    public sealed record InTransit(IncomingInTransitLetterDto Letter) : GetIncomingLetterResult;
    public sealed record Delivered(DeliveredIncomingLetterDto Letter) : GetIncomingLetterResult;
    public sealed record NotFound() : GetIncomingLetterResult;
}

public abstract record GetSentLetterResult
{
    public sealed record Success(SentLetterDto Letter) : GetSentLetterResult;
    public sealed record NotFound() : GetSentLetterResult;
}

public class MailboxService
{
    private readonly AppDbContext _db;
    private readonly LetterAuthorizer _authorizer;

    public MailboxService(AppDbContext db, LetterAuthorizer authorizer)
    {
        _db = db;
        _authorizer = authorizer;
    }

    public async Task<PagedResult<object>> GetIncomingMailboxAsync(
        Guid recipientId,
        string? cursor,
        int limit = 20,
        CancellationToken ct = default)
    {
        var pageSize = Math.Clamp(limit, 1, 50);

        var query = _db.Letters
            .Include(l => l.Sender)
            .Include(l => l.Stamps)
            .AsNoTracking()
            .Where(l => l.RecipientId == recipientId);

        if (CursorHelper.TryDecode(cursor, out var cursorTimestamp, out var cursorId))
        {
            if (cursorId == Guid.Empty)
            {
                query = query.Where(l => l.SentAtUtc < cursorTimestamp);
            }
            else
            {
                query = query.Where(l => l.SentAtUtc < cursorTimestamp ||
                    (l.SentAtUtc == cursorTimestamp && l.Id.CompareTo(cursorId) < 0));
            }
        }

        var letters = await query
            .OrderByDescending(l => l.SentAtUtc)
            .ThenByDescending(l => l.Id)
            .Take(pageSize + 1)
            .ToListAsync(ct);

        var hasMore = letters.Count > pageSize;
        var pagedLetters = hasMore ? letters.Take(pageSize).ToList() : letters;

        var items = pagedLetters.Select<Letter, object>(l =>
        {
            if (!_authorizer.CanViewFullContent(l, recipientId))
            {
                return MapToInTransitDto(l);
            }

            return MapToDeliveredDto(l);
        }).ToList();

        string? nextCursor = null;
        if (hasMore && pagedLetters.Count > 0)
        {
            var lastLetter = pagedLetters[^1];
            nextCursor = CursorHelper.CreateCursor(lastLetter.SentAtUtc, lastLetter.Id);
        }

        return new PagedResult<object>(items, nextCursor, hasMore);
    }

    public Task<PagedResult<object>> GetIncomingMailboxAsync(
        Guid recipientId,
        int limit,
        CancellationToken ct = default) =>
        GetIncomingMailboxAsync(recipientId, null, limit, ct);

    public async Task<GetIncomingLetterResult> GetIncomingLetterByIdAsync(
        Guid letterId,
        Guid recipientId,
        CancellationToken ct = default)
    {
        var letter = await _db.Letters
            .Include(l => l.Sender)
            .Include(l => l.Stamps)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == letterId && l.RecipientId == recipientId, ct);

        if (letter == null || !_authorizer.CanAccess(letter, recipientId))
        {
            return new GetIncomingLetterResult.NotFound();
        }

        if (!_authorizer.CanViewFullContent(letter, recipientId))
        {
            return new GetIncomingLetterResult.InTransit(MapToInTransitDto(letter));
        }

        return new GetIncomingLetterResult.Delivered(MapToDeliveredDto(letter));
    }

    public async Task<PagedResult<SentLetterDto>> GetSentMailboxAsync(
        Guid senderId,
        string? cursor,
        int limit = 20,
        CancellationToken ct = default)
    {
        var pageSize = Math.Clamp(limit, 1, 50);

        var query = _db.Letters
            .Include(l => l.Recipient)
            .Include(l => l.Stamps)
            .AsNoTracking()
            .Where(l => l.SenderId == senderId);

        if (CursorHelper.TryDecode(cursor, out var cursorTimestamp, out var cursorId))
        {
            if (cursorId == Guid.Empty)
            {
                query = query.Where(l => l.SentAtUtc < cursorTimestamp);
            }
            else
            {
                query = query.Where(l => l.SentAtUtc < cursorTimestamp ||
                    (l.SentAtUtc == cursorTimestamp && l.Id.CompareTo(cursorId) < 0));
            }
        }

        var letters = await query
            .OrderByDescending(l => l.SentAtUtc)
            .ThenByDescending(l => l.Id)
            .Take(pageSize + 1)
            .ToListAsync(ct);

        var hasMore = letters.Count > pageSize;
        var pagedLetters = hasMore ? letters.Take(pageSize).ToList() : letters;

        var items = pagedLetters.Select(MapToSentDto).ToList();

        string? nextCursor = null;
        if (hasMore && pagedLetters.Count > 0)
        {
            var lastLetter = pagedLetters[^1];
            nextCursor = CursorHelper.CreateCursor(lastLetter.SentAtUtc, lastLetter.Id);
        }

        return new PagedResult<SentLetterDto>(items, nextCursor, hasMore);
    }

    public Task<PagedResult<SentLetterDto>> GetSentMailboxAsync(
        Guid senderId,
        int limit,
        CancellationToken ct = default) =>
        GetSentMailboxAsync(senderId, null, limit, ct);

    public async Task<GetSentLetterResult> GetSentLetterByIdAsync(
        Guid letterId,
        Guid senderId,
        CancellationToken ct = default)
    {
        var letter = await _db.Letters
            .Include(l => l.Recipient)
            .Include(l => l.Stamps)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == letterId && l.SenderId == senderId, ct);

        if (letter == null || !_authorizer.CanAccess(letter, senderId))
        {
            return new GetSentLetterResult.NotFound();
        }

        return new GetSentLetterResult.Success(MapToSentDto(letter));
    }

    private static IncomingInTransitLetterDto MapToInTransitDto(Letter letter) =>
        new(
            letter.Id,
            letter.Status.ToString(),
            letter.EstimatedDeliveryAtUtc,
            FormatDisplayEstimate(letter.EstimatedDeliveryAtUtc)
        );

    private static DeliveredIncomingLetterDto MapToDeliveredDto(Letter letter) =>
        new(
            letter.Id,
            letter.Status.ToString(),
            new PostalPartyDto(letter.Sender!.Id, letter.Sender.Username, letter.Sender.DisplayName),
            letter.Content,
            new PostalLocationDto(letter.OriginLocation.City, letter.OriginLocation.Region, letter.OriginLocation.Country, letter.OriginLocation.CountryCode),
            new PostalLocationDto(letter.DestinationLocation.City, letter.DestinationLocation.Region, letter.DestinationLocation.Country, letter.DestinationLocation.CountryCode),
            letter.SentAtUtc,
            letter.EstimatedDeliveryAtUtc,
            letter.DeliveredAtUtc ?? letter.EstimatedDeliveryAtUtc,
            letter.Stamps.Select(s => new MailboxStampDto(s.StampSnapshot.Name, s.StampSnapshot.ImageUrl, s.AppliedAtUtc)).ToList()
        );

    private static SentLetterDto MapToSentDto(Letter letter) =>
        new(
            letter.Id,
            letter.Status.ToString(),
            new PostalPartyDto(letter.Recipient!.Id, letter.Recipient.Username, letter.Recipient.DisplayName),
            letter.Content,
            new PostalLocationDto(letter.DestinationLocation.City, letter.DestinationLocation.Region, letter.DestinationLocation.Country, letter.DestinationLocation.CountryCode),
            letter.SentAtUtc,
            letter.EstimatedDeliveryAtUtc,
            letter.DeliveredAtUtc,
            letter.Stamps.Select(s => new MailboxStampDto(s.StampSnapshot.Name, s.StampSnapshot.ImageUrl, s.AppliedAtUtc)).ToList()
        );

    private static string FormatDisplayEstimate(DateTimeOffset estimatedAt) =>
        $"Around {estimatedAt.ToString("d MMMM", CultureInfo.InvariantCulture)}";
}
