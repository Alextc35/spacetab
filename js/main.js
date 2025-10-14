import { loadBookmarks } from './core/bookmark.js';
import { initBookmarkModal } from './ui/modal.js';
import { handleAddBookmark, renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettings } from './ui/settings.js';
import { SETTINGS } from './core/config.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

async function initApp() {
    await loadBookmarks();
    initSettings(SETTINGS);
    initBookmarkModal(renderBookmarks);
    renderBookmarks();
}

/* ======================= Añadir bookmark ======================= */
addButton.addEventListener('click', handleAddBookmark);

/* ======================= Alternar modo edición ======================= */
toggleButton.addEventListener('click', () => {
    const isEditing = gridOverlay.style.display !== 'block';
    toggleButton.textContent = isEditing ? "🔒" : "✎";
    gridOverlay.style.display = isEditing ? 'block' : 'none';
    setEditMode(isEditing);
    renderBookmarks();
});

initApp();