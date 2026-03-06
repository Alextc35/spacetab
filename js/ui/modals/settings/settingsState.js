// settingsState.js
import { getState, setState } from '../../../core/store.js'

let draftTheme = null;
let draftLanguage = null;
let draftBookmarkDefault = null;
let initialSnapshot = null;

/* ==================================================
   INIT
================================================== */

export function initDraft(settings) {
  initialSnapshot = structuredClone(settings);

  draftTheme = structuredClone(settings.theme);
  draftLanguage = settings.language;
  draftBookmarkDefault = structuredClone(settings.bookmarkDefault);
}

export function resetState() {
  draftTheme = null;
  draftLanguage = null;
  draftBookmarkDefault = null;
  initialSnapshot = null;
}

/* ==================================================
   GETTERS
================================================== */

export function getDraftTheme() {
  return draftTheme;
}

export function getDraftLanguage() {
  return draftLanguage;
}

export function getDraftBookmarkDefault() {

  const state = getState();

  return state.data.settings?.bookmarkDefault ?? {};
}

export function getInitialSnapshot() {
  return initialSnapshot;
}

/* ==================================================
   SETTERS (granulares)
================================================== */

export function setDraftLanguage(language) {
  draftLanguage = language;
}

export function setDraftThemeValue(key, value) {
  if (!draftTheme) return;
  draftTheme[key] = value;
}

export function setDraftBookmarkValue(key, value) {
  if (!draftBookmarkDefault) return;
  draftBookmarkDefault[key] = value;
}

/* ==================================================
   REEMPLAZOS COMPLETOS (para resets)
================================================== */

export function replaceDraftTheme(newTheme) {
  draftTheme = structuredClone(newTheme);
}

export function replaceDraftBookmarkDefault(newBookmarkDefault) {
  draftBookmarkDefault = structuredClone(newBookmarkDefault);
}

/* ==================================================
   CHANGE DETECTION
================================================== */

export function hasChanges() {
  if (!initialSnapshot) return false;

  // language
  if (draftLanguage !== initialSnapshot.language) {
    return true;
  }

  // theme
  const themeKeys = Object.keys(draftTheme || {});
  for (const key of themeKeys) {
    if (draftTheme[key] !== initialSnapshot.theme[key]) {
      return true;
    }
  }

  // bookmark default
  const bookmarkKeys = Object.keys(draftBookmarkDefault || {});
  for (const key of bookmarkKeys) {
    if (draftBookmarkDefault[key] !== initialSnapshot.bookmarkDefault[key]) {
      return true;
    }
  }

  return false;
}

/* ==================================================
   BUILDER FINAL (SAVE)
================================================== */

export function buildNewSettings() {
  return {
    language: draftLanguage,
    theme: structuredClone(draftTheme),
    bookmarkDefault: structuredClone(draftBookmarkDefault)
  };
}