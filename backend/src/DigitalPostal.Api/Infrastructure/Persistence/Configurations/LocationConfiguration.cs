using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DigitalPostal.Api.Infrastructure.Persistence.Configurations;

public class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Code).HasMaxLength(50).IsRequired();
        builder.HasIndex(l => l.Code).IsUnique();
        builder.Property(l => l.City).HasMaxLength(100).IsRequired();
        builder.Property(l => l.Region).HasMaxLength(100);
        builder.Property(l => l.Country).HasMaxLength(100).IsRequired();
        builder.Property(l => l.CountryCode).HasMaxLength(10).IsRequired();
        builder.Property(l => l.TimeZone).HasMaxLength(100).IsRequired();
    }
}
