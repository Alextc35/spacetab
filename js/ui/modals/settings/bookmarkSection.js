import { createBookmarkEditor } from '../../bookmark/editor.js';
import { showAlert } from '../alert.js';
import { t } from '../../../core/i18n.js';
import { DEFAULT_SETTINGS } from '../../../core/defaults.js';
import { deleteAllBookmarks } from '../../bookmark/actions.js';
import { initImportExportButtons } from '../../bookmark/importExport.js';
import {
  getDraftBookmarkDefault,
  replaceDraftBookmarkDefault
} from './settingsState.js';

export function initBookmarkSection({ onRequestSaveStateUpdate }) {
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

  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importInput = document.getElementById('import-input');
  const deleteAllBtn = document.getElementById('delete-all-btn');

  let editor;
  let initialBookmarkDraft = structuredClone(getDraftBookmarkDefault());

  initImportExportButtons(exportBtn, importInput);

  function syncEditor(draft = structuredClone(getDraftBookmarkDefault())) {
    if (editor?.destroy) editor.destroy();

    editor = createBookmarkEditor({
      bookmark: draft,
      elements: {
        preview,
        backgroundColor: bookmarkBgColor,
        backgroundImage: bookmarkBgImage,
        backgroundFavicon: bookmarkBgFavicon,
        noBackground: bookmarkNoBg,
        invertBg: bookmarkInvertBg,
        showText: bookmarkShowText,
        textColor: bookmarkTextColor,
        showFavicon: bookmarkShowFavicon,
        invertIcon: bookmarkInvertIcon,
        bgToggleBtn: toggleBtn,
        bgCopyBtn: copyBtn,
        bgClearBtn: clearBtn
      },
      onChange: (state) => {
        replaceDraftBookmarkDefault(state);
        onRequestSaveStateUpdate();
      }
    });
  }

  syncEditor();

  bookmarkResetBtn.addEventListener('click', async () => {
    const ok = await showAlert(
      t('alert.settings.bookmark.reset'),
      { type: 'confirm' }
    );
    if (!ok) return;

    replaceDraftBookmarkDefault({
      ...structuredClone(DEFAULT_SETTINGS.bookmarkDefault),
      name: 'Test',
      url: 'https://.internal'
    });

    syncEditor();
    onRequestSaveStateUpdate();
  });

  async function cancelChanges() {
    replaceDraftBookmarkDefault(structuredClone(initialBookmarkDraft));
    syncEditor();
    onRequestSaveStateUpdate();
  }

  deleteAllBtn.addEventListener('click', deleteAllBookmarks);
  importBtn.addEventListener('click', () => importInput.click());

  return { 
    syncUI: () => editor?.syncUI(),
    cancelChanges
  };
}