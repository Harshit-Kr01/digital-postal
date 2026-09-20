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
        all.Items.Should().HaveCount(2);
        all.HasMore.Should().BeFalse();
        all.NextCursor.Should().BeNull();

        var unreadOnly = await service.GetUserNotificationsAsync(userId, unreadOnly: true, limit: 20);
        unreadOnly.Items.Should().HaveCount(1);
        unreadOnly.Items.First().Title.Should().Be("Unread");
        unreadOnly.Items.First().IsRead.Should().BeFalse();
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
        var page1 = await service.GetUserNotificationsAsync(userId, unreadOnly: null, cursor: null, limit: 2);
        page1.Items.Should().HaveCount(2);
        page1.HasMore.Should().BeTrue();
        page1.NextCursor.Should().NotBeNull();
        page1.Items[0].Id.Should().Be(nNewest.Id);
        page1.Items[1].Id.Should().Be(nMiddle.Id);

        // Page 2: pass cursor from page 1
        var page2 = await service.GetUserNotificationsAsync(userId, unreadOnly: null, cursor: page1.NextCursor, limit: 2);
        page2.Items.Should().HaveCount(1);
        page2.HasMore.Should().BeFalse();
        page2.NextCursor.Should().BeNull();
        page2.Items[0].Id.Should().Be(nOldest.Id);
    }

    [Fact]
    public async Task GetUserNotifications_TimestampCollision_TieBreaksById()
    {
        using var db = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var exactSameTime = DateTimeOffset.UtcNow.AddMinutes(-5);
        var id1 = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var id2 = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        var n1 = new Notification
        {
            Id = id1,
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "Notification Collision 1",
            Body = "Body 1",
            CreatedAtUtc = exactSameTime
        };
        var n2 = new Notification
        {
            Id = id2,
            UserId = userId,
            LetterId = Guid.NewGuid(),
            Type = NotificationType.LETTER_IN_TRANSIT,
            Title = "Notification Collision 2",
            Body = "Body 2",
            CreatedAtUtc = exactSameTime
        };

        db.Notifications.AddRange(n1, n2);
        await db.SaveChangesAsync();

        var service = new NotificationService(db);

        var page1 = await service.GetUserNotificationsAsync(userId, unreadOnly: null, cursor: null, limit: 1);
        page1.Items.Should().HaveCount(1);
        page1.HasMore.Should().BeTrue();
        page1.NextCursor.Should().NotBeNull();

        var page2 = await service.GetUserNotificationsAsync(userId, unreadOnly: null, cursor: page1.NextCursor, limit: 1);
        page2.Items.Should().HaveCount(1);
        page2.HasMore.Should().BeFalse();

        var firstId = page1.Items[0].Id;
        var secondId = page2.Items[0].Id;

        firstId.Should().NotBe(secondId);
        new[] { firstId, secondId }.Should().BeEquivalentTo(new[] { id1, id2 });
    }
}
