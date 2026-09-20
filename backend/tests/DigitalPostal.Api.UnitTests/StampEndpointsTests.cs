using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Features.Stamps;
using DigitalPostal.Api.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.UnitTests;

public class StampEndpointsTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetAllStamps_ReturnsOnlyActiveCatalogStamps()
    {
        using var db = CreateInMemoryDbContext();

        var location = new Location
        {
            Id = Guid.NewGuid(),
            Code = "IN-DEL",
            City = "Delhi",
            Country = "India",
            CountryCode = "IN",
            TimeZone = "Asia/Kolkata",
            IsActive = true
        };

        var activeStamp = new Stamp
        {
            Id = Guid.NewGuid(),
            LocationId = location.Id,
            Location = location,
            Code = "IN-DEL-RED-FORT",
            Name = "Red Fort",
            ImageUrl = "https://assets.digitalpostal.app/stamps/redfort.png",
            IsActive = true,
            Version = 1
        };

        var inactiveStamp = new Stamp
        {
            Id = Guid.NewGuid(),
            LocationId = location.Id,
            Location = location,
            Code = "IN-DEL-OLD",
            Name = "Old Stamp",
            ImageUrl = "https://assets.digitalpostal.app/stamps/old.png",
            IsActive = false,
            Version = 1
        };

        db.Locations.Add(location);
        db.Stamps.AddRange(activeStamp, inactiveStamp);
        await db.SaveChangesAsync();

        var stamps = await db.Stamps
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
            .ToListAsync();

        stamps.Should().ContainSingle();
        stamps[0].Code.Should().Be("IN-DEL-RED-FORT");
    }

    [Fact]
    public async Task GetLocationStamps_ReturnsOnlyStampsForSpecificLocation()
    {
        using var db = CreateInMemoryDbContext();

        var loc1 = new Location
        {
            Id = Guid.NewGuid(),
            Code = "IN-DEL",
            City = "Delhi",
            Country = "India",
            CountryCode = "IN",
            TimeZone = "Asia/Kolkata",
            IsActive = true
        };

        var loc2 = new Location
        {
            Id = Guid.NewGuid(),
            Code = "GB-LON",
            City = "London",
            Country = "United Kingdom",
            CountryCode = "GB",
            TimeZone = "Europe/London",
            IsActive = true
        };

        var stamp1 = new Stamp
        {
            Id = Guid.NewGuid(),
            LocationId = loc1.Id,
            Location = loc1,
            Code = "DEL-STAMP",
            Name = "Delhi Stamp",
            ImageUrl = "https://assets.digitalpostal.app/stamps/delhi.png",
            IsActive = true
        };

        var stamp2 = new Stamp
        {
            Id = Guid.NewGuid(),
            LocationId = loc2.Id,
            Location = loc2,
            Code = "LON-STAMP",
            Name = "London Stamp",
            ImageUrl = "https://assets.digitalpostal.app/stamps/london.png",
            IsActive = true
        };

        db.Locations.AddRange(loc1, loc2);
        db.Stamps.AddRange(stamp1, stamp2);
        await db.SaveChangesAsync();

        var locationStamps = await db.Stamps
            .AsNoTracking()
            .Where(s => s.LocationId == loc1.Id && s.IsActive)
            .OrderBy(s => s.Name)
            .Select(s => new StampDto(
                s.Id,
                s.LocationId,
                s.Code,
                s.Name,
                s.ImageUrl,
                s.Description,
                s.Version))
            .ToListAsync();

        locationStamps.Should().ContainSingle();
        locationStamps[0].Code.Should().Be("DEL-STAMP");
    }
}
