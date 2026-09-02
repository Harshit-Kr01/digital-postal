using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Features.Locations;

public static class LocationEndpoints
   {
    public static RouteGroupBuilder MapLocationEndpoints(this RouteGroupBuilder group)
    {
        var locations = group.MapGroup("/locations")
                            .WithTags("Locations");

        locations.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
        {
            var items = await db.Locations
                .AsNoTracking()
                .Where(l => l.IsActive)
                .OrderBy(l => l.Country)
                .ThenBy(l => l.City)
                .Select(l => new LocationDto(
                    l.Id,
                    l.Code,
                    l.City,
                    l.Region,
                    l.Country,
                    l.CountryCode,
                    l.TimeZone
                ))
                .ToListAsync(ct);

            return Results.Ok(items);
        })
        .WithName("GetLocations")
        .WithSummary("Retrieve all active postal locations");

        locations.MapGet("/search", async (string? q, AppDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return Results.Ok(Array.Empty<LocationDto>());
            }

            var query = q.Trim().ToLower();

            var items = await db.Locations
                .AsNoTracking()
                .Where(l => l.IsActive && (
                    l.City.ToLower().Contains(query) ||
                    (l.Region != null && l.Region.ToLower().Contains(query)) ||
                    l.Country.ToLower().Contains(query) ||
                    l.Code.ToLower().Contains(query)
                ))
                .OrderBy(l => l.City)
                .Take(20)
                .Select(l => new LocationDto(
                    l.Id,
                    l.Code,
                    l.City,
                    l.Region,
                    l.Country,
                    l.CountryCode,
                    l.TimeZone
                ))
                .ToListAsync(ct);

            return Results.Ok(items);
        })
        .WithName("SearchLocations")
        .WithSummary("Search active postal locations by keyword");

        return group;
    }
}
