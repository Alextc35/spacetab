import { loadBookmarks } from './core/bookmark.js';
import { initBookmarkModal } from './ui/bookmarksEditModal.js';
import { initAddBookmarkModal, showAddBookmarkModal } from './ui/bookmarksAddModal.js';
import { renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettings } from './ui/settings.js';
import { SETTINGS, DEBUG } from './core/config.js';
import { initImportExportButtons } from './ui/bookmarksImportExport.js';
import { deleteAllBookmarks } from './ui/bookmarksImportExport.js';
import { initAlertModal } from './ui/alert.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');
let resizeTimeout;

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');

initImportExportButtons(exportBtn, importInput);

const deleteAllBtn = document.getElementById('delete-all-btn');
deleteAllBtn.addEventListener('click', deleteAllBookmarks);

importBtn.addEventListener('click', () => importInput.click());

function initControls() {
    const toggleEdit = createToggleEditMode(toggleButton, gridOverlay, renderBookmarks, setEditMode);
    addButton.addEventListener('click', showAddBookmarkModal);
    toggleButton.addEventListener('click', toggleEdit);
}

async function initApp() {
    const bookmarks = await loadBookmarks();
    if (DEBUG) console.log('Bookmarks loaded:', bookmarks);
    initSettings(SETTINGS);
    initAlertModal();
    initBookmarkModal(renderBookmarks);
    initAddBookmarkModal();
    renderBookmarks();
    initControls();
}

function createToggleEditMode(toggleButton, gridOverlay, renderBookmarks, setEditMode) {
    return function toggleEditMode() {
        const isEditing = gridOverlay.style.display !== 'block';
        toggleButton.textContent = isEditing ? "🔒" : "✎";
        gridOverlay.style.display = isEditing ? 'block' : 'none';
        setEditMode(isEditing);
        renderBookmarks();
    };
}

initApp();

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const isEditing = gridOverlay.style.display === 'block';

  switch (e.code) {
    case 'Enter':
      if (!isEditing) {
        e.preventDefault();
        showAddBookmarkModal();
      }
      break;

    case 'Space':
      e.preventDefault();
      toggleButton.click();
      break;
  }
});

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderBookmarks();
  }, 100);
});