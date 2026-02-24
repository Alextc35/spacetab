/**
 * i18n.js
 * ------------------------------------------------------
 * Internationalization (i18n) module.
 *
 * - Stores all static translations for supported languages
 * - Resolves translation keys using dot-notation (e.g. "flash.bookmark.deleted")
 * - Applies localized text to DOM elements via `data-i18n` attributes
 *
 * This module does NOT:
 * - Manage UI logic (modals, flashes, etc.)
 * - Persist language settings (handled elsewhere)
 *
 * The active language is read from SETTINGS.
 * ------------------------------------------------------
 */

import { translations } from './translations.js';
import { getState } from './store.js';

/**
 * Applies translations to DOM elements using the `data-i18n` attribute.
 *
 * For each element:
 * - Reads the translation key from `data-i18n`
 * - Resolves the localized string via `t(key)`
 * - Sets `textContent` or `placeholder` accordingly
 *
 * @param {Document|HTMLElement} root - Root element to search from (defaults to document)
 */
export function applyI18n(root = document) {
  const elements = root.querySelectorAll('[data-i18n]');

  elements.forEach(el => {
    const key = el.dataset.i18n;
    const text = t(key);

    if (el.placeholder !== undefined && el.tagName === 'INPUT') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });
}

/**
 * Resolves a translation key into the localized string.
 *
 * Uses dot-notation to traverse the translations object.
 * Falls back to returning the key itself if not found.
 *
 * @param {string} key - Translation key (e.g. "buttons.save")
 * @returns {string} Localized text or the key if missing
 */
export function t(key) {
  const { data } = getState();
  const { settings } = data;

  const lang = settings.language || 'en';
  const parts = key.split('.');
  let value = translations[lang];

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return key; // Return key itself as a visible fallback if translation is missing
  }

  return value;
}