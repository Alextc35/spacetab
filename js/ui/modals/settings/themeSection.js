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

export function initThemeSection({
  onChange,
  onRequestSaveStateUpdate
}) {
  /* ==================================================
     DOM
  ================================================== */

  const bgDefault = document.getElementById('settings-theme-bg-default');
  const labelBgDefault = document.querySelector('label[for="settings-theme-bg-default"]');
  const bgColorInput = document.getElementById('settings-theme-bg-color');
  const bgImageInput = document.getElementById('settings-theme-bg-image');
  const resetBgBtn = document.getElementById('settings-theme-reset-bg');

  const clearBgImageBtn = document.getElementById('settings-theme-clear-bg-image');
  const copyBgImageBtn = document.getElementById('settings-theme-copy-bg-image');
  const toggleBtn = document.getElementById('settings-theme-toggle-bg-image');

  const bgPreview = document.getElementById('settings-theme-bg-preview');

  let bgController;

  /* ==================================================
     Internal helpers
  ================================================== */

  function hasImageValue(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

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

  function updateColorState() {
    const draft = getDraftTheme();
    const hasImage = hasImageValue(draft.backgroundImageUrl);
    const isLocked = bgController?.isLocked?.() ?? false;

    clearBgImageBtn.style.display = hasImage && !isLocked ? 'block' : 'none';
    copyBgImageBtn.style.display = hasImage ? 'block' : 'none';
    toggleBtn.style.display = hasImage ? 'block' : 'none';
  }

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

  bgColorInput.addEventListener('input', () => {
    if (bgColorInput.disabled) return;

    setDraftThemeValue('backgroundColor', bgColorInput.value);

    updatePreview();
    onRequestSaveStateUpdate();
  });

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

  bgDefault.addEventListener('change', () => {
    setDraftThemeValue('backgroundDefault', bgDefault.checked);

    updateStates();
    onRequestSaveStateUpdate();
  });

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

  return {
    syncUI
  };
}