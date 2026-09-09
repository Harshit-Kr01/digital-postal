using System.Text.RegularExpressions;
using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Features.Locations;
using DigitalPostal.Api.Infrastructure.Identity;
using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DigitalPostal.Api.Features.Auth;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly JwtSettings _jwtSettings;

    private static readonly Regex UsernameRegex = new(@"^[a-zA-Z0-9_]{3,30}$", RegexOptions.Compiled);

    public AuthService(AppDbContext db, IPasswordHasherService passwordHasher, ITokenService tokenService, IOptions<JwtSettings> jwtOptions)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _jwtSettings = jwtOptions.Value;
    }

    public async Task<(AuthResponse? Response, string? RefreshToken, string? Error)> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || !UsernameRegex.IsMatch(request.Username.Trim()))
        {
            return (null, null, "Username must be 3-30 characters long and contain only letters, numbers, or underscores.");
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName) || request.DisplayName.Trim().Length > 80)
        {
            return (null, null, "Display name is required and must be between 1 and 80 characters.");
        }

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return (null, null, "A valid email address is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return (null, null, "Password must be at least 8 characters long.");
        }

        var normalizedUsername = request.Username.Trim().ToUpperInvariant();
        var normalizedEmail = request.Email.Trim().ToUpperInvariant();

        if (await _db.Users.AnyAsync(u => u.NormalizedUsername == normalizedUsername, ct))
        {
            return (null, null, "Username is already taken.");
        }

        if (await _db.Users.AnyAsync(u => u.NormalizedEmail == normalizedEmail, ct))
        {
            return (null, null, "Email is already registered.");
        }

        var location = await _db.Locations.FirstOrDefaultAsync(l => l.Id == request.LocationId && l.IsActive, ct);
        if (location == null)
        {
            return (null, null, "Selected postal location is invalid or inactive.");
        }
        var user = new User
        {
            Username = request.Username.Trim(),
            NormalizedUsername = normalizedUsername,
            DisplayName = request.DisplayName.Trim(),
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            CurrentLocationId = location.Id,
            TimeZone = location.TimeZone,
            Status = UserStatus.Active,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        _db.Users.Add(user);
        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync(ct);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var locationDto = new LocationDto(
            location.Id,
            location.Code,
            location.City,
            location.Region,
            location.Country,
            location.CountryCode,
            location.TimeZone
        );

        var response = new AuthResponse(
            user.Id,
            user.Username,
            user.DisplayName,
            user.Email,
            locationDto,
            accessToken
        );

        return (response, rawRefreshToken, null);
    }
    public async Task<(AuthResponse? Response, string? RefreshToken, string? Error)> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.UsernameOrEmail) || string.IsNullOrWhiteSpace(request.Password))
        {
            return (null, null, "Invalid credentials.");
        }

        var identifier = request.UsernameOrEmail.Trim().ToUpperInvariant();

        var user = await _db.Users
            .Include(u => u.CurrentLocation)
            .FirstOrDefaultAsync(u => u.NormalizedUsername == identifier || u.NormalizedEmail == identifier, ct);

        if (user == null || user.Status != UserStatus.Active)
        {
            return (null, null, "Invalid credentials.");
        }

        if (!_passwordHasher.VerifyPassword(user, user.PasswordHash, request.Password))
        {
            return (null, null, "Invalid credentials.");
        }

        var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync(ct);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var location = user.CurrentLocation!;
        var locationDto = new LocationDto(
            location.Id,
            location.Code,
            location.City,
            location.Region,
            location.Country,
            location.CountryCode,
            location.TimeZone
        );

        var response = new AuthResponse(
            user.Id,
            user.Username,
            user.DisplayName,
            user.Email,
            locationDto,
            accessToken
        );

        return (response, rawRefreshToken, null);
    }
    public async Task<(string? AccessToken, string? NewRefreshToken, string? Error)> RefreshTokenAsync(string rawRefreshToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            return (null, null, "Invalid refresh token.");
        }

        var tokenHash = _tokenService.HashToken(rawRefreshToken);

        var tokenRecord = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, ct);

        if (tokenRecord == null || !tokenRecord.IsActive || tokenRecord.User == null || tokenRecord.User.Status != UserStatus.Active)
        {
            return (null, null, "Invalid or expired refresh token.");
        }

        var (newRawToken, newTokenHash) = _tokenService.GenerateRefreshToken();
        tokenRecord.RevokedAtUtc = DateTimeOffset.UtcNow;
        tokenRecord.ReplacedByTokenHash = newTokenHash;

        var newRefreshToken = new RefreshToken
        {
            UserId = tokenRecord.UserId,
            TokenHash = newTokenHash,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        _db.RefreshTokens.Add(newRefreshToken);
        await _db.SaveChangesAsync(ct);

        var accessToken = _tokenService.GenerateAccessToken(tokenRecord.User);
        return (accessToken, newRawToken, null);
    }
    public async Task LogoutAsync(string rawRefreshToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken)) return;

        var tokenHash = _tokenService.HashToken(rawRefreshToken);
        var tokenRecord = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == tokenHash, ct);

        if (tokenRecord != null && tokenRecord.RevokedAtUtc == null)
        {
            tokenRecord.RevokedAtUtc = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }
}
