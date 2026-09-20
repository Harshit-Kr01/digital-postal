namespace DigitalPostal.Api.Features.Mailbox;

public sealed record PostalPartyDto(
    Guid Id,
    string Username,
    string DisplayName
);

public sealed record PostalLocationDto(
    string City,
    string? Region,
    string Country,
    string CountryCode
);

public sealed record MailboxStampDto(
    string Name,
    string ImageUrl,
    DateTimeOffset AppliedAtUtc
);

/// <summary>
/// Pre-delivery anonymous arrival card for the recipient.
/// Strictly omits sender, content, origin, and stamps.
/// </summary>
public sealed record IncomingInTransitLetterDto(
    Guid Id,
    string Status,
    DateTimeOffset EstimatedDeliveryAtUtc,
    string DisplayEstimate
);

/// <summary>
/// Full revealed letter for the recipient once delivered.
/// </summary>
public sealed record DeliveredIncomingLetterDto(
    Guid Id,
    string Status,
    PostalPartyDto Sender,
    string Content,
    PostalLocationDto Origin,
    PostalLocationDto Destination,
    DateTimeOffset SentAtUtc,
    DateTimeOffset EstimatedDeliveryAtUtc,
    DateTimeOffset DeliveredAtUtc,
    IReadOnlyList<MailboxStampDto> Stamps
);

/// <summary>
/// Dispatched letter view for the sender.
/// </summary>
public sealed record SentLetterDto(
    Guid Id,
    string Status,
    PostalPartyDto Recipient,
    string Content,
    PostalLocationDto Destination,
    DateTimeOffset SentAtUtc,
    DateTimeOffset EstimatedDeliveryAtUtc,
    DateTimeOffset? DeliveredAtUtc,
    IReadOnlyList<MailboxStampDto> Stamps
);
