import { createBookmarkForm } from '../../bookmark/form.js';
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
 * @param {Object} params
 * @param {Function} params.onRequestSaveStateUpdate - Callback used to refresh save-state indicators.
 * @returns {{ syncUI: Function, cancelChanges: Function, activateDefaultTab: Function }}
 */
export function initBookmarkSection({ onRequestSaveStateUpdate }) {
  const bookmarkResetBtn = document.getElementById('settings-bookmark-reset');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importInput = document.getElementById('import-input');
  const deleteAllBtn = document.getElementById('delete-all-btn');
  const host = document.getElementById('settings-bookmark-form-host');

  /** @type {ReturnType<typeof createBookmarkForm>|null} */
  let form = null;

  /** @type {Object|null} */
  let initialBookmarkDraft = null;

  initImportExportButtons(exportBtn, importInput);

  form = createBookmarkForm({
    host,
    idPrefix: 'settings-bookmark-form',
    showGeneral: false,
    bookmark: structuredClone(getDraftBookmarkDefault()),
    onChange: (state) => {
      replaceDraftBookmarkDefault(state);
      onRequestSaveStateUpdate();
    }
  });

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

    form.reset(getDraftBookmarkDefault());
    onRequestSaveStateUpdate();
  });

  function syncUI() {
    const draft = structuredClone(getDraftBookmarkDefault());
    initialBookmarkDraft = draft;
    form.reset(draft);
    onRequestSaveStateUpdate();
  }

  async function cancelChanges() {
    replaceDraftBookmarkDefault(structuredClone(initialBookmarkDraft));
    form.reset(getDraftBookmarkDefault());
    onRequestSaveStateUpdate();
  }

  deleteAllBtn.addEventListener('click', deleteAllBookmarks);
  importBtn.addEventListener('click', () => importInput.click());

  return {
    syncUI,
    cancelChanges,
    activateDefaultTab: () => form.activateDefaultTab()
  };
}