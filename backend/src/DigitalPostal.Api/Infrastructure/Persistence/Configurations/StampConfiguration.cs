using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DigitalPostal.Api.Infrastructure.Persistence.Configurations;

public class StampConfiguration : IEntityTypeConfiguration<Stamp>
{
    public void Configure(EntityTypeBuilder<Stamp> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Code).HasMaxLength(50).IsRequired();
        builder.Property(s => s.Name).HasMaxLength(100).IsRequired();
        builder.Property(s => s.ImageUrl).HasMaxLength(500).IsRequired();
        builder.Property(s => s.Description).HasMaxLength(500);

        builder.HasOne(s => s.Location)
            .WithMany(l => l.Stamps)
            .HasForeignKey(s => s.LocationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => new { s.LocationId, s.IsActive });
    }
}
