import { loadBookmarks } from './core/bookmark.js';
import { initModal } from './ui/modal.js';
import { handleAddBookmark, renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettingsModal } from './ui/settings.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

let SETTINGS = {
    gridSize: 140,
    language: 'es'
};

await loadBookmarks();
initModal(renderBookmarks);
renderBookmarks();

initSettingsModal(SETTINGS);

/* ======================= Alternar modo edición ======================= */
toggleButton.addEventListener('click', () => {
    const isEditing = gridOverlay.style.display !== 'block';
    toggleButton.textContent = isEditing ? "🔒" : "✎";
    gridOverlay.style.display = isEditing ? 'block' : 'none';
    setEditMode(isEditing);
    renderBookmarks();
});

/* ======================= Añadir bookmark ======================= */
addButton.addEventListener('click', handleAddBookmark);