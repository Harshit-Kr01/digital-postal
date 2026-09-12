using DigitalPostal.Api.Domain.ValueObjects;
using DigitalPostal.Api.Features.Letters;
using FluentAssertions;

namespace DigitalPostal.Api.UnitTests;

public class DeliveryTimeCalculatorTests
{
    private static readonly LocationSnapshot Mumbai = new(
        "Mumbai", "Maharashtra", "India", "IN", 19.0760, 72.8777, "Asia/Kolkata");

    [Fact]
    public void Calculate_adds_handling_and_transit_time_for_same_country()
    {
        var sentAt = new DateTimeOffset(2026, 9, 12, 8, 0, 0, TimeSpan.Zero);
        var destination = Mumbai with { City = "Delhi", Latitude = 28.6139, Longitude = 77.2090 };
        var calculator = new DeliveryTimeCalculator(new DeliveryTimeCalculatorOptions
        {
            BaseHandlingHours = 4,
            TransitSpeedKmPerHour = 100,
            InternationalSurchargeHours = 24
        });

        var estimate = calculator.Calculate(Mumbai, destination, sentAt);

        estimate.DistanceKm.Should().BeApproximately(1153, 5);
        estimate.EstimatedDeliveryAtUtc.Should().Be(sentAt.AddHours(4 + estimate.DistanceKm / 100));
    }

    [Fact]
    public void Calculate_adds_international_surcharge()
    {
        var sentAt = new DateTimeOffset(2026, 9, 12, 8, 0, 0, TimeSpan.Zero);
        var destination = new LocationSnapshot(
            "London", null, "United Kingdom", "GB", 51.5074, -0.1278, "Europe/London");
        var calculator = new DeliveryTimeCalculator(new DeliveryTimeCalculatorOptions
        {
            BaseHandlingHours = 4,
            TransitSpeedKmPerHour = 120,
            InternationalSurchargeHours = 24
        });

        var estimate = calculator.Calculate(Mumbai, destination, sentAt);

        estimate.EstimatedDeliveryAtUtc.Should().Be(
            sentAt.AddHours(4 + estimate.DistanceKm / 120 + 24));
    }
}