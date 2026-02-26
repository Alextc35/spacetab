import { getState } from './store.js';
import { loadTranslations } from '../lang/index.js';
import { VERSION } from './config.js';

let translations = {};
let currentLang = null;

/**
 * Loads translations for the current language.
 * Must be called before applying i18n.
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

export async function changeLanguage(settings = {}) {
  const language = settings.language || 'en';
  translations = await loadTranslations(language);
  currentLang = language;

  applyI18n(document, { VERSION });
}

/**
 * Resolves a translation key using dot-notation.
 *
 * Supports interpolation via {{variable}} syntax.
 *
 * @param {string} key
 * @param {Object} [params]
 * @returns {string}
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
 * Applies translations to DOM elements using data-i18n attribute.
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