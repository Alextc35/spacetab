import { loadBookmarks } from './core/bookmark.js';
import { initBookmarkModal } from './ui/bookmarksEditModal.js';
import { handleAddBookmark, renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettings } from './ui/settings.js';
import { SETTINGS } from './core/config.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');
let resizeTimeout;

function initControls() {
    const toggleEdit = createToggleEditMode(toggleButton, gridOverlay, renderBookmarks, setEditMode);
    addButton.addEventListener('click', handleAddBookmark);
    toggleButton.addEventListener('click', toggleEdit);
}

async function initApp() {
    await loadBookmarks();
    initSettings(SETTINGS);
    initBookmarkModal(renderBookmarks);
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

window.addEventListener('resize', () => {
  // debounce para no recalcular 200 veces
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderBookmarks();
  }, 100);
});