import i18n from '../i18n/i18n.js';

/**
 * Approximate local time for a given longitude.
 * Each 15° of longitude corresponds to ~1 hour offset.
 */
export function getLocalTime(lat, lng) {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const offsetHours = lng / 15;
  let localHours = (utcHours + offsetHours + 24) % 24;
  const hours = Math.floor(localHours);
  const minutes = utcMinutes + Math.round((localHours - hours) * 60);
  const adj = new Date(0, 0, 0, hours, minutes);
  const locale = i18n.language || 'en-US';
  return adj.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}
