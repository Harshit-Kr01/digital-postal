namespace DigitalPostal.Api.Features.Notifications;

public sealed record NotificationDto(
    Guid Id,
    Guid LetterId,
    string Type,
    string Title,
    string Body,
    bool IsRead,
    DateTimeOffset? ReadAtUtc,
    DateTimeOffset CreatedAtUtc
);
