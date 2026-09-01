import '../types/types.js';
import { DEFAULT_FOLDER_STYLE } from './defaults.js';
import { isLocalImageReference } from './localImages.js';

export const FOLDER_STYLE_KEYS = Object.freeze([
  'noBackground',
  'backgroundColor',
  'backgroundImageUrl',
  'backgroundImageUrlLocked',
  'textColor'
]);

const IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'data:']);

/** Returns a complete, persistence-safe folder appearance object. */
export function normalizeFolderStyle(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const backgroundImageUrl = typeof source.backgroundImageUrl === 'string'
    && source.backgroundImageUrl.trim()
    ? source.backgroundImageUrl.trim()
    : null;
  return {
    noBackground: source.noBackground === true,
    backgroundColor: isHexColor(source.backgroundColor)
      ? source.backgroundColor.toLowerCase()
      : DEFAULT_FOLDER_STYLE.backgroundColor,
    backgroundImageUrl,
    backgroundImageUrlLocked: Boolean(backgroundImageUrl)
      && source.backgroundImageUrlLocked === true,
    textColor: isHexColor(source.textColor)
      ? source.textColor.toLowerCase()
      : DEFAULT_FOLDER_STYLE.textColor
  };
}

/** Validates editable folder identity and appearance fields. */
export function validateFolderDraft(value = {}) {
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const style = normalizeFolderStyle(value);
  const errors = {};

  if (!name) errors.name = 'required';

  if (style.backgroundImageUrl) {
    try {
      const parsed = new URL(style.backgroundImageUrl);
      if (!IMAGE_PROTOCOLS.has(parsed.protocol) && !isLocalImageReference(style.backgroundImageUrl)) {
        errors.backgroundImageUrl = 'unsupportedProtocol';
      }
    } catch {
      errors.backgroundImageUrl = 'invalid';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value: { ...style, name }
  };
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}
