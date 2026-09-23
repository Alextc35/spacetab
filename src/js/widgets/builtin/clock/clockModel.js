export const CLOCK_WIDGET_TYPE = 'clock';
export const CLOCK_WIDGET_VERSION = 1;

export const DEFAULT_CLOCK_CONFIG = Object.freeze({
  hourCycle: '24',
  showSeconds: false
});

/** Normalizes the configuration owned by the bundled clock widget. */
export function normalizeClockConfig(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};

  return {
    hourCycle: source.hourCycle === '12' ? '12' : '24',
    showSeconds: source.showSeconds === true
  };
}

/** Formats one instant without reading application or browser state. */
export function formatClockTime(date, config = {}, locale = undefined) {
  const normalized = normalizeClockConfig(config);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(normalized.showSeconds ? { second: '2-digit' } : {}),
    hourCycle: normalized.hourCycle === '12' ? 'h12' : 'h23'
  }).format(date);
}

/** Milliseconds until the next visible clock unit changes. */
export function getClockRefreshDelay(date, config = {}) {
  const normalized = normalizeClockConfig(config);
  if (normalized.showSeconds) return Math.max(1, 1000 - date.getMilliseconds());
  return Math.max(1, (60 - date.getSeconds()) * 1000 - date.getMilliseconds());
}
