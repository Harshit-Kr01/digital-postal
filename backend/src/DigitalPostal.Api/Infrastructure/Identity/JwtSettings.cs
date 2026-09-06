namespace DigitalPostal.Api.Infrastructure.Identity;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "DigitalPostal";
    public string Audience { get; set; } = "DigitalPostalWeb";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenExpiryMinutes { get; set; } = 15;
    public int RefreshTokenExpiryDays { get; set; } = 14;
}
