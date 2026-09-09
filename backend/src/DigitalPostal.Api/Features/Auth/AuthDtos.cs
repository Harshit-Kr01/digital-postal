using DigitalPostal.Api.Features.Locations;

namespace DigitalPostal.Api.Features.Auth;

public sealed record RegisterRequest(
    string Username,
    string DisplayName,
    string Email,
    string Password,
    Guid LocationId
);

public sealed record LoginRequest(
    string UsernameOrEmail,
    string Password
);

public sealed record AuthResponse(
    Guid Id,
    string Username,
    string DisplayName,
    string Email,
    LocationDto Location,
    string AccessToken
);
