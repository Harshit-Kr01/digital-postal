namespace DigitalPostal.Api.Features.Stamps;

public record StampDto(
    Guid Id,
    Guid LocationId,
    string Code,
    string Name,
    string ImageUrl,
    string Description,
    int Version
);
