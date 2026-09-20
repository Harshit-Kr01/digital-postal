namespace DigitalPostal.Api.Workers;

public sealed record DeliveryBatchResult
{
    public int Claimed { get; set; }
    public int Delivered { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
}

public interface IDeliveryProcessor
{
    Task<DeliveryBatchResult> ProcessDueLettersAsync(int batchSize, CancellationToken ct = default);
}
