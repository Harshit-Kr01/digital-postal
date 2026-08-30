using DigitalPostal.Api.Domain.ValueObjects;

namespace DigitalPostal.Api.Domain.Entities;

public class LetterStamp
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LetterId { get; set; }
    public Letter? Letter { get; set; }
    public Guid StampId { get; set; }
    public Stamp? Stamp { get; set; }
    public StampSnapshot StampSnapshot { get; set; } = null!;
    public Guid? LetterEventId { get; set; }
    public LetterEvent? LetterEvent { get; set; }
    public DateTimeOffset AppliedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
