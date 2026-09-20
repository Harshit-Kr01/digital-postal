using DigitalPostal.Api.Common.Pagination;
using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Features.Notifications;

public enum MarkNotificationResult
{
    Success,
    NotFound
}

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<NotificationDto>> GetUserNotificationsAsync(
        Guid userId,
        bool? unreadOnly,
        string? cursor,
        int limit = 20,
        CancellationToken ct = default)
    {
        var pageSize = Math.Clamp(limit, 1, 50);

        var query = _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly == true)
        {
            query = query.Where(n => n.ReadAtUtc == null);
        }

        if (CursorHelper.TryDecode(cursor, out var cursorTimestamp, out var cursorId))
        {
            if (cursorId == Guid.Empty)
            {
                query = query.Where(n => n.CreatedAtUtc < cursorTimestamp);
            }
            else
            {
                query = query.Where(n => n.CreatedAtUtc < cursorTimestamp ||
                    (n.CreatedAtUtc == cursorTimestamp && n.Id.CompareTo(cursorId) < 0));
            }
        }

        var notifications = await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .ThenByDescending(n => n.Id)
            .Take(pageSize + 1)
            .Select(n => new NotificationDto(
                n.Id,
                n.LetterId,
                n.Type.ToString(),
                n.Title,
                n.Body,
                n.ReadAtUtc != null,
                n.ReadAtUtc,
                n.CreatedAtUtc
            ))
            .ToListAsync(ct);

        var hasMore = notifications.Count > pageSize;
        var pagedNotifications = hasMore ? notifications.Take(pageSize).ToList() : notifications;

        string? nextCursor = null;
        if (hasMore && pagedNotifications.Count > 0)
        {
            var lastNotification = pagedNotifications[^1];
            nextCursor = CursorHelper.CreateCursor(lastNotification.CreatedAtUtc, lastNotification.Id);
        }

        return new PagedResult<NotificationDto>(pagedNotifications, nextCursor, hasMore);
    }

    public Task<PagedResult<NotificationDto>> GetUserNotificationsAsync(
        Guid userId,
        bool? unreadOnly,
        int limit,
        CancellationToken ct = default) =>
        GetUserNotificationsAsync(userId, unreadOnly, null, limit, ct);

    public async Task<MarkNotificationResult> MarkAsReadAsync(
        Guid notificationId,
        Guid userId,
        CancellationToken ct = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, ct);

        if (notification == null)
        {
            return MarkNotificationResult.NotFound;
        }

        if (notification.ReadAtUtc == null)
        {
            notification.ReadAtUtc = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return MarkNotificationResult.Success;
    }
}
