using DigitalPostal.Api.Domain.ValueObjects;

namespace DigitalPostal.Api.Features.Letters;

/// <summary>
/// Request payload sent by the frontend to dispatch a letter
/// </summary>
public sealed record SendLetterRequest(
    Guid RecipientId,
    string Content,
    string? IdempotencyKey = null
);

/// <summary>
/// Response payload returned to the sender immediately after dispatch
/// </summary>
public sealed record SendLetterResponse(
    Guid Id,
    Guid RecipientId,
    DateTimeOffset SentAtUtc,
    DateTimeOffset EstimatedDeliveryAtUtc,
    double DistanceKm,
    string Status
);

/// <summary>
/// Full letter detail response for the sender or for the recipient after delivery
/// </summary>
public sealed record LetterDetailResponse(
    Guid Id,
    Guid SenderId,
    string SenderDisplayName,
    Guid RecipientId,
    LocationSnapshot OriginLocation,
    LocationSnapshot DestinationLocation,
    string Content,
    DateTimeOffset SentAtUtc,
    DateTimeOffset EstimatedDeliveryAtUtc,
    DateTimeOffset? DeliveredAtUtc,
    double DistanceKm,
    string Status,
    IReadOnlyList<LetterStampDetailDto> Stamps,
    IReadOnlyList<LetterEventDetailDto> Events
);

/// <summary>
/// Redacted letter response for recipient while letter is still in transit (Privacy Rule)
/// </summary>
public sealed record InTransitLetterSummaryResponse(
    Guid Id,
    DateTimeOffset EstimatedDeliveryAtUtc,
    string Status
);

public sealed record LetterStampDetailDto(
    string Name,
    string ImageUrl,
    int Version,
    DateTimeOffset AppliedAtUtc
);

public sealed record LetterEventDetailDto(
    string EventType,
    DateTimeOffset OccurredAtUtc
);
