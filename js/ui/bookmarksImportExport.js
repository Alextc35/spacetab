import { clearBookmarks} from '../core/bookmark.js';
import { DEBUG } from '../core/config.js';
import { t } from '../core/i18n.js';
import { getState, setState } from '../core/store.js';
import { showAlert } from './modals/alertModal.js';
import { flashSuccess, flashError } from './flash.js';

/**
 * Deletes all bookmarks after user confirmation.
 *
 * Displays a confirmation modal before clearing bookmarks.
 * 
 * Shows a success or error flash message depending on the result.
 *
 * @returns {Promise<void>}
 */
export async function deleteAllBookmarks() {
  const ok = await showAlert(
    t('alert.bookmarks.confirmDeleteAll'),
    { type: 'confirm' }
  );

  if (!ok) return;

  try {
    clearBookmarks();
    flashSuccess('flash.bookmarks.deletedAll');
  } catch (err) {
    console.error(err);
    flashError('flash.bookmarks.deleteAllError');
  }
}

/**
 * Exports all current bookmarks as a JSON file.
 *
 * Generates a downloadable file named "bookmarks.json"
 * containing the serialized bookmarks array.
 *
 * @returns {void}
 * @throws {Error} Logs error to console if export fails.
 */
export function exportBookmarks() {
  try {
    const { data: { bookmarks } } = getState();
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (DEBUG) console.log('Bookmarks exported:', bookmarks);

    flashSuccess('flash.bookmarks.exported');
  } catch (err) {
    console.error(err);
    flashError('flash.bookmarks.exportError');
  }
}

/**
 * Imports bookmarks from a JSON file.
 *
 * The file must contain a JSON array of Bookmark objects.
 * If parsing fails or the format is invalid, an error flash is shown.
 *
 * @param {File} file - JSON file containing bookmarks data.
 * @returns {void}
 */
export function importBookmarks(file) {
  if (!file) return flashError('flash.bookmarks.importError');

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (!Array.isArray(data)) {
        throw new Error('Invalid bookmarks file');
      }

      setState({ data: { bookmarks: data } });

      if (DEBUG) {
        console.log('Bookmarks imported:', data);
      }

      flashSuccess('flash.bookmarks.imported');

    } catch (err) {
      console.error(err);
      flashError('flash.bookmarks.importError');
    }
  };

  reader.readAsText(file);
}

/**
 * Initializes import and export button event listeners.
 *
 * @param {HTMLButtonElement} exportBtn - Button that triggers export.
 * @param {HTMLInputElement} importInput - File input used for importing bookmarks.
 * @returns {void}
 */
export function initImportExportButtons(exportBtn, importInput) {
  exportBtn.addEventListener('click', exportBookmarks);
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importBookmarks(file);
    importInput.value = '';
  });
}