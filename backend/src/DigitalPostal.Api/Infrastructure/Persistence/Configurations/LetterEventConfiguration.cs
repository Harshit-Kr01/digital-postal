using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DigitalPostal.Api.Infrastructure.Persistence.Configurations;

public class LetterEventConfiguration : IEntityTypeConfiguration<LetterEvent>
{
    public void Configure(EntityTypeBuilder<LetterEvent> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.EventType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.OwnsOne(e => e.LocationSnapshot, loc =>
        {
            loc.ToJson();
        });

        builder.HasOne(e => e.Letter)
            .WithMany(l => l.Events)
            .HasForeignKey(e => e.LetterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.LetterId, e.OccurredAtUtc });
    }
}
