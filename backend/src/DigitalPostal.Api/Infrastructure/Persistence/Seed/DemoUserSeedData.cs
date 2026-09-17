using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Infrastructure.Persistence.Seed;

public static class DemoUserSeedData
{
    private const string DemoPassword = "PostalDemo123!";

    private static readonly (string Username, string DisplayName, string Email, string LocationCode)[] Users =
    [
        ("maya_mumbai", "Maya Shah", "maya.mumbai@example.com", "IN-MUMBAI"),
        ("oliver_london", "Oliver Reed", "oliver.london@example.com", "GB-LONDON"),
        ("yuki_tokyo", "Yuki Tanaka", "yuki.tokyo@example.com", "JP-TOKYO"),
        ("alex_nyc", "Alex Morgan", "alex.nyc@example.com", "US-NYC")
    ];

    public static async Task SeedAsync(AppDbContext context, IPasswordHasherService passwordHasher)
    {
        var locations = await context.Locations
            .Where(location => location.IsActive)
            .ToDictionaryAsync(location => location.Code);

        foreach (var demo in Users)
        {
            var normalizedUsername = demo.Username.ToUpperInvariant();
            if (await context.Users.AnyAsync(user => user.NormalizedUsername == normalizedUsername))
            {
                continue;
            }

            if (!locations.TryGetValue(demo.LocationCode, out var location))
            {
                continue;
            }

            var user = new User
            {
                Username = demo.Username,
                NormalizedUsername = normalizedUsername,
                DisplayName = demo.DisplayName,
                Email = demo.Email,
                NormalizedEmail = demo.Email.ToUpperInvariant(),
                CurrentLocationId = location.Id,
                TimeZone = location.TimeZone,
                Status = UserStatus.Active,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };

            user.PasswordHash = passwordHasher.HashPassword(user, DemoPassword);
            context.Users.Add(user);
        }

        await context.SaveChangesAsync();
    }
}
