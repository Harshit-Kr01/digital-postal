export const BASE_HANDLING_HOURS = 4;
export const TRANSIT_SPEED_KM_PER_HOUR = 120;
export const INTERNATIONAL_SURCHARGE_HOURS = 24;

export interface DeliveryCalculation {
  distanceKm: number;
  transitHours: number;
  internationalSurchargeHours: number;
  totalHours: number;
  estimatedDeliveryDate: Date;
  displayEstimate: string;
  durationLabel: string;
}

export function distanceBetweenLocations(
  from?: { latitude?: number; longitude?: number },
  to?: { latitude?: number; longitude?: number },
) {
  if (
    from?.latitude == null ||
    from.longitude == null ||
    to?.latitude == null ||
    to.longitude == null
  ) {
    return undefined;
  }

  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function calculateDeliveryEstimate(
  origin?: { latitude?: number; longitude?: number; countryCode?: string },
  destination?: { latitude?: number; longitude?: number; countryCode?: string },
  sentAt: Date = new Date(),
): DeliveryCalculation | null {
  const distanceKm = distanceBetweenLocations(origin, destination);
  if (distanceKm == null) return null;

  const transitHours = distanceKm / TRANSIT_SPEED_KM_PER_HOUR;
  const isInternational =
    origin?.countryCode && destination?.countryCode
      ? origin.countryCode.trim().toUpperCase() !== destination.countryCode.trim().toUpperCase()
      : false;

  const internationalSurchargeHours = isInternational ? INTERNATIONAL_SURCHARGE_HOURS : 0;
  const totalHours = BASE_HANDLING_HOURS + transitHours + internationalSurchargeHours;

  const estimatedDeliveryDate = new Date(sentAt.getTime() + totalHours * 3600 * 1000);

  // Format display estimate matching backend: "Around 23 September"
  const day = estimatedDeliveryDate.getDate();
  const month = estimatedDeliveryDate.toLocaleString("en-US", { month: "long" });
  const displayEstimate = `Around ${day} ${month}`;

  // Human-readable duration matching travel pace: e.g. "~6 hours", "~1.5 days", "~4 days"
  let durationLabel: string;
  if (totalHours < 24) {
    const rounded = Math.round(totalHours);
    durationLabel = `~${rounded} ${rounded === 1 ? "hour" : "hours"}`;
  } else {
    const days = totalHours / 24;
    const roundedDays =
      days < 3
        ? (Math.round(days * 2) / 2).toFixed(days % 1 === 0 ? 0 : 1)
        : Math.round(days).toString();
    durationLabel = `~${roundedDays} ${parseFloat(roundedDays) === 1 ? "day" : "days"}`;
  }

  return {
    distanceKm,
    transitHours,
    internationalSurchargeHours,
    totalHours,
    estimatedDeliveryDate,
    displayEstimate,
    durationLabel,
  };
}

