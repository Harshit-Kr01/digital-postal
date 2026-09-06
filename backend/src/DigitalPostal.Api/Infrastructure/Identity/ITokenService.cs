using DigitalPostal.Api.Domain.Entities;

namespace DigitalPostal.Api.Infrastructure.Identity;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    (string rawToken, string tokenHash) GenerateRefreshToken();
    string HashToken(string token);
}
