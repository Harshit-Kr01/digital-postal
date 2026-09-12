using DigitalPostal.Api.Domain.ValueObjects;

namespace DigitalPostal.Api.Features.Letters;

public sealed record DeliveryEstimate(double DistanceKm, DateTimeOffset EstimatedDeliveryAtUtc);

public sealed class DeliveryTimeCalculatorOptions
{
    public double BaseHandlingHours { get; init; } = 4;
    public double TransitSpeedKmPerHour { get; init; } = 120;
    public double InternationalSurchargeHours { get; init; } = 24;
}

public interface IDeliveryTimeCalculator
{
    DeliveryEstimate Calculate(
        LocationSnapshot origin,
        LocationSnapshot destination,
        DateTimeOffset sentAtUtc);
}

public sealed class DeliveryTimeCalculator(DeliveryTimeCalculatorOptions options)
    : IDeliveryTimeCalculator
{
    public DeliveryEstimate Calculate(
        LocationSnapshot origin,
        LocationSnapshot destination,
        DateTimeOffset sentAtUtc)
    {
        ArgumentNullException.ThrowIfNull(origin);
        ArgumentNullException.ThrowIfNull(destination);

        var distanceKm = CalculateDistanceKm(origin, destination);
        var transitHours = distanceKm / options.TransitSpeedKmPerHour;
        var internationalSurcharge = string.Equals(
            origin.CountryCode,
            destination.CountryCode,
            StringComparison.OrdinalIgnoreCase)
            ? 0
            : options.InternationalSurchargeHours;

        var totalHours = options.BaseHandlingHours + transitHours + internationalSurcharge;
        return new DeliveryEstimate(distanceKm, sentAtUtc.AddHours(totalHours));
    }

    private static double CalculateDistanceKm(LocationSnapshot origin, LocationSnapshot destination)
    {
        const double earthRadiusKm = 6371;
        var originLatitude = DegreesToRadians(origin.Latitude);
        var destinationLatitude = DegreesToRadians(destination.Latitude);
        var latitudeDelta = DegreesToRadians(destination.Latitude - origin.Latitude);
        var longitudeDelta = DegreesToRadians(destination.Longitude - origin.Longitude);

        var haversine = Math.Pow(Math.Sin(latitudeDelta / 2), 2)
            + Math.Cos(originLatitude)
            * Math.Cos(destinationLatitude)
            * Math.Pow(Math.Sin(longitudeDelta / 2), 2);

        var centralAngle = 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine));
        return earthRadiusKm * centralAngle;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180;
}