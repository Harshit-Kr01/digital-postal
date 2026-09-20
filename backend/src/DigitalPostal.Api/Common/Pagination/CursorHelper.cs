using System.Globalization;
using System.Text;

namespace DigitalPostal.Api.Common.Pagination;

public static class CursorHelper
{
    public static string CreateCursor(DateTimeOffset timestamp, Guid id)
    {
        var raw = $"{timestamp.UtcTicks}_{id}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    }

    public static bool TryDecode(string? cursor, out DateTimeOffset timestamp, out Guid id)
    {
        timestamp = default;
        id = default;

        if (string.IsNullOrWhiteSpace(cursor))
            return false;

        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(cursor.Trim()));
            var parts = decoded.Split('_');
            if (parts.Length == 2 &&
                long.TryParse(parts[0], out var ticks) &&
                Guid.TryParse(parts[1], out id))
            {
                timestamp = new DateTimeOffset(ticks, TimeSpan.Zero);
                return true;
            }
        }
        catch
        {
            // Fall through if not valid Base64
        }

        if (DateTimeOffset.TryParse(cursor.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsedDate))
        {
            timestamp = parsedDate;
            id = Guid.Empty;
            return true;
        }

        return false;
    }
}
