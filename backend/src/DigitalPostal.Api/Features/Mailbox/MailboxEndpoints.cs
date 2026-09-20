using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DigitalPostal.Api.Features.Mailbox;

public static class MailboxEndpoints
{
    public static RouteGroupBuilder MapMailboxEndpoints(this RouteGroupBuilder group)
    {
        var mailbox = group.MapGroup("/mailbox")
                           .WithTags("Mailbox")
                           .RequireAuthorization();

        // GET /api/v1/mailbox/incoming
        mailbox.MapGet("/incoming", async (
            int? limit,
            ClaimsPrincipal principal,
            MailboxService mailboxService,
            CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var items = await mailboxService.GetIncomingMailboxAsync(userId.Value, limit ?? 20, ct);
            return Results.Ok(items);
        })
        .WithName("GetIncomingMailbox")
        .WithSummary("List incoming letters for the authenticated recipient");

        // GET /api/v1/mailbox/incoming/{id}
        mailbox.MapGet("/incoming/{id:guid}", async (
            Guid id,
            ClaimsPrincipal principal,
            MailboxService mailboxService,
            CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var result = await mailboxService.GetIncomingLetterByIdAsync(id, userId.Value, ct);

            return result switch
            {
                GetIncomingLetterResult.InTransit t => Results.Ok(t.Letter),
                GetIncomingLetterResult.Delivered d => Results.Ok(d.Letter),
                GetIncomingLetterResult.NotFound => Results.NotFound(new { error = "Letter not found." }),
                _ => Results.StatusCode(StatusCodes.Status500InternalServerError)
            };
        })
        .WithName("GetIncomingLetterById")
        .WithSummary("Get details for an incoming letter (anonymous if in transit)");

        // GET /api/v1/mailbox/sent
        mailbox.MapGet("/sent", async (
            int? limit,
            ClaimsPrincipal principal,
            MailboxService mailboxService,
            CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var items = await mailboxService.GetSentMailboxAsync(userId.Value, limit ?? 20, ct);
            return Results.Ok(items);
        })
        .WithName("GetSentMailbox")
        .WithSummary("List letters sent by the authenticated user");

        // GET /api/v1/mailbox/sent/{id}
        mailbox.MapGet("/sent/{id:guid}", async (
            Guid id,
            ClaimsPrincipal principal,
            MailboxService mailboxService,
            CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var result = await mailboxService.GetSentLetterByIdAsync(id, userId.Value, ct);

            return result switch
            {
                GetSentLetterResult.Success s => Results.Ok(s.Letter),
                GetSentLetterResult.NotFound => Results.NotFound(new { error = "Letter not found." }),
                _ => Results.StatusCode(StatusCodes.Status500InternalServerError)
            };
        })
        .WithName("GetSentLetterById")
        .WithSummary("Get details of a letter sent by the authenticated user");

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
