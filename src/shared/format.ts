/** Formats bytes for display in base 1000, to match Finder. Only the UI calls this. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${String(bytes)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = -1
  do {
    value /= 1000
    unit += 1
  } while (value >= 1000 && unit < units.length - 1)
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}
