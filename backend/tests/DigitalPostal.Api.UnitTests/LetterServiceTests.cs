using System.Text.Json;
using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;
using DigitalPostal.Api.Features.Letters;
using DigitalPostal.Api.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace DigitalPostal.Api.UnitTests;

public class LetterServiceTests
{
    private readonly Mock<IDeliveryTimeCalculator> _mockCalculator = new();

    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static (User Sender, User Recipient, Location SenderLoc, Location RecipientLoc) SeedUsersWithLocations(AppDbContext db)
    {
        var senderLoc = new Location
        {
            Id = Guid.NewGuid(),
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

        var recipientLoc = new Location
        {
            Id = Guid.NewGuid(),
            Code = "GB-LONDON",
            City = "London",
            Country = "United Kingdom",
            CountryCode = "GB",
            Latitude = 51.5074,
            Longitude = -0.1278,
            TimeZone = "Europe/London",
            IsActive = true
        };

        db.Locations.AddRange(senderLoc, recipientLoc);

        var sender = new User
        {
            Id = Guid.NewGuid(),
            Username = "rahul",
            NormalizedUsername = "RAHUL",
            DisplayName = "Rahul",
            Email = "rahul@example.com",
            NormalizedEmail = "RAHUL@EXAMPLE.COM",
            PasswordHash = "hash",
            CurrentLocationId = senderLoc.Id,
            CurrentLocation = senderLoc,
            TimeZone = senderLoc.TimeZone,
            Status = UserStatus.Active
        };

        var recipient = new User
        {
            Id = Guid.NewGuid(),
            Username = "alice",
            NormalizedUsername = "ALICE",
            DisplayName = "Alice",
            Email = "alice@example.com",
            NormalizedEmail = "ALICE@EXAMPLE.COM",
            PasswordHash = "hash",
            CurrentLocationId = recipientLoc.Id,
            CurrentLocation = recipientLoc,
            TimeZone = recipientLoc.TimeZone,
            Status = UserStatus.Active
        };

        db.Users.AddRange(sender, recipient);
        db.SaveChanges();

        return (sender, recipient, senderLoc, recipientLoc);
    }

    [Fact]
    public async Task SendLetterAsync_EmptyRecipient_ReturnsBadRequest()
    {
        using var db = CreateInMemoryDbContext();
        var service = new LetterService(db, _mockCalculator.Object);

        var request = new SendLetterRequest(Guid.Empty, "Hello!");
        var result = await service.SendLetterAsync(Guid.NewGuid(), request, null);

        result.Should().BeOfType<SendLetterResult.BadRequest>()
            .Which.Message.Should().Contain("RecipientId is required");
    }

    [Fact]
    public async Task SendLetterAsync_SendingToSelf_ReturnsBadRequest()
    {
        using var db = CreateInMemoryDbContext();
        var service = new LetterService(db, _mockCalculator.Object);
        var senderId = Guid.NewGuid();

        var request = new SendLetterRequest(senderId, "Hello to myself!");
        var result = await service.SendLetterAsync(senderId, request, null);

        result.Should().BeOfType<SendLetterResult.BadRequest>()
            .Which.Message.Should().Contain("cannot send a letter to yourself");
    }

    [Fact]
    public async Task SendLetterAsync_EmptyContent_ReturnsBadRequest()
    {
        using var db = CreateInMemoryDbContext();
        var service = new LetterService(db, _mockCalculator.Object);
        var senderId = Guid.NewGuid();

        var request = new SendLetterRequest(Guid.NewGuid(), "   ");
        var result = await service.SendLetterAsync(senderId, request, null);

        result.Should().BeOfType<SendLetterResult.BadRequest>()
            .Which.Message.Should().Contain("content cannot be empty");
    }

    [Fact]
    public async Task SendLetterAsync_DuplicateIdempotencyKey_ReturnsCachedResponse()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient, _, _) = SeedUsersWithLocations(db);
        var service = new LetterService(db, _mockCalculator.Object);

        var cachedPayload = new SendLetterResponse(
            Guid.NewGuid(),
            recipient.Id,
            DateTimeOffset.UtcNow.AddMinutes(-5),
            DateTimeOffset.UtcNow.AddDays(2),
            7200.0,
            "IN_TRANSIT"
        );

        db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            Key = "key-12345",
            ResponseStatusCode = StatusCodes.Status201Created,
            ResponseBody = JsonSerializer.Serialize(cachedPayload),
            CreatedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-5)
        });
        await db.SaveChangesAsync();

        var request = new SendLetterRequest(recipient.Id, "Trying again", "key-12345");
        var result = await service.SendLetterAsync(sender.Id, request, "key-12345");

        result.Should().BeOfType<SendLetterResult.Cached>();
        var cached = (SendLetterResult.Cached)result;
        cached.StatusCode.Should().Be(201);
        cached.Response.Id.Should().Be(cachedPayload.Id);
        cached.Response.DistanceKm.Should().Be(7200.0);
    }

    [Fact]
    public async Task SendLetterAsync_RateLimitExceeded_ReturnsRateLimited()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient, senderLoc, recipientLoc) = SeedUsersWithLocations(db);
        var service = new LetterService(db, _mockCalculator.Object);

        // Pre-fill 10 letters sent in the last 10 minutes
        for (int i = 0; i < 10; i++)
        {
            db.Letters.Add(new Letter
            {
                Id = Guid.NewGuid(),
                SenderId = sender.Id,
                RecipientId = recipient.Id,
                OriginLocation = new LocationSnapshot(senderLoc.City, senderLoc.Region, senderLoc.Country, senderLoc.CountryCode, senderLoc.Latitude, senderLoc.Longitude, senderLoc.TimeZone),
                DestinationLocation = new LocationSnapshot(recipientLoc.City, recipientLoc.Region, recipientLoc.Country, recipientLoc.CountryCode, recipientLoc.Latitude, recipientLoc.Longitude, recipientLoc.TimeZone),
                Content = $"Letter #{i}",
                Status = LetterStatus.IN_TRANSIT,
                SentAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10),
                EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(1),
                CreatedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10)
            });
        }
        await db.SaveChangesAsync();

        var request = new SendLetterRequest(recipient.Id, "Letter #11");
        var result = await service.SendLetterAsync(sender.Id, request, null);

        result.Should().BeOfType<SendLetterResult.RateLimited>()
            .Which.Message.Should().Contain("reached the limit of 10 letters per hour");
    }

    [Fact]
    public async Task SendLetterAsync_ValidRequest_DispatchesLetterAndCreatesDispatchedEventAndNotification()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient, senderLoc, recipientLoc) = SeedUsersWithLocations(db);

        // Add a stamp for sender's location
        var stamp = new Stamp
        {
            Id = Guid.NewGuid(),
            LocationId = senderLoc.Id,
            Code = "MUM-GATEWAY",
            Name = "Gateway of India",
            ImageUrl = "https://example.com/stamps/gateway.png",
            Version = 1,
            IsActive = true
        };
        db.Stamps.Add(stamp);
        await db.SaveChangesAsync();

        var estimatedDelivery = DateTimeOffset.UtcNow.AddHours(48);
        _mockCalculator.Setup(c => c.Calculate(It.IsAny<LocationSnapshot>(), It.IsAny<LocationSnapshot>(), It.IsAny<DateTimeOffset>()))
            .Returns(new DeliveryEstimate(7190.5, estimatedDelivery));

        var service = new LetterService(db, _mockCalculator.Object);

        var request = new SendLetterRequest(recipient.Id, "Hello London from Mumbai!", "idem-key-999");
        var result = await service.SendLetterAsync(sender.Id, request, "idem-key-999");

        result.Should().BeOfType<SendLetterResult.Success>();
        var success = (SendLetterResult.Success)result;
        success.Response.RecipientId.Should().Be(recipient.Id);
        success.Response.DistanceKm.Should().Be(7190.5);
        success.Response.Status.Should().Be("IN_TRANSIT");

        // Verify Letter in DB
        var savedLetter = await db.Letters
            .Include(l => l.Events)
            .Include(l => l.Stamps)
            .FirstOrDefaultAsync(l => l.Id == success.Response.Id);

        savedLetter.Should().NotBeNull();
        savedLetter!.SenderId.Should().Be(sender.Id);
        savedLetter.RecipientId.Should().Be(recipient.Id);
        savedLetter.Content.Should().Be("Hello London from Mumbai!");
        savedLetter.Status.Should().Be(LetterStatus.IN_TRANSIT);

        // Verify Event
        savedLetter.Events.Should().HaveCount(1);
        savedLetter.Events.First().EventType.Should().Be(LetterEventType.DISPATCHED);

        // Verify Stamp Applied
        savedLetter.Stamps.Should().HaveCount(1);
        savedLetter.Stamps.First().StampSnapshot.Name.Should().Be("Gateway of India");

        // Verify Anonymous Notification for recipient
        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.LetterId == savedLetter.Id);
        notification.Should().NotBeNull();
        notification!.UserId.Should().Be(recipient.Id);
        notification.Type.Should().Be(NotificationType.LETTER_IN_TRANSIT);
        notification.Body.Should().Be("Someone has sent you a letter.");

        // Verify Idempotency Record saved
        var idemRecord = await db.IdempotencyRecords.FirstOrDefaultAsync(r => r.Key == "idem-key-999");
        idemRecord.Should().NotBeNull();
        idemRecord!.SenderId.Should().Be(sender.Id);
    }

    [Fact]
    public async Task GetLetterByIdAsync_UnauthorizedUser_ReturnsNotFound()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient, senderLoc, recipientLoc) = SeedUsersWithLocations(db);
        var service = new LetterService(db, _mockCalculator.Object);

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot(senderLoc.City, senderLoc.Region, senderLoc.Country, senderLoc.CountryCode, senderLoc.Latitude, senderLoc.Longitude, senderLoc.TimeZone),
            DestinationLocation = new LocationSnapshot(recipientLoc.City, recipientLoc.Region, recipientLoc.Country, recipientLoc.CountryCode, recipientLoc.Latitude, recipientLoc.Longitude, recipientLoc.TimeZone),
            Content = "Top secret",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = DateTimeOffset.UtcNow,
            EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(2),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var outsiderUserId = Guid.NewGuid();
        var result = await service.GetLetterByIdAsync(letter.Id, outsiderUserId);

        result.Should().BeOfType<GetLetterResult.NotFound>();
    }

    [Fact]
    public async Task GetLetterByIdAsync_RecipientBeforeDelivery_ReturnsRedactedInTransitSummary()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient, senderLoc, recipientLoc) = SeedUsersWithLocations(db);
        var service = new LetterService(db, _mockCalculator.Object);

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot(senderLoc.City, senderLoc.Region, senderLoc.Country, senderLoc.CountryCode, senderLoc.Latitude, senderLoc.Longitude, senderLoc.TimeZone),
            DestinationLocation = new LocationSnapshot(recipientLoc.City, recipientLoc.Region, recipientLoc.Country, recipientLoc.CountryCode, recipientLoc.Latitude, recipientLoc.Longitude, recipientLoc.TimeZone),
            Content = "Secret Message",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = DateTimeOffset.UtcNow,
            EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(2),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var result = await service.GetLetterByIdAsync(letter.Id, recipient.Id);

        result.Should().BeOfType<GetLetterResult.Redacted>();
        var redacted = ((GetLetterResult.Redacted)result).Letter;
        redacted.Id.Should().Be(letter.Id);
        redacted.Status.Should().Be("IN_TRANSIT");
        redacted.EstimatedDeliveryAtUtc.Should().Be(letter.EstimatedDeliveryAtUtc);
    }

    [Fact]
    public async Task GetLetterByIdAsync_Sender_ReturnsFullLetterDetail()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient, senderLoc, recipientLoc) = SeedUsersWithLocations(db);
        var service = new LetterService(db, _mockCalculator.Object);

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot(senderLoc.City, senderLoc.Region, senderLoc.Country, senderLoc.CountryCode, senderLoc.Latitude, senderLoc.Longitude, senderLoc.TimeZone),
            DestinationLocation = new LocationSnapshot(recipientLoc.City, recipientLoc.Region, recipientLoc.Country, recipientLoc.CountryCode, recipientLoc.Latitude, recipientLoc.Longitude, recipientLoc.TimeZone),
            Content = "Sender can always see this",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = DateTimeOffset.UtcNow,
            EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(2),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var result = await service.GetLetterByIdAsync(letter.Id, sender.Id);

        result.Should().BeOfType<GetLetterResult.Full>();
        var full = ((GetLetterResult.Full)result).Letter;
        full.Id.Should().Be(letter.Id);
        full.Content.Should().Be("Sender can always see this");
        full.SenderId.Should().Be(sender.Id);
        full.RecipientId.Should().Be(recipient.Id);
    }

    [Fact]
    public async Task GetLetterByIdAsync_RecipientAfterDelivery_ReturnsFullLetterDetail()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient, senderLoc, recipientLoc) = SeedUsersWithLocations(db);
        var service = new LetterService(db, _mockCalculator.Object);

        var deliveredTime = DateTimeOffset.UtcNow.AddMinutes(-5);
        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot(senderLoc.City, senderLoc.Region, senderLoc.Country, senderLoc.CountryCode, senderLoc.Latitude, senderLoc.Longitude, senderLoc.TimeZone),
            DestinationLocation = new LocationSnapshot(recipientLoc.City, recipientLoc.Region, recipientLoc.Country, recipientLoc.CountryCode, recipientLoc.Latitude, recipientLoc.Longitude, recipientLoc.TimeZone),
            Content = "Delivered message revealed!",
            Status = LetterStatus.DELIVERED,
            SentAtUtc = DateTimeOffset.UtcNow.AddDays(-2),
            EstimatedDeliveryAtUtc = deliveredTime,
            DeliveredAtUtc = deliveredTime,
            CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-2)
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var result = await service.GetLetterByIdAsync(letter.Id, recipient.Id);

        result.Should().BeOfType<GetLetterResult.Full>();
        var full = ((GetLetterResult.Full)result).Letter;
        full.Content.Should().Be("Delivered message revealed!");
        full.DeliveredAtUtc.Should().Be(deliveredTime);
    }
}
