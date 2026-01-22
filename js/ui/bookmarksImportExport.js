// ui/bookmarksImportExport.js
import { getBookmarks, setBookmarks, saveBookmarks, clearBookmarks} from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';
import { flashError, flashSuccess } from './flash.js';

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

/* =================== DELETE ALL =================== */
export async function deleteAllBookmarks() {
  const ok = confirm('Are you sure you want to delete ALL bookmarks? This cannot be undone.');
  if (!ok) return;

  try {
    await clearBookmarks();
    renderBookmarks();
    flashSuccess('All bookmarks deleted 🗑️');
  } catch (err) {
    console.error(err);
    flashError('Failed to delete bookmarks ❌');
  }
}

/* =================== EXPORT =================== */
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

    flashSuccess('Bookmarks exported successfully ✅');
  } catch (err) {
    console.error(err);
    flashError('Failed to export bookmarks ❌');
  }
}

/* =================== IMPORT =================== */
export function importBookmarks(file) {
  if (!file) return flashError('No file selected ❌');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid bookmarks file');
      setBookmarks(data);
      await saveBookmarks();
      flashSuccess('Bookmarks imported successfully ✅');
      renderBookmarks();
    } catch (err) {
      console.error(err);
      flashError('Failed to import bookmarks ❌');
    }
  };
  reader.readAsText(file);
}

/* =================== INIT BUTTONS =================== */
export function initImportExportButtons(exportBtn, importInput) {
  exportBtn.addEventListener('click', exportBookmarks);
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importBookmarks(file);
    importInput.value = ''; // reset input
  });
}