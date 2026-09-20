using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;
using DigitalPostal.Api.Infrastructure.Persistence;
using DigitalPostal.Api.Workers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace DigitalPostal.Api.UnitTests;

public class DeliveryProcessorTests
{
    private sealed class TestTimeProvider(DateTimeOffset initialTime) : TimeProvider
    {
        private DateTimeOffset _utcNow = initialTime;
        public override DateTimeOffset GetUtcNow() => _utcNow;
        public void Advance(TimeSpan duration) => _utcNow += duration;
    }

    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task ProcessDueLettersAsync_TransitionsStatus_AndAppliesEventStampNotification()
    {
        using var db = CreateInMemoryDbContext();
        var startTime = new DateTimeOffset(2026, 9, 20, 12, 0, 0, TimeSpan.Zero);
        var timeProvider = new TestTimeProvider(startTime);

        var destLoc = new Location
        {
            Id = Guid.NewGuid(),
            Code = "GB-LONDON",
            City = "London",
            Country = "United Kingdom",
            CountryCode = "GB",
            TimeZone = "Europe/London",
            IsActive = true
        };

        var destStamp = new Stamp
        {
            Id = Guid.NewGuid(),
            LocationId = destLoc.Id,
            Location = destLoc,
            Code = "GB-LDN-BIGBEN",
            Name = "Big Ben",
            ImageUrl = "https://assets.digitalpostal.app/stamps/bigben.png",
            IsActive = true,
            Version = 1
        };

        var recipient = new User
        {
            Id = Guid.NewGuid(),
            Username = "recipient",
            NormalizedUsername = "RECIPIENT",
            DisplayName = "Recipient",
            Email = "r@test.com",
            NormalizedEmail = "R@TEST.COM",
            PasswordHash = "h",
            CurrentLocationId = destLoc.Id,
            TimeZone = "Europe/London",
            Status = UserStatus.Active
        };

        var dueLetter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = Guid.NewGuid(),
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", "GL", "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Hello from Mumbai",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = startTime.AddHours(-10),
            EstimatedDeliveryAtUtc = startTime.AddHours(-1)
        };

        db.Locations.Add(destLoc);
        db.Stamps.Add(destStamp);
        db.Users.Add(recipient);
        db.Letters.Add(dueLetter);
        await db.SaveChangesAsync();

        var processor = new DeliveryProcessor(db, timeProvider, NullLogger<DeliveryProcessor>.Instance);

        // Act
        var result = await processor.ProcessDueLettersAsync(batchSize: 10);

        // Assert
        result.Claimed.Should().Be(1);
        result.Delivered.Should().Be(1);
        result.Failed.Should().Be(0);

        var letter = await db.Letters
            .Include(l => l.Events)
            .Include(l => l.Stamps)
            .FirstAsync(l => l.Id == dueLetter.Id);

        letter.Status.Should().Be(LetterStatus.DELIVERED);
        letter.DeliveredAtUtc.Should().Be(startTime);

        letter.Events.Should().ContainSingle(e => e.EventType == LetterEventType.DELIVERED);
        letter.Stamps.Should().ContainSingle(s => s.StampSnapshot.Name == "Big Ben");

        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.LetterId == dueLetter.Id);
        notification.Should().NotBeNull();
        notification!.Type.Should().Be(NotificationType.LETTER_DELIVERED);
    }

    [Fact]
    public async Task ProcessDueLettersAsync_IgnoresFutureLetters_UntilTimeAdvances()
    {
        using var db = CreateInMemoryDbContext();
        var startTime = new DateTimeOffset(2026, 9, 20, 12, 0, 0, TimeSpan.Zero);
        var timeProvider = new TestTimeProvider(startTime);

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", "GL", "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Patience",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = startTime,
            EstimatedDeliveryAtUtc = startTime.AddHours(2) // Due in 2 hours
        };

        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var processor = new DeliveryProcessor(db, timeProvider, NullLogger<DeliveryProcessor>.Instance);

        // Step 1: Query at current time (should not be delivered)
        var firstRun = await processor.ProcessDueLettersAsync(batchSize: 10);
        firstRun.Delivered.Should().Be(0);

        // Step 2: Advance time by 3 hours using TimeProvider
        timeProvider.Advance(TimeSpan.FromHours(3));

        // Step 3: Query after time advanced
        var secondRun = await processor.ProcessDueLettersAsync(batchSize: 10);
        secondRun.Delivered.Should().Be(1);

        var updated = await db.Letters.FindAsync(letter.Id);
        updated!.Status.Should().Be(LetterStatus.DELIVERED);
    }

    [Fact]
    public async Task ProcessDueLettersAsync_ResilientToPoisonPill_DeliversRemainingBatch()
    {
        using var db = CreateInMemoryDbContext();
        var startTime = new DateTimeOffset(2026, 9, 20, 12, 0, 0, TimeSpan.Zero);
        var timeProvider = new TestTimeProvider(startTime);

        // Valid Letter 1
        var validLetter1 = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", "GL", "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Valid 1",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = startTime.AddHours(-5),
            EstimatedDeliveryAtUtc = startTime.AddHours(-2)
        };

        // Poison Pill Letter (Null DestinationLocation will throw NullReferenceException during processing)
        var poisonLetter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = null!, // Intentionally broken
            Content = "Corrupt Letter",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = startTime.AddHours(-5),
            EstimatedDeliveryAtUtc = startTime.AddHours(-2)
        };

        // Valid Letter 2
        var validLetter2 = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = Guid.NewGuid(),
            RecipientId = Guid.NewGuid(),
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", "GL", "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Valid 2",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = startTime.AddHours(-5),
            EstimatedDeliveryAtUtc = startTime.AddHours(-2)
        };

        db.Letters.AddRange(validLetter1, poisonLetter, validLetter2);
        await db.SaveChangesAsync();

        var processor = new DeliveryProcessor(db, timeProvider, NullLogger<DeliveryProcessor>.Instance);

        // Act
        var result = await processor.ProcessDueLettersAsync(batchSize: 10);

        // Assert: The 1 poison pill failed, but the other 2 letters delivered successfully
        result.Claimed.Should().Be(3);
        result.Delivered.Should().Be(2);
        result.Failed.Should().Be(1);

        var v1 = await db.Letters.FindAsync(validLetter1.Id);
        var v2 = await db.Letters.FindAsync(validLetter2.Id);
        var p = await db.Letters.FindAsync(poisonLetter.Id);

        v1!.Status.Should().Be(LetterStatus.DELIVERED);
        v2!.Status.Should().Be(LetterStatus.DELIVERED);
        p!.Status.Should().Be(LetterStatus.IN_TRANSIT); // Remained IN_TRANSIT
    }
}
