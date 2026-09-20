using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DigitalPostal.Api.Workers;

public class DeliveryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<DeliveryWorker> logger,
    IConfiguration configuration) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollSeconds = configuration.GetValue<int?>("Delivery:PollSeconds") ?? 30;
        var batchSize = configuration.GetValue<int?>("Delivery:BatchSize") ?? 20;

        logger.LogInformation(
            "DeliveryWorker started. Polling every {PollSeconds}s with batch size {BatchSize}",
            pollSeconds, batchSize);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(1, pollSeconds)));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                DeliveryBatchResult batchResult;
                do
                {
                    using var scope = scopeFactory.CreateScope();
                    var processor = scope.ServiceProvider.GetRequiredService<IDeliveryProcessor>();
                    batchResult = await processor.ProcessDueLettersAsync(batchSize, stoppingToken);
                } while (batchResult.Delivered >= batchSize && !stoppingToken.IsCancellationRequested);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled exception during DeliveryWorker poll iteration.");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        logger.LogInformation("DeliveryWorker stopped gracefully.");
    }
}
