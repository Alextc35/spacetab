import { initAddBookmarkModal, showAddBookmarkModal, initEditBookmarkModal, initAlertModal, initSettingsModal } from './ui/modals/index.js';
import { loadBookmarks } from './core/bookmark.js';
import { renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { SETTINGS } from './core/config.js';
import { initImportExportButtons } from './ui/bookmarksImportExport.js';
import { deleteAllBookmarks } from './ui/bookmarksImportExport.js';
import { hasOpenModal, shouldSuppressGlobalEnter, openModal } from './ui/modalManager.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');
let resizeTimeout;

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');

const deleteAllBtn = document.getElementById('delete-all-btn');
deleteAllBtn.addEventListener('click', deleteAllBookmarks);

importBtn.addEventListener('click', () => importInput.click());

initApp();

function initControls() {
    const toggleEdit = createToggleEditMode(toggleButton, gridOverlay, renderBookmarks, setEditMode);
    addButton.addEventListener('click', showAddBookmarkModal);
    toggleButton.addEventListener('click', toggleEdit);
}

async function initApp() {
    await loadBookmarks();
    initSettingsModal(SETTINGS);
    initAlertModal();
    initEditBookmarkModal(renderBookmarks);
    initAddBookmarkModal();
    initImportExportButtons(exportBtn, importInput);
    initControls();
    renderBookmarks();
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
    document.getElementById('settings')?.click();
  }

  const isEditing = gridOverlay.style.display === 'block';

  if (e.code === 'Enter') {
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