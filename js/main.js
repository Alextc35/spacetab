import { loadBookmarks } from './core/bookmark.js';
import { initBookmarkModal } from './ui/bookmarksEditModal.js';
import { initAddBookmarkModal, showAddModal } from './ui/bookmarksAddModal.js';
import { renderBookmarks, setEditMode} from './ui/bookmarks.js';
import { initSettings } from './ui/settings.js';
import { SETTINGS } from './core/config.js';

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

document.addEventListener('keydown', (e) => {
  // solo Enter
  if (e.key !== 'Enter') return;

  // no si estás escribiendo en un input
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  // no si estás en modo edición
  if (document.getElementById('grid-overlay').style.display === 'block') return;

  e.preventDefault();
  showAddModal();
});

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
  // solo espacio
  if (e.code !== 'Space') return;

  // no si estás escribiendo
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  e.preventDefault(); // evita scroll
  toggleButton.click();
});

initApp();

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  // evitar inputs
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  // dispara el toggle si el overlay está visible (modo edición)
  const gridOverlay = document.getElementById('grid-overlay');
  if (gridOverlay.style.display === 'block') {
    toggleButton.click(); // simula el click en tu botón
  }
});

window.addEventListener('resize', () => {
  // debounce para no recalcular 200 veces
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderBookmarks();
  }, 100);
});