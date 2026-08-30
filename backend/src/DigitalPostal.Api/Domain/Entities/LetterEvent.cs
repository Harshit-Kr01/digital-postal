using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;

namespace DigitalPostal.Api.Domain.Entities;

public class LetterEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LetterId { get; set; }
    public Letter? Letter { get; set; }
    public LetterEventType EventType { get; set; }
    public LocationSnapshot? LocationSnapshot { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
