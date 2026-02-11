/**
 * bookmarksImportExport.js
 * ------------------------------------------------------
 * Bookmark import, export and bulk deletion utilities.
 *
 * Responsibilities:
 * - Export bookmarks to a JSON file
 * - Import bookmarks from a JSON file
 * - Delete all bookmarks in a single operation
 * - Bridge user actions with the bookmark store
 * - Provide user feedback via flash messages
 *
 * Notes:
 * - Import expects a JSON array of bookmark objects
 * - Imported data is normalized by the bookmark store
 * - All operations trigger a full re-render
 * ------------------------------------------------------
 */

import { getBookmarks, setBookmarks, saveBookmarks, clearBookmarks} from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';
import { flashError, flashSuccess } from './flash.js';
import { DEBUG } from '../core/config.js';
import { showAlert } from './modals/alertModal.js';
import { t } from '../core/i18n.js';

/**
 * Container used by flash notifications.
 *
 * Positioned above all UI layers.
 * Created here to guarantee availability.
 * 
 */
const flashContainer = document.createElement('div');

flashContainer.id = 'flash-container';
flashContainer.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  pointer-events: none;
`;
document.body.appendChild(flashContainer);

/**
 * Deletes all bookmarks after user confirmation.
 *
 * This operation:
 * - Clears in-memory and persistent storage
 * - Triggers a full re-render
 * - Emits a success or error flash
 *
 * @returns {Promise<void>}
 */
export async function deleteAllBookmarks() {
  const ok = await showAlert(t('alert.bookmarks.confirmDeleteAll'), { type: 'confirm' });
  if (!ok) return;
  const bookmarks = getBookmarks();
  try {
    await clearBookmarks();
    renderBookmarks();
    if (DEBUG) {
      console.log('All bookmarks deleted', bookmarks);
    }
    flashSuccess('flash.bookmarks.deletedAll');
  } catch (err) {
    console.error(err);
    flashError('flash.bookmarks.deleteAllError');
  }
}

/**
 * Exports all bookmarks to a downloadable JSON file.
 *
 * Implementation details:
 * - Serializes bookmarks with indentation
 * - Uses Blob and ObjectURL for download
 * - Cleans up DOM and memory after export
 */
export function exportBookmarks() {
  try {
    const bookmarks = getBookmarks();
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

    if (DEBUG) {
      console.log('Bookmarks exported:', bookmarks);
    }

    flashSuccess('flash.bookmarks.exported');
  } catch (err) {
    console.error(err);
    flashError('flash.bookmarks.exportError');
  }
}

/**
 * Imports bookmarks from a JSON file.
 *
 * The process:
 * - Reads file contents
 * - Parses JSON
 * - Validates array structure
 * - Replaces current bookmarks
 * - Persists and re-renders
 *
 * @param {File} file
 */
export function importBookmarks(file) {
  if (!file) return flashError('flash.bookmarks.importError');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid bookmarks file');
      setBookmarks(data);

      const bookmarks = await saveBookmarks();
      if (DEBUG) {
        console.log('Bookmarks imported:', bookmarks);
      }

      flashSuccess('flash.bookmarks.imported');
      renderBookmarks();
    } catch (err) {
      console.error(err);
      flashError('flash.bookmarks.importError');
    }
  };
  reader.readAsText(file);
}

/**
 * Initializes import/export UI bindings.
 *
 * @param {HTMLButtonElement} exportBtn
 * @param {HTMLInputElement} importInput
 */
export function initImportExportButtons(exportBtn, importInput) {
  exportBtn.addEventListener('click', exportBookmarks);
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importBookmarks(file);
    importInput.value = '';
  });

  if (DEBUG) console.log('Import/export buttons initialized');
}