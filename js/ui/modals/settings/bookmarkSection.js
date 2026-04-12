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

/**
 * Initializes the bookmark settings section.
 *
 * This section is responsible for:
 * - rendering the bookmark default preview editor
 * - syncing draft bookmark default settings
 * - handling reset/cancel flows
 * - wiring import/export and delete-all bookmark actions
 *
 * @param {Object} params
 * @param {Function} params.onRequestSaveStateUpdate - Callback used to refresh save-state indicators.
 * @returns {{ syncUI: Function, cancelChanges: Function }}
 */
export function initBookmarkSection({ onRequestSaveStateUpdate }) {
  /**
   * Preview container used by the bookmark editor.
   */
  const preview = document.getElementById('settings-bookmark-preview');

  /**
   * Bookmark appearance controls.
   */
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

  /**
   * Lockable background-image controls.
   */
  const toggleBtn = document.getElementById('settings-bookmark-toggle-bg');
  const copyBtn = document.getElementById('settings-bookmark-copy-bg');
  const clearBtn = document.getElementById('settings-bookmark-clear-bg');

  /**
   * Bookmark import/export and destructive actions.
   */
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importInput = document.getElementById('import-input');
  const deleteAllBtn = document.getElementById('delete-all-btn');

  /**
   * Active bookmark editor instance for this settings section.
   */
  let editor;

  /**
   * Snapshot of the initial bookmark draft used to restore changes on cancel.
   */
  let initialBookmarkDraft = structuredClone(getDraftBookmarkDefault());

  /**
   * Initializes bookmark import/export controls.
   *
   * Note:
   * - export is handled directly by the helper
   * - import is triggered through the hidden file input
   */
  initImportExportButtons(exportBtn, importInput);

  /**
   * Recreates and synchronizes the bookmark editor using the provided draft.
   *
   * The previous editor instance is destroyed before creating a new one
   * to avoid stale state references.
   *
   * @param {Object} draft
   */
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

  /**
   * Perform the initial editor sync using the current draft bookmark default.
   */
  syncEditor();

  /**
   * Resets the bookmark default settings after user confirmation.
   *
   * A minimal test bookmark shape is restored so the preview/editor
   * continues to have representative values.
   */
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

  /**
   * Restores the bookmark draft to its initial value
   * and refreshes the editor/UI state.
   */
  async function cancelChanges() {
    replaceDraftBookmarkDefault(structuredClone(initialBookmarkDraft));
    syncEditor();
    onRequestSaveStateUpdate();
  }

  /**
   * Wires bookmark actions:
   * - delete all bookmarks
   * - trigger import file picker
   */
  deleteAllBtn.addEventListener('click', deleteAllBookmarks);
  importBtn.addEventListener('click', () => importInput.click());

  /**
   * Public API for the bookmark settings section.
   */
  return { 
    syncUI: () => editor?.syncUI(),
    cancelChanges
  };
}