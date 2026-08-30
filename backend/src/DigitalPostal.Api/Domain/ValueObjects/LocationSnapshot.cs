namespace DigitalPostal.Api.Domain.ValueObjects;

public sealed record LocationSnapshot(
    string City,
    string? Region,
    string Country,
    string CountryCode,
    double Latitude,
    double Longitude,
    string TimeZone
);
