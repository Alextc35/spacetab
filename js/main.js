import { loadBookmarks } from './core/bookmark.js';
import { initBookmarkModal } from './ui/bookmarksEditModal.js';
import { initAddBookmarkModal, showAddModal } from './ui/bookmarksAddModal.js';
import { renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettings } from './ui/settings.js';
import { SETTINGS } from './core/config.js';
import { flashSuccess, flashError, flash } from './ui/flash.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');
let resizeTimeout;

function initControls() {
    const toggleEdit = createToggleEditMode(toggleButton, gridOverlay, renderBookmarks, setEditMode);
    addButton.addEventListener('click', showAddModal);
    toggleButton.addEventListener('click', toggleEdit);
}

async function initApp() {
    await loadBookmarks();
    initSettings(SETTINGS);
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
        showAddModal();
      }
      break;

    case 'Space':
      e.preventDefault();
      toggleButton.click();
      break;

    case 'Escape':
      if (isEditing) {
        e.preventDefault();
        toggleButton.click();
      }
      break;
  }
});

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderBookmarks();
  }, 100);
});