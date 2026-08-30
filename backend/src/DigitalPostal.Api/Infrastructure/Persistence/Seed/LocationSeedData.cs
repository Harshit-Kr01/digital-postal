using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Infrastructure.Persistence.Seed;

public static class LocationSeedData
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Locations.AnyAsync())
        {
            return; // Already seeded
        }

        var mumbai = new Location
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "IN-MUMBAI",
            City = "Mumbai",
            Region = "Maharashtra",
            Country = "India",
            CountryCode = "IN",
            Latitude = 19.0760,
            Longitude = 72.8777,
            TimeZone = "Asia/Kolkata",
            IsActive = true
        };

        var london = new Location
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Code = "GB-LONDON",
            City = "London",
            Region = "Greater London",
            Country = "United Kingdom",
            CountryCode = "GB",
            Latitude = 51.5074,
            Longitude = -0.1278,
            TimeZone = "Europe/London",
            IsActive = true
        };

        var tokyo = new Location
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Code = "JP-TOKYO",
            City = "Tokyo",
            Region = "Kanto",
            Country = "Japan",
            CountryCode = "JP",
            Latitude = 35.6762,
            Longitude = 139.6503,
            TimeZone = "Asia/Tokyo",
            IsActive = true
        };

        var newYork = new Location
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            Code = "US-NYC",
            City = "New York",
            Region = "New York",
            Country = "United States",
            CountryCode = "US",
            Latitude = 40.7128,
            Longitude = -74.0060,
            TimeZone = "America/New_York",
            IsActive = true
        };

        var paris = new Location
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
            Code = "FR-PARIS",
            City = "Paris",
            Region = "Île-de-France",
            Country = "France",
            CountryCode = "FR",
            Latitude = 48.8566,
            Longitude = 2.3522,
            TimeZone = "Europe/Paris",
            IsActive = true
        };

        context.Locations.AddRange(mumbai, london, tokyo, newYork, paris);

        var stamps = new List<Stamp>
        {
            new()
            {
                Id = Guid.NewGuid(),
                LocationId = mumbai.Id,
                Code = "IN-MUM-GATEWAY",
                Name = "Gateway of India",
                ImageUrl = "https://assets.digitalpostal.app/stamps/mumbai-gateway.png",
                Description = "Historic monument overlooking the Arabian Sea.",
                Version = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                LocationId = london.Id,
                Code = "GB-LDN-BIGBEN",
                Name = "Big Ben",
                ImageUrl = "https://assets.digitalpostal.app/stamps/london-bigben.png",
                Description = "Iconic clock tower by the River Thames.",
                Version = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                LocationId = tokyo.Id,
                Code = "JP-TYO-FUJI",
                Name = "Mount Fuji View",
                ImageUrl = "https://assets.digitalpostal.app/stamps/tokyo-fuji.png",
                Description = "Majestic sacred peak overlooking Tokyo.",
                Version = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                LocationId = newYork.Id,
                Code = "US-NYC-STATUE",
                Name = "Statue of Liberty",
                ImageUrl = "https://assets.digitalpostal.app/stamps/nyc-liberty.png",
                Description = "Symbol of freedom in New York Harbor.",
                Version = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                LocationId = paris.Id,
                Code = "FR-PAR-EIFFEL",
                Name = "Eiffel Tower",
                ImageUrl = "https://assets.digitalpostal.app/stamps/paris-eiffel.png",
                Description = "The Iron Lady of the Champ de Mars.",
                Version = 1
            }
        };

        context.Stamps.AddRange(stamps);
        await context.SaveChangesAsync();
    }
}
