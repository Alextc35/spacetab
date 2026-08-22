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

/** Named appearance presets edited alongside the default bookmark appearance. */
let draftBookmarkPresets = null;

/**
 * Per-device persistence mode selected in the settings modal.
 * @type {'local'|'sync'|null}
 */
let draftStorageMode = null;

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
 * @param {'local'|'sync'} storageMode
 */
export function initDraft(settings, storageMode) {
  initialSnapshot = structuredClone(settings);
  initialSnapshot.storageMode = storageMode;

  draftTheme = structuredClone(settings.theme);
  draftLanguage = settings.language;
  draftBookmarkDefault = structuredClone(settings.bookmarkDefault);
  draftBookmarkPresets = structuredClone(settings.bookmarkPresets ?? []);
  draftStorageMode = storageMode;
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
  draftBookmarkPresets = null;
  draftStorageMode = null;
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

export function getDraftBookmarkPresets() {
  const { data: { settings } } = getState();
  return draftBookmarkPresets ?? settings.bookmarkPresets ?? [];
}

/**
 * Returns the selected per-device persistence mode.
 *
 * @returns {'local'|'sync'|null}
 */
export function getDraftStorageMode() {
  return draftStorageMode;
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
 * Updates the selected per-device persistence mode.
 *
 * @param {'local'|'sync'} storageMode
 */
export function setDraftStorageMode(storageMode) {
  draftStorageMode = storageMode;
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

export function replaceDraftBookmarkPresets(presets) {
  draftBookmarkPresets = structuredClone(presets);
}

/** Replaces every editable settings draft while preserving the mode choice. */
export function replaceDraftSettings(settings) {
  draftTheme = structuredClone(settings.theme);
  draftLanguage = settings.language;
  draftBookmarkDefault = structuredClone(settings.bookmarkDefault);
  draftBookmarkPresets = structuredClone(settings.bookmarkPresets ?? []);
}

/* ==================================================
   CHANGE DETECTION
================================================== */

/**
 * Returns whether the current draft differs from the initial snapshot.
 *
 * Compared sections:
 * - storage mode
 * - language
 * - theme
 * - bookmark default
 * - named bookmark presets
 *
 * @returns {boolean}
 */
export function hasChanges() {
  if (!initialSnapshot) return false;

  const draftComparable = {
    storageMode: draftStorageMode,
    language: draftLanguage,
    theme: draftTheme,
    bookmarkDefault: draftBookmarkDefault,
    bookmarkPresets: draftBookmarkPresets
  };
  const initialComparable = {
    storageMode: initialSnapshot.storageMode,
    language: initialSnapshot.language,
    theme: initialSnapshot.theme,
    bookmarkDefault: initialSnapshot.bookmarkDefault,
    bookmarkPresets: initialSnapshot.bookmarkPresets ?? []
  };

  return JSON.stringify(draftComparable) !== JSON.stringify(initialComparable);
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
    bookmarkDefault: structuredClone(draftBookmarkDefault),
    bookmarkPresets: structuredClone(draftBookmarkPresets),
    bookmarkGroups: structuredClone(initialSnapshot?.bookmarkGroups ?? []),
    activeBookmarkGroupId: initialSnapshot?.activeBookmarkGroupId ?? null
  };
}
