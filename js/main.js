import { loadBookmarks } from './core/bookmark.js';
import { initModal } from './ui/modal.js';
import { handleAddBookmark, renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettingsModal } from './ui/settings.js';
import { SETTINGS } from './core/config.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

await loadBookmarks();
initModal(renderBookmarks);
renderBookmarks();

initSettingsModal(SETTINGS);

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