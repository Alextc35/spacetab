import { renderBookmarkPreview } from '../../bookmark/preview.js';
import { createLockableInputController } from '../helper/stateLocked.js';
import { showAlert } from '../alertModal.js';
import { t } from '../../../core/i18n.js';
import { DEFAULT_SETTINGS } from '../../../core/defaults.js';
import { deleteAllBookmarks } from '../../bookmark/actions.js';
import { initImportExportButtons } from '../../bookmark/importExport.js';

import {
  getDraftBookmarkDefault,
  setDraftBookmarkValue,
  replaceDraftBookmarkDefault
} from './settingsState.js';

export function initBookmarkSection({
  onRequestSaveStateUpdate
}) {
  /* ==================================================
     DOM
  ================================================== */

  const preview = document.getElementById('settings-bookmark-preview');

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

  const toggleBtn = document.getElementById('settings-bookmark-toggle-bg');
  const copyBtn = document.getElementById('settings-bookmark-copy-bg');
  const clearBtn = document.getElementById('settings-bookmark-clear-bg');

  const labelBookmarkInvertBg = document.querySelector('label[for="settings-bookmark-invert-bg"]');
  const labelBookmarkShowFavicon = document.querySelector('label[for="settings-bookmark-show-favicon"]');
  const labelBookmarkBgFavicon = document.querySelector('label[for="settings-bookmark-background-favicon"]');
  const labelBookmarkInvertIcon = document.querySelector('label[for="settings-bookmark-invert-icon"]');

  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importInput = document.getElementById('import-input');
  const deleteAllBtn = document.getElementById('delete-all-btn');

  let bgController;

  initImportExportButtons(exportBtn, importInput);

  /* ==================================================
     Helpers
  ================================================== */

  function updateSettingsPreview(){
    renderBookmarkPreview(preview, getDraftBookmarkDefault());
  }

  function refreshPreview() {
    updateSettingsPreview();
  }

  function hasImageValue(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function updateStates() {
    const draft = getDraftBookmarkDefault();
    const hasImage = hasImageValue(draft.backgroundImageUrl);

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

  /* ==================================================
     Public sync
  ================================================== */

  function syncUI() {
    const draft = getDraftBookmarkDefault();

    draft.name = 'Test';
    draft.url = 'https://.internal';
    bookmarkBgColor.value = draft.backgroundColor;
    bookmarkBgImage.value = draft.backgroundImageUrl || '';
    bookmarkNoBg.checked = draft.noBackground;
    bookmarkBgFavicon.checked = draft.backgroundFavicon;
    bookmarkInvertBg.checked = draft.invertColorBg;
    bookmarkShowText.checked = draft.showText;
    bookmarkTextColor.value = draft.textColor;
    bookmarkShowFavicon.checked = draft.showFavicon;
    bookmarkInvertIcon.checked = draft.invertColorIcon;

    if (!bgController) {
      bgController = createLockableInputController({
        input: bookmarkBgImage,
        toggleBtn,
        clearBtn,
        copyBtn,
        initialLocked: draft.backgroundImageUrlLocked ?? false,
        onChange: () => {
          setDraftBookmarkValue(
            'backgroundImageUrl',
            bookmarkBgImage.value.trim() || null
          );

          setDraftBookmarkValue(
            'backgroundImageUrlLocked',
            bgController?.isLocked() ?? false
          );

          updateStates();
          onRequestSaveStateUpdate();
        }
      });
    } else {
      bgController.setLocked(draft.backgroundImageUrlLocked ?? false);
      bgController.refresh();
    }

    updateStates();
    updateSettingsPreview(draft);
  }

  /* ==================================================
     Events
  ================================================== */

  bookmarkBgColor.addEventListener('input', () => {
    setDraftBookmarkValue('backgroundColor', bookmarkBgColor.value);
    refreshPreview();
    onRequestSaveStateUpdate();
  });

  bookmarkBgImage.addEventListener('input', () => {
    setDraftBookmarkValue(
      'backgroundImageUrl',
      bookmarkBgImage.value.trim() || null
    );
    refreshPreview();
    updateStates();
    onRequestSaveStateUpdate();
  });

  bookmarkNoBg.addEventListener('change', () => {
    setDraftBookmarkValue('noBackground', bookmarkNoBg.checked);
    refreshPreview();
    updateStates();
    onRequestSaveStateUpdate();
  });

  bookmarkBgFavicon.addEventListener('change', () => {
    setDraftBookmarkValue('backgroundFavicon', bookmarkBgFavicon.checked);
    refreshPreview();
    updateStates();
    onRequestSaveStateUpdate();
  });

  bookmarkInvertBg.addEventListener('change', () => {
    setDraftBookmarkValue('invertColorBg', bookmarkInvertBg.checked);
    refreshPreview();
    onRequestSaveStateUpdate();
  });

  bookmarkShowText.addEventListener('change', () => {
    setDraftBookmarkValue('showText', bookmarkShowText.checked);
    refreshPreview();
    updateStates();
    onRequestSaveStateUpdate();
  });

  bookmarkTextColor.addEventListener('input', () => {
    setDraftBookmarkValue('textColor', bookmarkTextColor.value);
    refreshPreview();
    onRequestSaveStateUpdate();
  });

  bookmarkShowFavicon.addEventListener('change', () => {
    setDraftBookmarkValue('showFavicon', bookmarkShowFavicon.checked);
    refreshPreview();
    updateStates();
    onRequestSaveStateUpdate();
  });

  bookmarkInvertIcon.addEventListener('change', () => {
    setDraftBookmarkValue('invertColorIcon', bookmarkInvertIcon.checked);
    refreshPreview();
    onRequestSaveStateUpdate();
  });

  bookmarkResetBtn.addEventListener('click', async () => {
    const ok = await showAlert(
      t('alert.settings.bookmark.reset'),
      { type: 'confirm' }
    );

    if (!ok) return;

    replaceDraftBookmarkDefault(DEFAULT_SETTINGS.bookmarkDefault);
    syncUI();
    refreshPreview();
    onRequestSaveStateUpdate();
  });

  deleteAllBtn.addEventListener('click', deleteAllBookmarks);
  importBtn.addEventListener('click', () => importInput.click());

  /* ==================================================
     API
  ================================================== */

  return {
    syncUI
  };
}