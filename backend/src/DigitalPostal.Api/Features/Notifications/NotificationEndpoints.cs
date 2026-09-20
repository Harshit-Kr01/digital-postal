using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DigitalPostal.Api.Features.Notifications;

public static class NotificationEndpoints
{
    public static RouteGroupBuilder MapNotificationEndpoints(this RouteGroupBuilder group)
    {
        var notifications = group.MapGroup("/notifications")
                                 .WithTags("Notifications")
                                 .RequireAuthorization();

        // GET /api/v1/notifications
        notifications.MapGet("/", async (
            bool? unreadOnly,
            DateTimeOffset? before,
            int? limit,
            ClaimsPrincipal principal,
            NotificationService notificationService,
            CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var list = await notificationService.GetUserNotificationsAsync(userId.Value, unreadOnly, before, limit ?? 20, ct);
            return Results.Ok(list);
        })
        .WithName("GetNotifications")
        .WithSummary("Get in-app notifications for authenticated user (supports cursor pagination via before)");

        // POST /api/v1/notifications/{id}/read
        notifications.MapPost("/{id:guid}/read", async (
            Guid id,
            ClaimsPrincipal principal,
            NotificationService notificationService,
            CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var result = await notificationService.MarkAsReadAsync(id, userId.Value, ct);

            return result switch
            {
                MarkNotificationResult.Success => Results.NoContent(),
                MarkNotificationResult.NotFound => Results.NotFound(new { error = "Notification not found." }),
                _ => Results.StatusCode(StatusCodes.Status500InternalServerError)
            };
        })
        .WithName("MarkNotificationAsRead")
        .WithSummary("Mark a notification as read");

        return group;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var userIdStr = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? principal.FindFirstValue("sub")
                     ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userIdStr, out var id) ? id : null;
    }
}
