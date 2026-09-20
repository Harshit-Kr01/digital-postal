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
