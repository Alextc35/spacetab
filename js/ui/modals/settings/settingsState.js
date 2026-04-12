// settingsState.js
import { getState } from '../../../core/store.js'

/**
 * Draft theme state used while the settings modal is open.
 */
let draftTheme = null;

/**
 * Draft language state used while the settings modal is open.
 */
let draftLanguage = null;

/**
 * Draft bookmark default state used while the settings modal is open.
 */
let draftBookmarkDefault = null;

/**
 * Snapshot of the original settings when the modal was opened.
 * Used for change detection and restore flows.
 */
let initialSnapshot = null;

/* ==================================================
   INIT
================================================== */

/**
 * Initializes the draft state from the current persisted settings.
 *
 * This creates an isolated working copy for the settings modal,
 * allowing the user to edit values without immediately saving them.
 *
 * @param {Object} settings
 */
export function initDraft(settings) {
  initialSnapshot = structuredClone(settings);

  draftTheme = structuredClone(settings.theme);
  draftLanguage = settings.language;
  draftBookmarkDefault = structuredClone(settings.bookmarkDefault);
}

/**
 * Clears all draft state and the initial snapshot.
 *
 * This is typically called after saving or fully cancelling the modal.
 */
export function resetState() {
  draftTheme = null;
  draftLanguage = null;
  draftBookmarkDefault = null;
  initialSnapshot = null;
}

/* ==================================================
   GETTERS
================================================== */

/**
 * Returns the current draft theme object.
 *
 * @returns {Object|null}
 */
export function getDraftTheme() {
  return draftTheme;
}

/**
 * Returns the current draft language value.
 *
 * @returns {string|null}
 */
export function getDraftLanguage() {
  return draftLanguage;
}

/**
 * Returns the current draft bookmark default object.
 *
 * Falls back to persisted settings if the draft has not been initialized yet.
 *
 * @returns {Object}
 */
export function getDraftBookmarkDefault() {
  const { data: { settings } } = getState();
  return draftBookmarkDefault ?? settings.bookmarkDefault;
}

/**
 * Returns the original settings snapshot captured when the modal opened.
 *
 * @returns {Object|null}
 */
export function getInitialSnapshot() {
  return initialSnapshot;
}

/* ==================================================
   SETTERS (granular)
================================================== */

/**
 * Updates the draft language value.
 *
 * @param {string} language
 */
export function setDraftLanguage(language) {
  draftLanguage = language;
}

/**
 * Updates a single field inside the draft theme object.
 *
 * Does nothing if the draft theme has not been initialized yet.
 *
 * @param {string} key
 * @param {*} value
 */
export function setDraftThemeValue(key, value) {
  if (!draftTheme) return;
  draftTheme[key] = value;
}

/**
 * Updates a single field inside the draft bookmark default object.
 *
 * Does nothing if the draft bookmark draft has not been initialized yet.
 *
 * @param {string} key
 * @param {*} value
 */
export function setDraftBookmarkValue(key, value) {
  if (!draftBookmarkDefault) return;
  draftBookmarkDefault[key] = value;
}

/* ==================================================
   FULL REPLACEMENTS (for resets)
================================================== */

/**
 * Replaces the entire draft theme object.
 *
 * @param {Object} newTheme
 */
export function replaceDraftTheme(newTheme) {
  draftTheme = structuredClone(newTheme);
}

/**
 * Replaces the entire draft bookmark default object.
 *
 * @param {Object} newBookmarkDefault
 */
export function replaceDraftBookmarkDefault(newBookmarkDefault) {
  draftBookmarkDefault = structuredClone(newBookmarkDefault);
}

/* ==================================================
   CHANGE DETECTION
================================================== */

/**
 * Returns whether the current draft differs from the initial snapshot.
 *
 * Compared sections:
 * - language
 * - theme
 * - bookmark default
 *
 * @returns {boolean}
 */
export function hasChanges() {
  if (!initialSnapshot) return false;

  // Check language changes
  if (draftLanguage !== initialSnapshot.language) {
    return true;
  }

  // Check theme changes
  const themeKeys = Object.keys(draftTheme || {});
  for (const key of themeKeys) {
    if (draftTheme[key] !== initialSnapshot.theme[key]) {
      return true;
    }
  }

  // Check bookmark default changes
  const bookmarkKeys = Object.keys(draftBookmarkDefault || {});
  for (const key of bookmarkKeys) {
    if (draftBookmarkDefault[key] !== initialSnapshot.bookmarkDefault[key]) {
      return true;
    }
  }

  return false;
}

/* ==================================================
   FINAL BUILDER (SAVE)
================================================== */

/**
 * Builds the final settings object to persist.
 *
 * The returned object is fully cloned where needed
 * to avoid leaking draft references.
 *
 * @returns {{ language: string|null, theme: Object|null, bookmarkDefault: Object|null }}
 */
export function buildNewSettings() {
  return {
    language: draftLanguage,
    theme: structuredClone(draftTheme),
    bookmarkDefault: structuredClone(draftBookmarkDefault)
  };
}