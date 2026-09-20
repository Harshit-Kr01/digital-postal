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

    [Fact]
    public async Task GetUserNotifications_CursorPagination_ReturnsOlderNotifications()
    {
        using var db = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var nNewest = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "Notification 1 (newest)",
            Body = "Body 1",
            CreatedAtUtc = now.AddMinutes(-5)
        };
        var nMiddle = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "Notification 2 (middle)",
            Body = "Body 2",
            CreatedAtUtc = now.AddMinutes(-15)
        };
        var nOldest = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "Notification 3 (oldest)",
            Body = "Body 3",
            CreatedAtUtc = now.AddMinutes(-30)
        };

        db.Notifications.AddRange(nNewest, nMiddle, nOldest);
        await db.SaveChangesAsync();

        var service = new NotificationService(db);

        // Page 1: limit 2
        var page1 = await service.GetUserNotificationsAsync(userId, unreadOnly: null, before: null, limit: 2);
        page1.Should().HaveCount(2);
        page1[0].Id.Should().Be(nNewest.Id);
        page1[1].Id.Should().Be(nMiddle.Id);

        // Page 2: pass before = middle notification's CreatedAtUtc
        var page2 = await service.GetUserNotificationsAsync(userId, unreadOnly: null, before: nMiddle.CreatedAtUtc, limit: 2);
        page2.Should().HaveCount(1);
        page2[0].Id.Should().Be(nOldest.Id);
    }
}
