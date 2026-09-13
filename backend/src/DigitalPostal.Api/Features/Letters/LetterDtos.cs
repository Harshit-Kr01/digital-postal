namespace DigitalPostal.Api.Features.Letters;

/// <summary>
/// Request payload sent by the frontend
/// </summary>
public sealed record SendLetterRequest(
    Guid RecipientId,
    string Content,
    string? IdempotencyKey = null
);

/// <summary>
/// Response payload returned to the sender
/// </summary>
public sealed record SendLetterResponse(
    Guid Id,
    Guid RecipientId,
    DateTimeOffset SentAtUtc,
    DateTimeOffset EstimatedDeliveryAtUtc,
    double DistanceKm,
    string Status
);