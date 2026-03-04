import { createLockableInputController } from '../helper/stateLocked.js';
import { registerModal, openModal, closeModal } from '../../modalManager.js';
import { showAlert } from '../alertModal.js';
import { changeLanguage, t } from '../../../core/i18n.js';
import { flashSuccess } from '../../flash.js';
import { getState } from '../../../core/store.js';
import { updateSettings } from '../../../core/settings.js';
import { DEFAULT_SETTINGS } from '../../../core/defaults.js';

import {
  initDraft,
  resetState,
  hasChanges,
  buildNewSettings,
  getDraftTheme,
  getDraftLanguage,
  getDraftBookmarkDefault,
  getInitialSnapshot,
  setDraftLanguage,
  setDraftThemeValue,
  setDraftBookmarkValue,
  replaceDraftTheme,
  replaceDraftBookmarkDefault
} from './settingsState.js';

export function initSettingsModal() {
  const settingsBtn = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsSave = document.getElementById('settings-modal-save');
  const settingsCancel = document.getElementById('settings-modal-cancel');
  const languageSelect = document.getElementById('language-select');

  const bgColorInput = document.getElementById('settings-modal-background-color');
  const bgImageInput = document.getElementById('settings-modal-background-image');
  const resetBgBtn = document.getElementById('settings-modal-reset-background');

  const clearBgImageBtn = document.getElementById('settings-modal-clear-background-image');
  const copyBgImageBtn = document.getElementById('settings-modal-copy-background-image');
  const toggleBtn = document.getElementById('settings-modal-toggle-background-image');

  const bgPreview = document.getElementById('settings-modal-background-preview');

  const bookmarkBgColor = document.getElementById('settings-bookmark-background-color');
  const bookmarkBgImage = document.getElementById('settings-bookmark-background-image');
  const bookmarkNoBg = document.getElementById('settings-bookmark-no-background');
  const bookmarkBgFavicon = document.getElementById('settings-bookmark-background-favicon');
  const bookmarkInvertBg = document.getElementById('settings-bookmark-invert-bg');
  const bookmarkShowText = document.getElementById('settings-bookmark-show-text');
  const bookmarkTextColor = document.getElementById('settings-bookmark-text-color');
  const bookmarkShowFavicon = document.getElementById('settings-bookmark-show-favicon');
  const bookmarkInvertIcon = document.getElementById('settings-bookmark-invert-icon');
  const bookmarkResetBtn = document.getElementById('settings-bookmark-reset');

  const labelBookmarkInvertBg = document.querySelector('label[for="settings-bookmark-invert-bg"]');
  const labelBookmarkShowFavicon = document.querySelector('label[for="settings-bookmark-show-favicon"]');
  const labelBookmarkBgFavicon = document.querySelector('label[for="settings-bookmark-background-favicon"]');
  const labelBookmarkInvertIcon = document.querySelector('label[for="settings-bookmark-invert-icon"]');

  const noBgCheckbox = document.getElementById('settings-general-no-background');

  let bgController;

  /* ==================================================
     Helpers
  ================================================== */

  function updateSaveButtonState() {
    const changed = hasChanges();
    settingsSave.disabled = !changed;
    settingsSave.classList.toggle('is-hidden', !changed);
  }

  function updatePreviewDraft() {
    const draftTheme = getDraftTheme();

    bgPreview.style.backgroundColor = '';
    bgPreview.style.backgroundImage = '';

    if (draftTheme.noBackground) {
      bgPreview.classList.add('is-transparent');
      return;
    }

    bgPreview.classList.remove('is-transparent');

    bgPreview.style.backgroundColor = draftTheme.backgroundColor;

    if (draftTheme.backgroundImageUrl) {
      bgPreview.style.backgroundImage = `url(${draftTheme.backgroundImageUrl})`;
    }
  }

  function updateColorState() {
    const draftTheme = getDraftTheme();
    const hasImage =
        typeof draftTheme.backgroundImageUrl === 'string' &&
        draftTheme.backgroundImageUrl.trim() !== '';
    const isLocked = bgController?.isLocked?.() ?? false;

    clearBgImageBtn.style.display = hasImage && !isLocked ? 'block' : 'none';
    copyBgImageBtn.style.display = hasImage ? 'block' : 'none';
    toggleBtn.style.display = hasImage ? 'block' : 'none';
  }

  function updateGeneralBackgroundStates() {
    const draftTheme = getDraftTheme();
    const hasImage =
        typeof draftTheme.backgroundImageUrl === 'string' &&
        draftTheme.backgroundImageUrl.trim() !== '';

    noBgCheckbox.disabled = hasImage;

    if (hasImage && noBgCheckbox.checked) {
      noBgCheckbox.checked = false;
      setDraftThemeValue('noBackground', false);
    }

    const noBg = noBgCheckbox.checked;

    bgColorInput.disabled = noBg;
    bgImageInput.disabled = noBg;
    toggleBtn.disabled = noBg;
    clearBgImageBtn.disabled = noBg;
    copyBgImageBtn.disabled = noBg;

    updatePreviewDraft();
  }

  function updateBookmarkDefaultStates() {
    const draft = getDraftBookmarkDefault();
    const hasImage =
        typeof draft.backgroundImageUrl === 'string' &&
        draft.backgroundImageUrl.trim() !== '';

    bookmarkBgFavicon.disabled = hasImage;
    bookmarkBgColor.disabled = draft.noBackground;
    bookmarkTextColor.disabled = !draft.showText;

    bookmarkBgImage.disabled = draft.backgroundFavicon;
    bookmarkShowFavicon.disabled = draft.backgroundFavicon;

    bookmarkInvertBg.disabled = draft.backgroundFavicon || !hasImage;
    bookmarkInvertIcon.disabled = !draft.backgroundFavicon && !draft.showFavicon;

    labelBookmarkInvertBg.classList.toggle('is-disabled', bookmarkInvertBg.disabled);
    labelBookmarkShowFavicon.classList.toggle('is-disabled', bookmarkShowFavicon.disabled);
    labelBookmarkBgFavicon.classList.toggle('is-disabled', bookmarkBgFavicon.disabled);
    labelBookmarkInvertIcon.classList.toggle('is-disabled', bookmarkInvertIcon.disabled);
  }

  function activateTab(tabId) {
    document.querySelectorAll('#settings-modal .settings-modal-tab-btn')
      .forEach(b => b.classList.remove('active'));

    document.querySelectorAll('#settings-modal .settings-modal-tab-content')
      .forEach(tab => tab.style.display = 'none');

    const btn = document.querySelector(
      `#settings-modal .settings-modal-tab-btn[data-tab="${tabId}"]`
    );

    if (btn) btn.classList.add('active');

    const content = document.getElementById(tabId);
    if (content) {
      content.style.display = 'block';
      requestAnimationFrame(() => content.scrollTop = 0);
    }
  }

  /* ==================================================
     Modal registration
  ================================================== */

  registerModal({
    id: 'settings',
    element: settingsModal,
    acceptOnEnter: false,
    closeOnEsc: false,
    closeOnOverlay: false,
    initialFocus: null
  });

  /* ==================================================
     OPEN
  ================================================== */

  settingsBtn.addEventListener('click', () => {
    const { data: { settings } } = getState();

    initDraft(settings);

    const draftTheme = getDraftTheme();
    const draftBookmark = getDraftBookmarkDefault();

    languageSelect.value = getDraftLanguage();

    // Bookmark UI sync
    bookmarkBgColor.value = draftBookmark.backgroundColor;
    bookmarkBgImage.value = draftBookmark.backgroundImageUrl || '';
    bookmarkNoBg.checked = draftBookmark.noBackground;
    bookmarkBgFavicon.checked = draftBookmark.backgroundFavicon;
    bookmarkInvertBg.checked = draftBookmark.invertColorBg;
    bookmarkShowText.checked = draftBookmark.showText;
    bookmarkTextColor.value = draftBookmark.textColor;
    bookmarkShowFavicon.checked = draftBookmark.showFavicon;
    bookmarkInvertIcon.checked = draftBookmark.invertColorIcon;

    updateBookmarkDefaultStates();

    // General UI sync
    noBgCheckbox.checked = draftTheme.noBackground || false;
    bgColorInput.value = draftTheme.backgroundColor;
    bgImageInput.value = draftTheme.backgroundImageUrl || '';

    if (!bgController) {
      bgController = createLockableInputController({
        input: bgImageInput,
        toggleBtn,
        clearBtn: clearBgImageBtn,
        copyBtn: copyBgImageBtn,
        initialLocked: draftTheme.backgroundImageUrlLocked || false,
        onChange: () => {
          setDraftThemeValue(
            'backgroundImageUrl',
            bgImageInput.value.trim() || null
          );

          setDraftThemeValue(
            'backgroundImageUrlLocked',
            bgController?.isLocked() ?? false
          );

          updateGeneralBackgroundStates();
          updateColorState();
          updatePreviewDraft();
          updateSaveButtonState();
        }
      });
    } else {
      bgController.setLocked(draftTheme.backgroundImageUrlLocked || false);
    }

    updateGeneralBackgroundStates();
    updateColorState();
    updatePreviewDraft();
    updateSaveButtonState();

    activateTab('settings-modal-tab-general');
    openModal('settings');
  });

  /* ==================================================
     CANCEL / SAVE
  ================================================== */

  settingsCancel.addEventListener('click', async () => {
    if (!hasChanges()) {
      closeModal();
      return;
    }

    const ok = await showAlert(
      t('alert.settings.cancel'),
      { type: 'confirm' }
    );

    if (ok) {
      await changeLanguage({
        language: getInitialSnapshot().language
      });

      resetState();
      closeModal();
    }
  });

  settingsSave.addEventListener('click', () => {
    const newSettings = buildNewSettings();

    updateSettings(newSettings);
    flashSuccess('flash.settings.saved');
    resetState();
    closeModal();
  });

  /* ==================================================
     Events
  ================================================== */

  languageSelect.addEventListener('change', async () => {
    setDraftLanguage(languageSelect.value);
    await changeLanguage({ language: languageSelect.value });
    updateSaveButtonState();
  });

  bgColorInput.addEventListener('input', () => {
    if (bgColorInput.disabled) return;

    setDraftThemeValue('backgroundColor', bgColorInput.value);

    updatePreviewDraft();
    updateSaveButtonState();
  });

  bgImageInput.addEventListener('input', () => {
    setDraftThemeValue(
      'backgroundImageUrl',
      bgImageInput.value.trim() || null
    );

    updateGeneralBackgroundStates();
    updateColorState();
    updatePreviewDraft();
    updateSaveButtonState();
  });

  noBgCheckbox.addEventListener('change', () => {
    setDraftThemeValue('noBackground', noBgCheckbox.checked);
    updateGeneralBackgroundStates();
    updateSaveButtonState();
  });

  bookmarkBgColor.addEventListener('input', () => {
    setDraftBookmarkValue('backgroundColor', bookmarkBgColor.value);
    updateSaveButtonState();
  });

  bookmarkBgImage.addEventListener('input', () => {
    setDraftBookmarkValue(
      'backgroundImageUrl',
      bookmarkBgImage.value.trim() || null
    );
    updateBookmarkDefaultStates();
    updateSaveButtonState();
  });

  bookmarkNoBg.addEventListener('change', () => {
    setDraftBookmarkValue('noBackground', bookmarkNoBg.checked);
    updateBookmarkDefaultStates();
    updateSaveButtonState();
  });

  bookmarkBgFavicon.addEventListener('change', () => {
    const checked = bookmarkBgFavicon.checked;
    setDraftBookmarkValue('backgroundFavicon', checked);

    if (checked) {
      bookmarkBgImage.value = '';
      setDraftBookmarkValue('backgroundImageUrl', null);
      setDraftBookmarkValue('showFavicon', false);
      setDraftBookmarkValue('invertColorBg', false);
    }

    updateBookmarkDefaultStates();
    updateSaveButtonState();
  });

  bookmarkInvertBg.addEventListener('change', () => {
    setDraftBookmarkValue('invertColorBg', bookmarkInvertBg.checked);
    updateSaveButtonState();
  });

  bookmarkShowText.addEventListener('change', () => {
    setDraftBookmarkValue('showText', bookmarkShowText.checked);
    updateBookmarkDefaultStates();
    updateSaveButtonState();
  });

  bookmarkTextColor.addEventListener('input', () => {
    setDraftBookmarkValue('textColor', bookmarkTextColor.value);
    updateSaveButtonState();
  });

  bookmarkShowFavicon.addEventListener('change', () => {
    setDraftBookmarkValue('showFavicon', bookmarkShowFavicon.checked);
    updateBookmarkDefaultStates();
    updateSaveButtonState();
  });

  bookmarkInvertIcon.addEventListener('change', () => {
    setDraftBookmarkValue('invertColorIcon', bookmarkInvertIcon.checked);
    updateSaveButtonState();
  });

  bookmarkResetBtn.addEventListener('click', async () => {
    const ok = await showAlert(
      t('alert.settings.bookmark.reset'),
      { type: 'confirm' }
    );

    if (!ok) return;

    replaceDraftBookmarkDefault(DEFAULT_SETTINGS.bookmarkDefault);

    const draft = getDraftBookmarkDefault();

    bookmarkBgColor.value = draft.backgroundColor;
    bookmarkBgImage.value = draft.backgroundImageUrl || '';
    bookmarkNoBg.checked = draft.noBackground;
    bookmarkBgFavicon.checked = draft.backgroundFavicon;
    bookmarkInvertBg.checked = draft.invertColorBg;
    bookmarkShowText.checked = draft.showText;
    bookmarkTextColor.value = draft.textColor;
    bookmarkShowFavicon.checked = draft.showFavicon;
    bookmarkInvertIcon.checked = draft.invertColorIcon;

    updateBookmarkDefaultStates();
    updateSaveButtonState();
  });

  resetBgBtn.addEventListener('click', async () => {
    const ok = await showAlert(
      t('alert.settings.reset'),
      { type: 'confirm' }
    );

    if (!ok) return;

    replaceDraftTheme(DEFAULT_SETTINGS.theme);

    const draftTheme = getDraftTheme();

    noBgCheckbox.checked = draftTheme.noBackground;
    bgColorInput.value = draftTheme.backgroundColor;
    bgImageInput.value = draftTheme.backgroundImageUrl || '';

    setDraftThemeValue('backgroundImageUrlLocked', false);

    if (bgController) {
      bgController.setLocked(false);
    }

    updateGeneralBackgroundStates();
    updateColorState();
    updatePreviewDraft();
    updateSaveButtonState();
  });

    /* ==================================================
    Tabs
    ================================================== */

    document
    .querySelectorAll('#settings-modal .settings-modal-tab-btn')
    .forEach(btn => {
        btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab);
        });
    });
}