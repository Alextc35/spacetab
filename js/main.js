import { VERSION, DEBUG  } from './core/config.js';
import { subscribe, hydrateStore } from './core/store.js';
import { initI18n, changeLanguage } from './core/i18n.js';
import { applyGlobalTheme } from './core/theme.js';
import { renderBookmarks } from './ui/bookmark/renderer.js';
import { initUIController, updateEditUI } from './ui/uiController.js';
import { initAddBookmark, initEditBookmark,
  initAlertModal, initSettingsModal } from './ui/modals/index.js';

/* ======================= DOM References ======================= */

/** @type {HTMLElement|null} */
const container = document.getElementById('bookmark-container');

/** @type {HTMLElement|null} */
const gridOverlay = document.getElementById('grid-overlay');

/** @type {HTMLElement|null} */
const toggleButton = document.getElementById('edit-toggle-mode');

/* ======================= Bootstrap ======================= */

initApp();

/**
 * Application bootstrap sequence.
 *
 * Order matters:
 * 1. Hydrate state
 * 2. Initialize i18n
 * 3. Initialize UI layer
 * 4. Initialize modals and import/export
 */
async function initApp() {
  if (DEBUG) {
    console.time("Execution time");
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB

    chrome.storage.local.getBytesInUse(null, (usedBytes) => {
      const usedKB = (usedBytes / 1024).toFixed(2);
      const maxKB = (MAX_BYTES / 1024).toFixed(2);

      console.log(`${usedKB} KB / ${maxKB} KB`);

      const percentage = ((usedBytes / MAX_BYTES) * 100).toFixed(2);
      console.log(`Usage: ${percentage}%`);
    });

  }

  await initState();
  await initI18n();

  initUI();
  initModals();

  if (DEBUG) {
    console.info('Initializing SpaceTab ' + VERSION + ' alfa');
    console.timeEnd("Execution time");
  }
}

/* ======================= Init Sections ======================= */

/**
 * Initializes application state and subscribes to store changes.
 *
 * @returns {Promise<void>}
 */
async function initState() {
  await hydrateStore();
  subscribe(handleStateChange);
}

/**
 * Initializes global UI controller.
 */
function initUI() {
  initUIController({
    container,
    gridOverlay,
    toggleButton
  });
}

/**
 * Initializes all modal components.
 */
function initModals() {
  initSettingsModal();
  initAlertModal();
  initAddBookmark();
  initEditBookmark();
}

/* ======================= Store Reaction ======================= */

/**
 * Store subscription handler.
 *
 * Reacts to:
 * - Settings changes (theme + language)
 * - Bookmark changes (re-render)
 * - Edit mode changes (UI update)
 *
 * @param {Object} state - Current application state
 * @param {Object|undefined} prev - Previous state
 */
function handleStateChange(state, prev) {
  if (!prev) {
    applyGlobalTheme(state.data.settings);
    changeLanguage(state.data.settings);
    updateEditUI(state.ui.isEditing);
    renderBookmarks(container);
    return;
  }

  const settingsChanged =
    state.data.settings !== prev.data.settings;

  const bookmarksChanged =
    state.data.bookmarks !== prev.data.bookmarks;

  const editingChanged =
    state.ui.isEditing !== prev.ui.isEditing;

  if (settingsChanged) {
    applyGlobalTheme(state.data.settings);
    changeLanguage(state.data.settings)
  }

  if (settingsChanged || bookmarksChanged || editingChanged) {
    renderBookmarks(container);
  }

  if (editingChanged) {
    updateEditUI(state.ui.isEditing);
  }
}