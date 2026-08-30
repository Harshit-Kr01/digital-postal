using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DigitalPostal.Api.Infrastructure.Persistence.Configurations;

public class LetterConfiguration : IEntityTypeConfiguration<Letter>
{
    public void Configure(EntityTypeBuilder<Letter> builder)
    {
        builder.HasKey(l => l.Id);

        builder.HasOne(l => l.Sender)
            .WithMany()
            .HasForeignKey(l => l.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(l => l.Recipient)
            .WithMany()
            .HasForeignKey(l => l.RecipientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.OwnsOne(l => l.OriginLocation, origin =>
        {
            origin.ToJson();
        });

        builder.OwnsOne(l => l.DestinationLocation, dest =>
        {
            dest.ToJson();
        });

        builder.Property(l => l.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(l => l.Content).IsRequired();
        builder.Property(l => l.CalculationVersion).HasMaxLength(20);

        builder.HasIndex(l => l.SenderId);
        builder.HasIndex(l => l.RecipientId);
        builder.HasIndex(l => new { l.Status, l.EstimatedDeliveryAtUtc });
    }
}
