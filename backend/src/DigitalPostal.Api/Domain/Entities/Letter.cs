using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;

namespace DigitalPostal.Api.Domain.Entities;

public class Letter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SenderId { get; set; }
    public User? Sender { get; set; }
    public Guid RecipientId { get; set; }
    public User? Recipient { get; set; }

    public LocationSnapshot OriginLocation { get; set; } = null!;
    public LocationSnapshot DestinationLocation { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
    public LetterStatus Status { get; set; } = LetterStatus.IN_TRANSIT;

    public DateTimeOffset SentAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset EstimatedDeliveryAtUtc { get; set; }
    public DateTimeOffset? DeliveredAtUtc { get; set; }
    public double DistanceKm { get; set; }
    public string CalculationVersion { get; set; } = "1.0";
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<LetterEvent> Events { get; set; } = new List<LetterEvent>();
    public ICollection<LetterStamp> Stamps { get; set; } = new List<LetterStamp>();
}
