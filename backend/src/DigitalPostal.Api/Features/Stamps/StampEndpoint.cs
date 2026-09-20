using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Features.Stamps;

public static class StampEndpoints
{
    public static RouteGroupBuilder MapStampEndpoints(this RouteGroupBuilder group)
    {
        var stamps = group.MapGroup("/stamps")
            .WithTags("Stamps");

        // GET /api/v1/stamps
        stamps.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
        {
            var items = await db.Stamps
                .AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.Name)
                .Select(s => new StampDto(
                    s.Id,
                    s.LocationId,
                    s.Code,
                    s.Name,
                    s.ImageUrl,
                    s.Description,
                    s.Version))
                .ToListAsync(ct);

            return Results.Ok(items);
        })
        .WithName("GetStamps")
        .WithSummary("Retrieve all active stamps in the catalog");

        // GET /api/v1/locations/{id}/stamps
        group.MapGet("/locations/{id:guid}/stamps", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var locationExists = await db.Locations
                .AsNoTracking()
                .AnyAsync(l => l.Id == id && l.IsActive, ct);

            if (!locationExists)
            {
                return Results.NotFound(new { error = "Postal location not found." });
            }

            var items = await db.Stamps
                .AsNoTracking()
                .Where(s => s.LocationId == id && s.IsActive)
                .OrderBy(s => s.Name)
                .Select(s => new StampDto(
                    s.Id,
                    s.LocationId,
                    s.Code,
                    s.Name,
                    s.ImageUrl,
                    s.Description,
                    s.Version))
                .ToListAsync(ct);

            return Results.Ok(items);
        })
        .WithTags("Stamps", "Locations")
        .WithName("GetLocationStamps")
        .WithSummary("Retrieve stamps for a specific postal location");

        return group;
    }
}
