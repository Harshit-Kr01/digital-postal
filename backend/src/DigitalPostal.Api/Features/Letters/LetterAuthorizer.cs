using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;

namespace DigitalPostal.Api.Features.Letters;

public class LetterAuthorizer
{
    public bool CanAccess(Letter letter, Guid userId) => letter.SenderId == userId || letter.RecipientId == userId;

    public bool CanViewFullContent(Letter letter, Guid userId)
    {
        return letter.SenderId == userId || (letter.RecipientId == userId && letter.Status == LetterStatus.DELIVERED);
    }

    public bool CanViewJourney(Letter letter, Guid userId)
    {
        return letter.SenderId == userId || (letter.RecipientId == userId && letter.Status == LetterStatus.DELIVERED);
    }
}
