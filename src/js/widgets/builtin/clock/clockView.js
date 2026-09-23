import { formatClockTime, getClockRefreshDelay, normalizeClockConfig } from './clockModel.js';

/** Creates the semantic time element shared by grid, list and preview surfaces. */
export function createClockTimeElement(config, { className = 'clock-widget-time' } = {}) {
  const element = document.createElement('time');
  element.className = className;
  updateClockTimeElement(element, config);
  return element;
}

/** Updates a clock element for a supplied instant. */
export function updateClockTimeElement(
  element,
  config,
  date = new Date(),
  locale = document.documentElement.lang || undefined
) {
  const text = formatClockTime(date, config, locale);
  element.dateTime = date.toISOString();
  element.textContent = text;
  element.setAttribute('aria-label', text);
  return text;
}

/**
 * Keeps one connected clock surface current without writing transient time to
 * the application store. A detached render stops itself on its next tick.
 */
export function startClockTicker(element, config) {
  const normalized = normalizeClockConfig(config);
  let timer = null;
  let stopped = false;

  const schedule = () => {
    const now = new Date();
    timer = globalThis.setTimeout(() => {
      if (stopped || !element.isConnected) return;
      updateClockTimeElement(element, normalized);
      schedule();
    }, getClockRefreshDelay(now, normalized));
    timer?.unref?.();
  };

  schedule();
  return () => {
    stopped = true;
    if (timer !== null) globalThis.clearTimeout(timer);
  };
}
