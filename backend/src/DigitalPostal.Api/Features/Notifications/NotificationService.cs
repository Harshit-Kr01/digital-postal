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

    public async Task<IReadOnlyList<NotificationDto>> GetUserNotificationsAsync(
        Guid userId,
        bool? unreadOnly,
        int limit,
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

        return await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(pageSize)
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
    }

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
