using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DigitalPostal.Api.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Username).HasMaxLength(30).IsRequired();
        builder.Property(u => u.NormalizedUsername).HasMaxLength(30).IsRequired();
        builder.HasIndex(u => u.NormalizedUsername).IsUnique();

        builder.Property(u => u.Email).HasMaxLength(255).IsRequired();
        builder.Property(u => u.NormalizedEmail).HasMaxLength(255).IsRequired();
        builder.HasIndex(u => u.NormalizedEmail).IsUnique();

        builder.Property(u => u.DisplayName).HasMaxLength(80).IsRequired();
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.TimeZone).HasMaxLength(100).IsRequired();

        builder.HasOne(u => u.CurrentLocation)
            .WithMany()
            .HasForeignKey(u => u.CurrentLocationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(u => u.Status)
            .HasConversion<string>()
            .HasMaxLength(20);
    }
}
