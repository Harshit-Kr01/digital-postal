using DigitalPostal.Api.Features.Locations;

namespace DigitalPostal.Api.Features.Users;

public sealed record UserProfileDto(
    Guid Id,
    string Username,
    string DisplayName,
    string Email,
    LocationDto Location,
    string TimeZone,
    DateTimeOffset CreatedAtUtc
);

public sealed record UpdateLocationRequest(
    Guid LocationId
);

public sealed record UserSearchResultDto(
    Guid Id,
    string Username,
    string DisplayName,
    string LocationCity,
    double LocationLatitude,
    double LocationLongitude
);
