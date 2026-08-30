namespace DigitalPostal.Api.Domain.ValueObjects;

public sealed record StampSnapshot(
    string Name,
    string ImageUrl,
    int Version
);
