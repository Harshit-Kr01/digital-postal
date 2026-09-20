using System.Text.Json;
using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;
using DigitalPostal.Api.Features.Letters;
using DigitalPostal.Api.Features.Mailbox;
using DigitalPostal.Api.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.UnitTests;

public class MailboxServiceTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static (User Sender, User Recipient) SeedUsers(AppDbContext db)
    {
        var senderLoc = new Location
        {
            Id = Guid.NewGuid(),
            Code = "IN-MUMBAI",
            City = "Mumbai",
            Country = "India",
            CountryCode = "IN",
            Latitude = 19.0,
            Longitude = 72.8,
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
            Latitude = 51.5,
            Longitude = -0.1,
            TimeZone = "Europe/London",
            IsActive = true
        };

        db.Locations.AddRange(senderLoc, recipientLoc);

        var sender = new User
        {
            Id = Guid.NewGuid(),
            Username = "sender",
            NormalizedUsername = "SENDER",
            DisplayName = "Sender User",
            Email = "sender@example.com",
            NormalizedEmail = "SENDER@EXAMPLE.COM",
            PasswordHash = "hash",
            CurrentLocationId = senderLoc.Id,
            CurrentLocation = senderLoc,
            TimeZone = senderLoc.TimeZone,
            Status = UserStatus.Active
        };

        var recipient = new User
        {
            Id = Guid.NewGuid(),
            Username = "recipient",
            NormalizedUsername = "RECIPIENT",
            DisplayName = "Recipient User",
            Email = "recipient@example.com",
            NormalizedEmail = "RECIPIENT@EXAMPLE.COM",
            PasswordHash = "hash",
            CurrentLocationId = recipientLoc.Id,
            CurrentLocation = recipientLoc,
            TimeZone = recipientLoc.TimeZone,
            Status = UserStatus.Active
        };

        db.Users.AddRange(sender, recipient);
        db.SaveChanges();

        return (sender, recipient);
    }

    [Fact]
    public void IncomingInTransitLetterDto_SerializesWithoutForbiddenFields()
    {
        var dto = new IncomingInTransitLetterDto(
            Guid.NewGuid(),
            "IN_TRANSIT",
            DateTimeOffset.UtcNow.AddDays(2),
            "Around 22 September"
        );

        var json = JsonSerializer.Serialize(dto);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("Id", out _).Should().BeTrue();
        root.TryGetProperty("Status", out _).Should().BeTrue();
        root.TryGetProperty("EstimatedDeliveryAtUtc", out _).Should().BeTrue();
        root.TryGetProperty("DisplayEstimate", out _).Should().BeTrue();

        root.TryGetProperty("Sender", out _).Should().BeFalse();
        root.TryGetProperty("Content", out _).Should().BeFalse();
        root.TryGetProperty("Origin", out _).Should().BeFalse();
        root.TryGetProperty("Destination", out _).Should().BeFalse();
        root.TryGetProperty("Stamps", out _).Should().BeFalse();
    }

    [Fact]
    public async Task GetIncomingMailbox_InTransitLetter_ReturnsRedactedDto()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient) = SeedUsers(db);

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", null, "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Secret Message",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = DateTimeOffset.UtcNow,
            EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(3)
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var service = new MailboxService(db, new LetterAuthorizer());
        var mailbox = await service.GetIncomingMailboxAsync(recipient.Id, 20);

        mailbox.Should().HaveCount(1);
        var item = mailbox.First();
        item.Should().BeOfType<IncomingInTransitLetterDto>();

        var inTransit = (IncomingInTransitLetterDto)item;
        inTransit.Id.Should().Be(letter.Id);
        inTransit.Status.Should().Be("IN_TRANSIT");
        inTransit.DisplayEstimate.Should().StartWith("Around ");
    }

    [Fact]
    public async Task GetIncomingMailbox_DeliveredLetter_ReturnsFullDeliveredDto()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient) = SeedUsers(db);

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", null, "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Hello from Mumbai!",
            Status = LetterStatus.DELIVERED,
            SentAtUtc = DateTimeOffset.UtcNow.AddDays(-3),
            EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(-1),
            DeliveredAtUtc = DateTimeOffset.UtcNow.AddDays(-1)
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var service = new MailboxService(db, new LetterAuthorizer());
        var mailbox = await service.GetIncomingMailboxAsync(recipient.Id, 20);

        mailbox.Should().HaveCount(1);
        var item = mailbox.First();
        item.Should().BeOfType<DeliveredIncomingLetterDto>();

        var delivered = (DeliveredIncomingLetterDto)item;
        delivered.Id.Should().Be(letter.Id);
        delivered.Status.Should().Be("DELIVERED");
        delivered.Content.Should().Be("Hello from Mumbai!");
        delivered.Sender.Username.Should().Be(sender.Username);
        delivered.Origin.City.Should().Be("Mumbai");
        delivered.Destination.City.Should().Be("London");
    }

    [Fact]
    public async Task GetIncomingLetterById_Stranger_ReturnsNotFound()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient) = SeedUsers(db);
        var strangerId = Guid.NewGuid();

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", null, "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Secret Message",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = DateTimeOffset.UtcNow,
            EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(3)
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var service = new MailboxService(db, new LetterAuthorizer());
        var result = await service.GetIncomingLetterByIdAsync(letter.Id, strangerId);

        result.Should().BeOfType<GetIncomingLetterResult.NotFound>();
    }

    [Fact]
    public async Task GetSentMailbox_ReturnsSentLettersForSender()
    {
        using var db = CreateInMemoryDbContext();
        var (sender, recipient) = SeedUsers(db);

        var letter = new Letter
        {
            Id = Guid.NewGuid(),
            SenderId = sender.Id,
            RecipientId = recipient.Id,
            OriginLocation = new LocationSnapshot("Mumbai", "MH", "India", "IN", 19.0, 72.8, "Asia/Kolkata"),
            DestinationLocation = new LocationSnapshot("London", null, "United Kingdom", "GB", 51.5, -0.1, "Europe/London"),
            Content = "Sent letter content",
            Status = LetterStatus.IN_TRANSIT,
            SentAtUtc = DateTimeOffset.UtcNow,
            EstimatedDeliveryAtUtc = DateTimeOffset.UtcNow.AddDays(3)
        };
        db.Letters.Add(letter);
        await db.SaveChangesAsync();

        var service = new MailboxService(db, new LetterAuthorizer());
        var sentList = await service.GetSentMailboxAsync(sender.Id, 20);

        sentList.Should().HaveCount(1);
        var sent = sentList.First();
        sent.Id.Should().Be(letter.Id);
        sent.Recipient.Username.Should().Be(recipient.Username);
        sent.Content.Should().Be("Sent letter content");
    }
}
