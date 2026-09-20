using Microsoft.Extensions.Options;
using DigitalPostal.Api.Infrastructure.Identity;

namespace DigitalPostal.Api.Features.Auth;

public static class AuthEndpoints
{
    private const string RefreshTokenCookieName = "refreshToken";

    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        var auth = group.MapGroup("/auth").WithTags("Authentication");

        auth.MapPost("/register", async (
            RegisterRequest request,
            AuthService authService,
            IOptions<JwtSettings> jwtOptions,
            HttpContext httpContext,
            CancellationToken ct) =>
            {
                var (response, refreshToken, error) = await authService.RegisterAsync(request, ct);
                if (error != null)
                {
                    return Results.BadRequest(new { error });
                }

                SetRefreshTokenCookie(httpContext, refreshToken!, jwtOptions.Value.RefreshTokenExpiryDays);
                return Results.Ok(response);
            }).WithName("Register").WithSummary("Register a new user account");

        auth.MapPost("/login", async (
        LoginRequest request,
        AuthService authService,
        IOptions<JwtSettings> jwtOptions,
        HttpContext httpContext,
        CancellationToken ct) =>
        {
            var (response, refreshToken, error) = await authService.LoginAsync(request, ct);
            if (error != null)
            {
                return Results.Json(new { error }, statusCode: StatusCodes.
                  Status401Unauthorized);
            }
            SetRefreshTokenCookie(httpContext, refreshToken!, jwtOptions.Value.RefreshTokenExpiryDays);
            return Results.Ok(response);
        }).WithName("Login").WithSummary("Log in with username or email");

        auth.MapPost("/refresh", async (
            AuthService authService,
            IOptions<JwtSettings> jwtOptions,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            if (!httpContext.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken))
            {
                return Results.Unauthorized();
            }

            var (accessToken, newRefreshToken, error) = await authService.RefreshTokenAsync(refreshToken, ct);
            if (error != null)
            {
                ClearRefreshTokenCookie(httpContext);
                return Results.Unauthorized();
            }

            SetRefreshTokenCookie(httpContext, newRefreshToken!, jwtOptions.Value.RefreshTokenExpiryDays);
            return Results.Ok(new { accessToken });
        })
        .WithName("RefreshToken")
        .WithSummary("Refresh access token using the refresh cookie");

        auth.MapPost("/logout", async (
            AuthService authService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            if (httpContext.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken))
            {
                await authService.LogoutAsync(refreshToken, ct);
            }

            ClearRefreshTokenCookie(httpContext);
            return Results.NoContent();
        })
        .WithName("Logout")
        .WithSummary("Log out and revoke refresh token");

        return group;
    }
    private static void SetRefreshTokenCookie(HttpContext httpContext, string token, int expiryDays)
    {
        httpContext.Response.Cookies.Append(RefreshTokenCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(expiryDays),
            Path = "/"
        });
    }
    public static void ClearRefreshTokenCookie(HttpContext httpContext)
    {
        httpContext.Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });
    }
}
