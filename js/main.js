import { createToggleEditMode } from './core/utils.js';
import { loadBookmarks } from './core/bookmark.js';
import { initBookmarkModal } from './ui/bookmarksEditModal.js';
import { handleAddBookmark, renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettings } from './ui/settings.js';
import { SETTINGS } from './core/config.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

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

initApp();