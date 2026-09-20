using DigitalPostal.Api.Domain.Entities;
using DigitalPostal.Api.Domain.Enums;
using DigitalPostal.Api.Domain.ValueObjects;
using DigitalPostal.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace DigitalPostal.Api.Workers;

public class DeliveryProcessor(
    AppDbContext db,
    TimeProvider timeProvider,
    ILogger<DeliveryProcessor> logger) : IDeliveryProcessor
{
    private enum DeliveryOutcome
    {
        Delivered,
        SkippedAlreadyDelivered
    }

    public async Task<DeliveryBatchResult> ProcessDueLettersAsync(int batchSize, CancellationToken ct = default)
    {
        var now = timeProvider.GetUtcNow();
        var result = new DeliveryBatchResult();

        // 1. Fetch batch of due letter IDs
        List<Guid> dueLetterIds;
        if (db.Database.IsNpgsql())
        {
            // PostgreSQL row-level claim query
            dueLetterIds = await db.Database
                .SqlQueryRaw<Guid>(
                    @"SELECT ""Id"" FROM ""Letters""
                      WHERE ""Status"" = 'IN_TRANSIT' AND ""EstimatedDeliveryAtUtc"" <= {0}
                      ORDER BY ""EstimatedDeliveryAtUtc"" ASC
                      LIMIT {1}",
                    now, batchSize)
                .ToListAsync(ct);
        }
        else
        {
            dueLetterIds = await db.Letters
                .Where(l => l.Status == LetterStatus.IN_TRANSIT && l.EstimatedDeliveryAtUtc <= now)
                .OrderBy(l => l.EstimatedDeliveryAtUtc)
                .Take(batchSize)
                .Select(l => l.Id)
                .ToListAsync(ct);
        }

        result.Claimed = dueLetterIds.Count;
        if (dueLetterIds.Count == 0)
        {
            return result;
        }

        // 2. Process each letter in an isolated unit of work (Poison-Pill Resilience)
        foreach (var letterId in dueLetterIds)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var outcome = await DeliverSingleLetterAsync(letterId, now, ct);
                if (outcome == DeliveryOutcome.Delivered)
                {
                    result.Delivered++;
                }
                else
                {
                    result.Skipped++;
                }
            }
            catch (Exception ex)
            {
                result.Failed++;
                // Clear dirty tracked entities so a single failed letter does not corrupt the remaining batch
                db.ChangeTracker.Clear();
                logger.LogError(ex, "Failed delivering letter {LetterId}. Continuing remaining batch.", letterId);
            }
        }

        logger.LogInformation(
            "Delivery batch completed: Claimed={Claimed}, Delivered={Delivered}, Skipped={Skipped}, Failed={Failed}",
            result.Claimed, result.Delivered, result.Skipped, result.Failed);

        return result;
    }

    private async Task<DeliveryOutcome> DeliverSingleLetterAsync(Guid letterId, DateTimeOffset now, CancellationToken ct)
    {
        IDbContextTransaction? tx = null;
        if (db.Database.IsRelational())
        {
            tx = await db.Database.BeginTransactionAsync(ct);
        }

        try
        {
            var letter = await db.Letters
                .FirstOrDefaultAsync(l => l.Id == letterId, ct);

            // Authoritative claim: check that the letter is still IN_TRANSIT
            if (letter == null || letter.Status != LetterStatus.IN_TRANSIT)
            {
                if (tx != null) await tx.RollbackAsync(ct);
                return DeliveryOutcome.SkippedAlreadyDelivered;
            }

            // 1. Authoritative status update
            letter.Status = LetterStatus.DELIVERED;
            letter.DeliveredAtUtc = now;

            // 2. DELIVERED event
            var hasDeliveredEvent = await db.LetterEvents
                .AnyAsync(e => e.LetterId == letter.Id && e.EventType == LetterEventType.DELIVERED, ct);

            LetterEvent deliveredEvent;
            if (!hasDeliveredEvent)
            {
                deliveredEvent = new LetterEvent
                {
                    Id = Guid.NewGuid(),
                    LetterId = letter.Id,
                    EventType = LetterEventType.DELIVERED,
                    LocationSnapshot = letter.DestinationLocation with { },
                    OccurredAtUtc = now
                };
                db.LetterEvents.Add(deliveredEvent);
            }
            else
            {
                deliveredEvent = await db.LetterEvents
                    .FirstAsync(e => e.LetterId == letter.Id && e.EventType == LetterEventType.DELIVERED, ct);
            }

            // 3. Snapshot destination stamp
            var hasDestinationStamp = await db.LetterStamps
                .AnyAsync(s => s.LetterId == letter.Id && s.LetterEventId == deliveredEvent.Id, ct);

            if (!hasDestinationStamp)
            {
                var destinationStamp = await db.Stamps
                    .Include(s => s.Location)
                    .Where(s => s.IsActive && s.Location != null &&
                        (s.Location.City == letter.DestinationLocation.City || s.Location.CountryCode == letter.DestinationLocation.CountryCode))
                    .OrderByDescending(s => s.Location!.City == letter.DestinationLocation.City)
                    .ThenBy(s => s.CreatedAtUtc)
                    .FirstOrDefaultAsync(ct);

                if (destinationStamp != null)
                {
                    var letterStamp = new LetterStamp
                    {
                        Id = Guid.NewGuid(),
                        LetterId = letter.Id,
                        StampId = destinationStamp.Id,
                        StampSnapshot = new StampSnapshot(
                            destinationStamp.Name,
                            destinationStamp.ImageUrl,
                            destinationStamp.Version
                        ),
                        LetterEventId = deliveredEvent.Id,
                        AppliedAtUtc = now
                    };
                    db.LetterStamps.Add(letterStamp);
                }
            }

            // 4. Create recipient delivery notification
            var hasDeliveredNotification = await db.Notifications
                .AnyAsync(n => n.LetterId == letter.Id && n.Type == NotificationType.LETTER_DELIVERED, ct);

            if (!hasDeliveredNotification)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = letter.RecipientId,
                    LetterId = letter.Id,
                    Type = NotificationType.LETTER_DELIVERED,
                    Title = "Letter Delivered",
                    Body = $"A letter from {letter.OriginLocation.City} has arrived at your desk.",
                    CreatedAtUtc = now
                };
                db.Notifications.Add(notification);
            }

            await db.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);

            return DeliveryOutcome.Delivered;
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
        }
    }
}
