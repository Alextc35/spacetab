import { createLockableInputController } from '../helper/stateLocked.js';
import { showAlert } from '../alert.js';
import { t } from '../../../core/i18n.js';
import { DEFAULT_SETTINGS } from '../../../core/defaults.js';
import { flashSuccess } from '../../flash.js';
import {
  getDraftTheme,
  setDraftThemeValue,
  replaceDraftTheme
} from './settingsState.js';

/**
 * Initializes the theme section inside the settings modal.
 *
 * This section is responsible for:
 * - syncing draft theme values into the UI
 * - managing background color / image / default background state
 * - handling live preview updates
 * - resetting theme background settings
 *
 * @param {Object} params
 * @param {Function} params.onChange
 * @param {Function} params.onRequestSaveStateUpdate - Callback used to refresh save-state indicators.
 * @returns {{ syncUI: Function }}
 */
export function initThemeSection({
  onChange,
  onRequestSaveStateUpdate
}) {
  /* ==================================================
     DOM
  ================================================== */

  /**
   * Background mode and appearance controls.
   */
  const bgDefault = document.getElementById('settings-theme-bg-default');
  const labelBgDefault = document.querySelector('label[for="settings-theme-bg-default"]');
  const bgColorInput = document.getElementById('settings-theme-bg-color');
  const bgImageInput = document.getElementById('settings-theme-bg-image');
  const resetBgBtn = document.getElementById('settings-theme-reset-bg');

  /**
   * Lockable background-image controls.
   */
  const clearBgImageBtn = document.getElementById('settings-theme-clear-bg-image');
  const copyBgImageBtn = document.getElementById('settings-theme-copy-bg-image');
  const toggleBtn = document.getElementById('settings-theme-toggle-bg-image');

  /**
   * Theme background preview element.
   */
  const bgPreview = document.getElementById('settings-theme-bg-preview');

  /**
   * Controller used to manage the lockable background-image input.
   */
  let bgController;

  /* ==================================================
     Internal helpers
  ================================================== */

  /**
   * Returns whether the provided value contains a non-empty image string.
   *
   * @param {string|null|undefined} value
   * @returns {boolean}
   */
  function hasImageValue(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  /**
   * Updates the theme background preview based on the current draft state.
   *
   * Behavior:
   * - clears previous inline styles
   * - shows a transparent/disabled state when default background is enabled
   * - otherwise applies the selected background color and optional image
   */
  function updatePreview() {
    const draft = getDraftTheme();

    bgPreview.style.backgroundColor = '';
    bgPreview.style.backgroundImage = '';

    if (draft.backgroundDefault) {
      bgPreview.classList.add('is-transparent', 'is-disabled');
      return;
    }

    bgPreview.classList.remove('is-transparent', 'is-disabled');

    bgPreview.style.backgroundColor = draft.backgroundColor;

    if (hasImageValue(draft.backgroundImageUrl)) {
      bgPreview.style.backgroundImage = `url(${draft.backgroundImageUrl})`;
    }
  }

  /**
   * Updates visibility for background-image helper controls
   * depending on whether an image exists and whether the field is locked.
   */
  function updateColorState() {
    const draft = getDraftTheme();
    const hasImage = hasImageValue(draft.backgroundImageUrl);
    const isLocked = bgController?.isLocked?.() ?? false;

    clearBgImageBtn.style.display = hasImage && !isLocked ? 'block' : 'none';
    copyBgImageBtn.style.display = hasImage ? 'block' : 'none';
    toggleBtn.style.display = hasImage ? 'block' : 'none';
  }

  /**
   * Updates enabled/disabled states across theme controls
   * according to the current draft values.
   *
   * Rules:
   * - default background cannot be enabled while a background image exists
   * - when default background is enabled, color/image-related controls are disabled
   * - preview is refreshed after state updates
   */
  function updateStates() {
    const draft = getDraftTheme();
    const hasImage = hasImageValue(draft.backgroundImageUrl);

    bgDefault.disabled = hasImage;
    labelBgDefault.classList.toggle('is-disabled', bgDefault.disabled);

    if (hasImage && bgDefault.checked) {
      bgDefault.checked = false;
      setDraftThemeValue('backgroundDefault', false);
    }

    const backgroundDefault = bgDefault.checked;

    bgColorInput.disabled = backgroundDefault;
    bgImageInput.disabled = backgroundDefault;
    toggleBtn.disabled = backgroundDefault;
    clearBgImageBtn.disabled = backgroundDefault;
    copyBgImageBtn.disabled = backgroundDefault;

    updatePreview();
  }

  /* ==================================================
     Public sync (called from modal open)
  ================================================== */

  /**
   * Synchronizes the current draft theme state into the UI.
   *
   * This also initializes the lockable background-image controller
   * the first time the section is synced.
   */
  function syncUI() {
    const draft = getDraftTheme();

    bgDefault.checked = draft.backgroundDefault || false;
    bgColorInput.value = draft.backgroundColor;
    bgImageInput.value = draft.backgroundImageUrl || '';

    if (!bgController) {
      bgController = createLockableInputController({
        input: bgImageInput,
        toggleBtn,
        clearBtn: clearBgImageBtn,
        copyBtn: copyBgImageBtn,
        initialLocked: draft.backgroundImageUrlLocked || false,
        onChange: () => {
          setDraftThemeValue(
            'backgroundImageUrl',
            bgImageInput.value.trim() || null
          );

          setDraftThemeValue(
            'backgroundImageUrlLocked',
            bgController?.isLocked() ?? false
          );

          updateStates();
          updateColorState();
          updatePreview();
          onRequestSaveStateUpdate();
        }
      });
    } else {
      bgController.setLocked(draft.backgroundImageUrlLocked || false);
    }

    updateStates();
    updateColorState();
    updatePreview();
  }

  /* ==================================================
     Events
  ================================================== */

  /**
   * Updates the draft background color on input
   * and refreshes preview/save-state indicators.
   */
  bgColorInput.addEventListener('input', () => {
    if (bgColorInput.disabled) return;

    setDraftThemeValue('backgroundColor', bgColorInput.value);

    updatePreview();
    onRequestSaveStateUpdate();
  });

  /**
   * Updates the draft background image URL on input
   * and refreshes related UI state, preview, and save-state indicators.
   */
  bgImageInput.addEventListener('input', () => {
    setDraftThemeValue(
      'backgroundImageUrl',
      bgImageInput.value.trim() || null
    );

    updateStates();
    updateColorState();
    updatePreview();
    onRequestSaveStateUpdate();
  });

  /**
   * Toggles whether the theme should use the default background
   * and refreshes dependent UI state.
   */
  bgDefault.addEventListener('change', () => {
    setDraftThemeValue('backgroundDefault', bgDefault.checked);

    updateStates();
    onRequestSaveStateUpdate();
  });

  /**
   * Resets theme background settings to defaults after confirmation.
   *
   * This also unlocks the background image field and refreshes
   * the full section UI and preview.
   */
  resetBgBtn.addEventListener('click', async () => {
    const ok = await showAlert(
      t('alert.settings.theme.reset'),
      { type: 'confirm' }
    );

    if (!ok) return;

    replaceDraftTheme(DEFAULT_SETTINGS.theme);

    const draft = getDraftTheme();

    bgDefault.checked = draft.backgroundDefault;
    bgColorInput.value = draft.backgroundColor;
    bgImageInput.value = draft.backgroundImageUrl || '';

    setDraftThemeValue('backgroundImageUrlLocked', false);

    if (bgController) {
      bgController.setLocked(false);
    }

    updateStates();
    updateColorState();
    updatePreview();
    onRequestSaveStateUpdate();
    flashSuccess('flash.settings.resetBg');
  });

  /* ==================================================
     API
  ================================================== */

  /**
   * Public API for the theme settings section.
   */
  return {
    syncUI
  };
}