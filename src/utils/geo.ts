function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusKm = 6371
  const deltaLat = toRadians(latitudeB - latitudeA)
  const deltaLon = toRadians(longitudeB - longitudeA)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2)
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
