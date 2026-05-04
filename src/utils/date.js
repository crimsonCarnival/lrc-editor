/**
 * Formats a date string into a localized format using the provided timezone.
 * @param {string|Date} date - The date to format.
 * @param {string} timezone - The timezone identifier (e.g., 'Europe/London' or 'auto').
 * @param {object} options - Intl.DateTimeFormat options.
 * @returns {string}
 */
export function formatInTimezone(date, timezone, options = {}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const finalOptions = {
    ...options,
    timeZone: !timezone || timezone === 'auto' ? undefined : timezone,
  };

  try {
    return new Intl.DateTimeFormat('default', finalOptions).format(d);
  } catch (err) {
    console.warn(`Invalid timezone: ${timezone}`, err);
    return d.toLocaleString();
  }
}

/**
 * Gets a relative time string while respecting the timezone for the baseline.
 */
export function getRelativeTime(dateStr, t, timezone) {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = now.getTime() - target.getTime();
  
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('library.justNow') || 'Just now';
  if (mins < 60) return t('library.minutesAgo', { count: mins }) || `${mins}m ago`;
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('library.hoursAgo', { count: hours }) || `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return t('library.daysAgo', { count: days }) || `${days}d ago`;

  return formatInTimezone(dateStr, timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
