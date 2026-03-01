import { VERSION, DEBUG  } from './core/config.js';
import { subscribe, hydrateStore } from './core/store.js';
import { initI18n, changeLanguage } from './core/i18n.js';
import { applyGlobalTheme } from './core/theme.js';
import { deleteAllBookmarks } from './ui/bookmarkActions.js';
import { initImportExportButtons } from './ui/bookmarkImportExport.js';
import { renderBookmarks } from './ui/bookmarkRenderer.js';
import { initUIController, updateEditUI } from './ui/uiController.js';
import { initAddBookmarkModal, initEditBookmarkModal,
  initAlertModal, initSettingsModal } from './ui/modals/index.js';

/* ======================= DOM References ======================= */

/** @type {HTMLElement|null} */
const container = document.getElementById('bookmark-container');

/** @type {HTMLElement|null} */
const gridOverlay = document.getElementById('grid-overlay');

/** @type {HTMLElement|null} */
const addButton = document.getElementById('add-bookmark');

/** @type {HTMLElement|null} */
const toggleButton = document.getElementById('edit-toggle-mode');

/** @type {HTMLElement|null} */
const exportBtn = document.getElementById('export-btn');

/** @type {HTMLElement|null} */
const importBtn = document.getElementById('import-btn');

/** @type {HTMLInputElement|null} */
const importInput = document.getElementById('import-input');

/** @type {HTMLElement|null} */
const deleteAllBtn = document.getElementById('delete-all-btn');

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
  if (DEBUG) { console.info('Initializing SpaceTab ' + VERSION + ' alfa'); console.time("Execution time"); }
  
  await initState();
  await initI18n();

  initUI();
  initModals();
  initImportExport();

  if (DEBUG) console.timeEnd("Execution time");
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
    addButton,
    toggleButton
  });
}

/**
 * Initializes all modal components.
 */
function initModals() {
  initSettingsModal();
  initAlertModal();
  initAddBookmarkModal();
  initEditBookmarkModal();
}

/**
 * Initializes import/export functionality.
 */
function initImportExport() {
  initImportExportButtons(exportBtn, importInput);
  deleteAllBtn.addEventListener('click', deleteAllBookmarks);
  importBtn.addEventListener('click', () => importInput.click());
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