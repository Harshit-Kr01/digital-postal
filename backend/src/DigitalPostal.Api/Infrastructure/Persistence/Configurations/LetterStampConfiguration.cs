using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DigitalPostal.Api.Infrastructure.Persistence.Configurations;

public class LetterStampConfiguration : IEntityTypeConfiguration<LetterStamp>
{
    public void Configure(EntityTypeBuilder<LetterStamp> builder)
    {
        builder.HasKey(s => s.Id);

        builder.OwnsOne(s => s.StampSnapshot, snap =>
        {
            snap.ToJson();
        });

        builder.HasOne(s => s.Letter)
            .WithMany(l => l.Stamps)
            .HasForeignKey(s => s.LetterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Stamp)
            .WithMany()
            .HasForeignKey(s => s.StampId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.LetterEvent)
            .WithMany()
            .HasForeignKey(s => s.LetterEventId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => new { s.LetterId, s.AppliedAtUtc });
    }
}
