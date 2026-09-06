using DigitalPostal.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace DigitalPostal.Api.Infrastructure.Identity;

public class PasswordHasherService : IPasswordHasherService
{
    private readonly PasswordHasher<User> _hasher = new();

    public string HashPassword(User user, string password)
    {
        return _hasher.HashPassword(user, password);
    }

    public bool VerifyPassword(User user, string hashedPassword, string providedPassword)
    {
        var result = _hasher.VerifyHashedPassword(user, hashedPassword, providedPassword);

        return result == PasswordVerificationResult.Success || result == PasswordVerificationResult.SuccessRehashNeeded;
    }
}
