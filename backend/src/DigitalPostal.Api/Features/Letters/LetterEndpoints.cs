using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace DigitalPostal.Api.Features.Letters;

public static class LetterEndpoints
{
    public static RouteGroupBuilder MapLetterEndpoints(this RouteGroupBuilder group)
    {
        var letters = group.MapGroup("/letters")
                           .WithTags("Letters")
                           .RequireAuthorization();

        // POST /api/v1/letters
        letters.MapPost("/", async (
            SendLetterRequest request,
            [FromHeader(Name = "Idempotency-Key")] string? headerIdempotencyKey,
            ClaimsPrincipal principal,
            LetterService letterService,
            CancellationToken ct) =>
        {
            var senderIdStr = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? principal.FindFirstValue("sub")
                         ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(senderIdStr, out var senderId))
            {
                return Results.Unauthorized();
            }

            var idempotencyKey = !string.IsNullOrWhiteSpace(headerIdempotencyKey)
                ? headerIdempotencyKey.Trim()
                : request.IdempotencyKey?.Trim();

            var result = await letterService.SendLetterAsync(senderId, request, idempotencyKey, ct);

            return result switch
            {
                SendLetterResult.Success s => Results.Created($"/api/v1/letters/{s.Response.Id}", s.Response),
                SendLetterResult.Cached c => Results.Json(c.Response, statusCode: c.StatusCode),
                SendLetterResult.RateLimited r => Results.Problem(
                    statusCode: StatusCodes.Status429TooManyRequests,
                    title: "Rate limit exceeded",
                    detail: r.Message
                ),
                SendLetterResult.NotFound n => Results.NotFound(new { error = n.Message }),
                SendLetterResult.BadRequest b => Results.BadRequest(new { error = b.Message }),
                _ => Results.StatusCode(StatusCodes.Status500InternalServerError)
            };
        })
        .WithName("SendLetter")
        .WithSummary("Dispatch a new letter to a recipient");

        // GET /api/v1/letters/{id}
        letters.MapGet("/{id:guid}", async (
            Guid id,
            ClaimsPrincipal principal,
            LetterService letterService,
            CancellationToken ct) =>
        {
            var userIdStr = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? principal.FindFirstValue("sub")
                         ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdStr, out var currentUserId))
            {
                return Results.Unauthorized();
            }

            var result = await letterService.GetLetterByIdAsync(id, currentUserId, ct);

            return result switch
            {
                GetLetterResult.Full f => Results.Ok(f.Letter),
                GetLetterResult.Redacted r => Results.Ok(r.Letter),
                GetLetterResult.NotFound => Results.NotFound(new { error = "Letter not found." }),
                _ => Results.StatusCode(StatusCodes.Status500InternalServerError)
            };
        })
        .WithName("GetLetterById")
        .WithSummary("Get letter details (subject to privacy rules and delivery status)");

        // GET /api/v1/letters/{id}/journey
        letters.MapGet("/{id:guid}/journey", async (
            Guid id,
            ClaimsPrincipal principal,
            LetterService letterService,
            CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var result = await letterService.GetJourneyAsync(id, userId.Value, ct);

            return result switch
            {
                GetJourneyResult.Success s => Results.Ok(s.Journey),
                GetJourneyResult.NotFound => Results.NotFound(new { error = "Letter not found." }),
                _ => Results.StatusCode(StatusCodes.Status500InternalServerError)
            };
        })
        .WithName("GetLetterJourney")
        .WithSummary("Get journey timeline of a letter (restricted for recipient until delivery)");

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
