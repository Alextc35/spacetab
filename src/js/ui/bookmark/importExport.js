import { DEBUG } from '../../core/config.js';
import { getState, setState } from '../../core/store.js';
import {
  createBookmarksEnvelope,
  parseBookmarksPayload
} from '../../core/dataSchema.js';
import { flashSuccess, flashError } from '../flash.js';
import { downloadJson } from '../backup.js';

/**
 * Exports all current bookmarks as a JSON file.
 *
 * Generates a downloadable file named "bookmarks.json"
 * containing the serialized bookmarks array.
 *
 * @returns {void}
 */
export function exportBookmarks() {
  try {
    const { data: { bookmarks } } = getState();
    downloadJson(createBookmarksEnvelope(bookmarks), 'spacetab-bookmarks.json');

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
export async function importBookmarks(file) {
  if (!file) return flashError('flash.bookmarks.importError');

  try {
    const payload = JSON.parse(await file.text());
    const currentData = getState().data;
    const bookmarks = parseBookmarksPayload(payload, currentData);
    await setState({ data: { bookmarks } });

    if (DEBUG) console.log('Bookmarks imported:', bookmarks);
    flashSuccess('flash.bookmarks.imported');
  } catch (err) {
    console.error(err);
    flashError('flash.bookmarks.importError');
  }
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
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    await importBookmarks(file);
    importInput.value = '';
  });
}
