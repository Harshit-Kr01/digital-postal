using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Features.Notifications;
using DigitalPostal.Api.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.UnitTests;

public class NotificationServiceTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetUserNotifications_UnreadOnly_FiltersCorrectly()
    {
        using var db = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();

        var unreadNotification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "Unread",
            Body = "Body 1",
            ReadAtUtc = null,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        var readNotification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_DELIVERED,
            Title = "Read",
            Body = "Body 2",
            ReadAtUtc = DateTimeOffset.UtcNow,
            CreatedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10)
        };

        db.Notifications.AddRange(unreadNotification, readNotification);
        await db.SaveChangesAsync();

        var service = new NotificationService(db);

        var all = await service.GetUserNotificationsAsync(userId, unreadOnly: false, limit: 20);
        all.Should().HaveCount(2);

        var unreadOnly = await service.GetUserNotificationsAsync(userId, unreadOnly: true, limit: 20);
        unreadOnly.Should().HaveCount(1);
        unreadOnly.First().Title.Should().Be("Unread");
        unreadOnly.First().IsRead.Should().BeFalse();
    }

    [Fact]
    public async Task MarkAsReadAsync_ValidIdAndUser_MarksNotificationAsRead()
    {
        using var db = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "New Letter",
            Body = "Someone sent you a letter.",
            ReadAtUtc = null,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        var service = new NotificationService(db);
        var result = await service.MarkAsReadAsync(notification.Id, userId);

        result.Should().Be(MarkNotificationResult.Success);

        var updated = await db.Notifications.FindAsync(notification.Id);
        updated!.ReadAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task MarkAsReadAsync_StrangerOrNonExistent_ReturnsNotFound()
    {
        using var db = CreateInMemoryDbContext();
        var ownerId = Guid.NewGuid();
        var strangerId = Guid.NewGuid();

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "New Letter",
            Body = "Someone sent you a letter.",
            ReadAtUtc = null,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        var service = new NotificationService(db);

        var resultNotFound = await service.MarkAsReadAsync(Guid.NewGuid(), ownerId);
        resultNotFound.Should().Be(MarkNotificationResult.NotFound);

        var resultStranger = await service.MarkAsReadAsync(notification.Id, strangerId);
        resultStranger.Should().Be(MarkNotificationResult.NotFound);
    }
}
