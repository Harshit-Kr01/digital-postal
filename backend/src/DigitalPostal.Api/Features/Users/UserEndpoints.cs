using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DigitalPostal.Api.Features.Locations;
using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Features.Users;

public static class UserEndpoints
{
    public static RouteGroupBuilder MapUserEndpoints(this RouteGroupBuilder group)
    {
        // 1. Current user endpoints (Protected)
        var me = group.MapGroup("/me")
                      .WithTags("Current User")
                      .RequireAuthorization();

        me.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userIdStr = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? principal.FindFirstValue("sub")
                         ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdStr, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await db.Users
                .Include(u => u.CurrentLocation)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
            {
                return Results.NotFound();
            }

            var location = user.CurrentLocation!;
            var locationDto = new LocationDto(
                location.Id,
                location.Code,
                location.City,
                location.Region,
                location.Country,
                location.CountryCode,
                location.TimeZone
            );

            var profile = new UserProfileDto(
                user.Id,
                user.Username,
                user.DisplayName,
                user.Email,
                locationDto,
                user.TimeZone,
                user.CreatedAtUtc
            );

            return Results.Ok(profile);
        })
        .WithName("GetCurrentUser")
        .WithSummary("Get profile of authenticated user");

        me.MapPut("/location", async (
            UpdateLocationRequest request,
            ClaimsPrincipal principal,
            AppDbContext db,
            CancellationToken ct) =>
        {
            var userIdStr = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? principal.FindFirstValue("sub")
                         ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdStr, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
            if (user == null)
            {
                return Results.NotFound();
            }

            var newLocation = await db.Locations.FirstOrDefaultAsync(l => l.Id == request.LocationId && l.IsActive, ct);
            if (newLocation == null)
            {
                return Results.BadRequest(new { error = "Location is invalid or inactive." });
            }

            user.CurrentLocationId = newLocation.Id;
            user.TimeZone = newLocation.TimeZone;
            await db.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("UpdateUserLocation")
        .WithSummary("Update current postal location (affects future letters only)");

        // 2. Recipient search endpoint (Privacy-safe: only exposes id, username, displayName)
        var users = group.MapGroup("/users")
                         .WithTags("Users");

        users.MapGet("/search", async (string? q, AppDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            {
                return Results.BadRequest(new { error = "Search query must be at least 2 characters." });
            }

            var query = q.Trim().ToUpperInvariant();

            var matches = await db.Users
                .AsNoTracking()
                .Where(u => u.NormalizedUsername.StartsWith(query))
                .OrderBy(u => u.Username)
                .Take(20)
                .Select(u => new UserSearchResultDto(u.Id, u.Username, u.DisplayName))
                .ToListAsync(ct);

            return Results.Ok(matches);
        })
        .WithName("SearchUsers")
        .WithSummary("Search recipients by username prefix (privacy-safe)");

        return group;
    }
}
