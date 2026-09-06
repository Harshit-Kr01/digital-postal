using DigitalPostal.Api.Domain.Entities;

namespace DigitalPostal.Api.Infrastructure.Identity;

public interface IPasswordHasherService
{
    string HashPassword(User user, string password);
    bool VerifyPassword(User user, string hashedPassword, string providedPassword);
}
