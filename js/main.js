import { loadBookmarks } from './core/bookmark.js';
import { initBookmarkModal } from './ui/editBookmarkModal.js';
import { initAddBookmarkModal, showAddBookmarkModal } from './ui/addBookmarkModal.js';
import { renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettings } from './ui/settings.js';
import { SETTINGS, DEBUG } from './core/config.js';
import { initImportExportButtons } from './ui/bookmarksImportExport.js';
import { deleteAllBookmarks } from './ui/bookmarksImportExport.js';
import { initAlertModal } from './ui/alertModal.js';
import { hasOpenModal, shouldSuppressGlobalEnter, openModal } from './ui/modalManager.js';

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
  if (e.code === 'Enter' && shouldSuppressGlobalEnter()) {
    e.preventDefault();
    return;
  }

  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (hasOpenModal()) return;

  if (e.key === '.') {
    e.preventDefault();
    openModal('settings');
  }

  const isEditing = gridOverlay.style.display === 'block';

  if (e.code === 'Enter' && !isEditing) {
    e.preventDefault();
    showAddBookmarkModal();
  }

  if (e.code === 'Space') {
    e.preventDefault();
    toggleButton.click();
  }
});

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderBookmarks();
  }, 100);
});