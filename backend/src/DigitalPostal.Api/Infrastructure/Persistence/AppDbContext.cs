using DigitalPostal.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DigitalPostal.Api.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Stamp> Stamps => Set<Stamp>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Letter> Letters => Set<Letter>();
    public DbSet<LetterEvent> LetterEvents => Set<LetterEvent>();
    public DbSet<LetterStamp> LetterStamps => Set<LetterStamp>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
