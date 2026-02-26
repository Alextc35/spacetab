import { clearBookmarks} from '../core/bookmark.js';
import { flashError, flashSuccess } from './flash.js';
import { DEBUG } from '../core/config.js';
import { showAlert } from './modals/alertModal.js';
import { t } from '../core/i18n/i18n.js';
import { getState, setState } from '../core/store.js';

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

export async function deleteAllBookmarks() {
  const ok = await showAlert(
    t('alert.bookmarks.confirmDeleteAll'),
    { type: 'confirm' }
  );

  if (!ok) return;

  try {
    await clearBookmarks();

    if (DEBUG) console.log('All bookmarks deleted');

    flashSuccess('flash.bookmarks.deletedAll');
  } catch (err) {
    console.error(err);
    flashError('flash.bookmarks.deleteAllError');
  }
}

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

export function initImportExportButtons(exportBtn, importInput) {
  exportBtn.addEventListener('click', exportBookmarks);
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importBookmarks(file);
    importInput.value = '';
  });
}