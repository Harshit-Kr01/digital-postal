namespace DigitalPostal.Api.Common.Pagination;

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    string? NextCursor,
    bool HasMore
);
