import { createLockableInputController } from '../helper/stateLocked.js';
import { showAlert } from '../alert.js';
import { t } from '../../../core/i18n.js';
import { DEFAULT_SETTINGS } from '../../../core/defaults.js';
import { flashSuccess } from '../../flash.js';
import {
  getImageInputValue,
  initLocalImageUpload,
  setLocalImageSyncNoticeVisibility,
  setImageInputValue
} from '../../localImageUpload.js';
import { resolveBackgroundImage } from '../../../core/localImages.js';
import { getStorageMode } from '../../../core/store.js';
import {
  getDraftStorageMode,
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
 * @param {Function} params.onRequestSaveStateUpdate - Callback used to refresh save-state indicators.
 * @returns {{ syncUI: Function }}
 */
export function initThemeSection({
  onRequestSaveStateUpdate
}) {
  /* ==================================================
     DOM
  ================================================== */

  /**
   * Background mode and appearance controls.
   */
  const bgDefault = document.getElementById('settings-theme-bg-default');
  const bgSolid = document.getElementById('settings-theme-bg-solid');
  const bgColorField = document.getElementById('settings-theme-bg-color-field');
  const bgColorInput = document.getElementById('settings-theme-bg-color');
  const bgImageInput = document.getElementById('settings-theme-bg-image');
  const bgLocalInput = document.getElementById('settings-theme-bg-local');
  const clearBgLocalBtn = document.getElementById('settings-theme-clear-bg-local');
  const bgImageUploadInput = document.getElementById('settings-theme-bg-upload-input');
  const bgImageUploadButton = document.getElementById('settings-theme-bg-upload');
  const bgImageUploadNotice = bgImageUploadButton?.parentElement?.querySelector('.local-image-notice');
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
  let localImageUploadInitialized = false;

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
   * - shows the default wallpaper when default background is enabled
   * - otherwise applies the selected background color and optional image
   */
  function updatePreview() {
    const draft = getDraftTheme();

    bgPreview.style.backgroundColor = '';
    bgPreview.style.backgroundImage = '';
    bgPreview.classList.toggle('is-default-bg', draft.backgroundDefault);

    if (draft.backgroundDefault) {
      return;
    }

    bgPreview.style.backgroundColor = draft.backgroundColor;

    const backgroundImage = draft.backgroundSolid ? null : resolveBackgroundImage(draft);
    if (backgroundImage) {
      bgPreview.style.backgroundImage = `url(${backgroundImage})`;
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
   * - default and solid backgrounds preserve saved custom images
   * - the color picker is shown only for a solid background
   * - image controls are disabled while default or solid background is enabled
   * - preview is refreshed after state updates
   */
  function updateStates() {
    const backgroundDefault = bgDefault.checked;
    const backgroundSolid = bgSolid.checked && !backgroundDefault;
    const imagesDisabled = backgroundDefault || backgroundSolid;

    bgColorField.classList.toggle('is-hidden', !backgroundSolid);
    bgColorInput.disabled = !backgroundSolid;
    bgImageInput.disabled = imagesDisabled;
    bgLocalInput.disabled = imagesDisabled;
    clearBgLocalBtn.disabled = imagesDisabled;
    bgImageUploadButton.disabled = imagesDisabled;
    toggleBtn.disabled = imagesDisabled;
    clearBgImageBtn.disabled = imagesDisabled;
    copyBgImageBtn.disabled = imagesDisabled;

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

    setLocalImageSyncNoticeVisibility(
      bgImageUploadNotice,
      getDraftStorageMode() ?? getStorageMode()
    );

    bgDefault.checked = draft.backgroundDefault || false;
    bgSolid.checked = draft.backgroundSolid || false;
    bgColorInput.value = draft.backgroundColor;
    setImageInputValue(bgImageInput, draft.backgroundImageUrl);
    setImageInputValue(bgLocalInput, draft.backgroundImageLocal);

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
            getImageInputValue(bgImageInput) || null
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

    if (!localImageUploadInitialized) {
      localImageUploadInitialized = true;
      initLocalImageUpload({
        button: bgImageUploadButton,
        fileInput: bgImageUploadInput,
        targetInput: bgLocalInput,
        clearButton: clearBgLocalBtn,
        onChange: () => {
          setDraftThemeValue('backgroundImageLocal', getImageInputValue(bgLocalInput) || null);
          updateStates();
          onRequestSaveStateUpdate();
        }
      });
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
   * Toggles whether the theme should use the default background
   * and refreshes dependent UI state.
   */
  bgDefault.addEventListener('change', () => {
    setDraftThemeValue('backgroundDefault', bgDefault.checked);
    if (bgDefault.checked) {
      bgSolid.checked = false;
      setDraftThemeValue('backgroundSolid', false);
    }

    updateStates();
    onRequestSaveStateUpdate();
  });

  bgSolid.addEventListener('change', () => {
    setDraftThemeValue('backgroundSolid', bgSolid.checked);
    if (bgSolid.checked) {
      bgDefault.checked = false;
      setDraftThemeValue('backgroundDefault', false);
    }

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
    bgSolid.checked = draft.backgroundSolid;
    bgColorInput.value = draft.backgroundColor;
    setImageInputValue(bgImageInput, draft.backgroundImageUrl);
    setImageInputValue(bgLocalInput, draft.backgroundImageLocal);

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
