// The current NBA season, as its ending year: 2027 is the 2026-27 season.
// Bump this when a new season starts; pages default to it
export const CURRENT_SEASON = 2027

// 2027 -> "2026-27"
export function seasonLabel(season: number): string {
  return `${season - 1}-${String(season).slice(2)}`
}
