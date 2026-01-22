// ui/bookmarksImportExport.js
import { getBookmarks, setBookmarks, saveBookmarks } from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';

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

/* =================== FLASH MESSAGE =================== */
function showFlash(message, type = 'success', duration = 2000) {
  const flash = document.createElement('div');
  flash.textContent = message;
  flash.style.cssText = `
    background: ${type === 'success' ? '#4caf50' : '#f44336'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: bold;
    text-align: center;
    margin-top: 10px;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: auto;
    min-width: 200px;
  `;
  flashContainer.appendChild(flash);

  requestAnimationFrame(() => flash.style.opacity = '1');
  setTimeout(() => {
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 300);
  }, duration);
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

    showFlash('Bookmarks exported successfully ✅', 'success');
  } catch (err) {
    console.error(err);
    showFlash('Failed to export bookmarks ❌', 'error');
  }
}

/* =================== IMPORT =================== */
export function importBookmarks(file) {
  if (!file) return showFlash('No file selected ❌', 'error');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid bookmarks file');
      setBookmarks(data);
      await saveBookmarks();
      showFlash('Bookmarks imported successfully ✅', 'success');
      renderBookmarks();
    } catch (err) {
      console.error(err);
      showFlash('Failed to import bookmarks ❌', 'error');
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