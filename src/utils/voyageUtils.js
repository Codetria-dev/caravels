/**
 * Add a location entry to voyage history.
 * - Skips consecutive duplicate names
 * - Caps at maxEntries (default 20)
 * @param {Array} prev - Previous voyage history array
 * @param {Object} entry - { name, lat, lng, type, timestamp }
 * @param {number} maxEntries - Maximum history length
 * @returns {Array} Updated voyage history
 */
export function addToVoyageHistory(prev, entry, maxEntries = 20) {
  if (prev.length > 0 && prev[prev.length - 1].name === entry.name) {
    return prev;
  }
  const next = [...prev, entry];
  return next.length > maxEntries ? next.slice(next.length - maxEntries) : next;
}
