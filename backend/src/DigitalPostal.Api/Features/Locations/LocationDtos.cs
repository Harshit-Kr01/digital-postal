namespace DigitalPostal.Api.Features.Locations;

public sealed record LocationDto(
    Guid Id,
    string Code,
    string City,
    string? Region,
    string Country,
    string CountryCode,
    string TimeZone
);
