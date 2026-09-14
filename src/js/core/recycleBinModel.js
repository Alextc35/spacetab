import { DEFAULT_RECYCLE_BIN_STYLE } from './defaults.js';

export const RECYCLE_BIN_STYLE_KEYS = Object.freeze([
  'backgroundColor',
  'iconColor',
  'textColor',
  'showIcon',
  'showName',
  'showCount'
]);

/** Returns a complete, persistence-safe recycle bin appearance object. */
export function normalizeRecycleBinStyle(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    backgroundColor: normalizeOptionalColor(source.backgroundColor),
    iconColor: isHexColor(source.iconColor)
      ? source.iconColor.toLowerCase()
      : DEFAULT_RECYCLE_BIN_STYLE.iconColor,
    textColor: normalizeOptionalColor(source.textColor),
    showIcon: source.showIcon !== false,
    showName: source.showName !== false,
    showCount: source.showCount !== false
  };
}

function normalizeOptionalColor(value) {
  return isHexColor(value) ? value.toLowerCase() : null;
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}
