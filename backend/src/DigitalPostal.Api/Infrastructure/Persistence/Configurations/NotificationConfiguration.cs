using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DigitalPostal.Api.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Type)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(n => n.Title).HasMaxLength(150).IsRequired();
        builder.Property(n => n.Body).HasMaxLength(500).IsRequired();

        builder.HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(n => n.Letter)
            .WithMany()
            .HasForeignKey(n => n.LetterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => new { n.UserId, n.ReadAtUtc });
        builder.HasIndex(n => new { n.UserId, n.CreatedAtUtc });
        builder.HasIndex(n => new { n.LetterId, n.Type }).IsUnique();
    }
}
