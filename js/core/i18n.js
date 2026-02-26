import { getState } from './store.js';
import { loadTranslations } from '../lang/index.js';
import { VERSION } from './config.js';

/** @type {TranslationTree} */
let translations = {};

/** @type {string|null} */
let currentLang = null;

/**
 * Initializes the internationalization system.
 *
 * Loads translations for the current language stored in the application state
 * and applies them to the document.
 *
 * @returns {Promise<void>}
 */
export async function initI18n() {
  const { data: { settings } } = getState();
  const lang = settings.language || 'en';

  if (lang !== currentLang) {
    translations = await loadTranslations(lang);
    currentLang = lang;
  }

  applyI18n(document, { VERSION });
}

/**
 * Changes the active language and reapplies translations to the document.
 *
 * @param {Partial<Settings>} [settings={}] - Settings object containing the language to apply.
 * @returns {Promise<void>}
 */
export async function changeLanguage(settings = {}) {
  const language = settings.language || 'en';
  translations = await loadTranslations(language);
  currentLang = language;

  applyI18n(document, { VERSION });
}

/**
 * Resolves a translation key using dot-notation and interpolates parameters.
 *
 * @param {string} key - Translation key (e.g. "alert.bookmarks.no_space").
 * @param {Object<string, string|number>} [params={}] - Parameters for template interpolation.
 * @returns {string} The translated string, or the key if not found.
 */
export function t(key, params = {}) {
  const parts = key.split('.');
  let value = translations;

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return key;
  }

  if (typeof value !== 'string') return key;

  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
}

/**
 * Applies translations to all elements within a root node that have
 * a `data-i18n` attribute.
 *
 * @param {Document|HTMLElement} [root=document] - Root element to search within.
 * @param {Object<string, string|number>} [params={}] - Interpolation parameters.
 * @returns {void}
 */
function applyI18n(root = document, params = {}) {
  const { data: { settings } } = getState();
  const lang = settings.language || 'en';
  document.documentElement.lang = lang;

  const elements = root.querySelectorAll('[data-i18n]');

  elements.forEach(el => {
    const key = el.dataset.i18n;
    const text = t(key, params);

    if (el.placeholder !== undefined && el.tagName === 'INPUT') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });
}