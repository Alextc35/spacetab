import { VERSION, DEBUG  } from './core/config.js';
import { subscribe, hydrateStore, getStorageMode } from './core/store.js';
import { initI18n, changeLanguage } from './core/i18n.js';
import { applyGlobalTheme } from './core/theme.js';
import { renderBookmarks } from './ui/bookmark/renderer.js';
import { clearBookmarkSelection } from './ui/bookmark/selection.js';
import { initUIController, updateEditUI } from './ui/uiController.js';
import { initWorkspaceToolbar } from './ui/workspaceToolbar.js';
import { initBulkBookmarkActions } from './ui/bookmark/bulkActions.js';
import { initBookmarkKeyboardMovement } from './ui/bookmark/keyboardMovement.js';
import { initFolderController } from './ui/folder/controller.js';
import { initBookmarkModal,
  initAlertModal, initFolderEditorModal, initFolderModal,
  initSearchModal, initSettingsModal } from './ui/modals/index.js';

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
  }

  await initState();

  if (DEBUG) logStorageUsage();

  await initI18n();
  subscribe(handleStateChange);

  initUI();
  initModals();
  initWorkspaceToolbar();
  initBulkBookmarkActions();
  initBookmarkKeyboardMovement();
  initFolderController();

  if (DEBUG) {
    console.info('Initializing SpaceTab ' + VERSION + ' alfa');
    console.timeEnd("Execution time");
  }
}

/**
 * Logs usage for the storage area selected on this device.
 */
function logStorageUsage() {
  const mode = getStorageMode();
  const storageArea = chrome.storage[mode];
  const maxBytes = storageArea.QUOTA_BYTES;

  storageArea.getBytesInUse(null, usedBytes => {
    const usedKB = (usedBytes / 1024).toFixed(2);
    const maxKB = (maxBytes / 1024).toFixed(2);
    const percentage = ((usedBytes / maxBytes) * 100).toFixed(2);

    console.log(`[STORAGE] ${mode}: ${usedKB} KB / ${maxKB} KB (${percentage}%)`);
  });
}

/* ======================= Init Sections ======================= */

/**
 * Initializes application state and subscribes to store changes.
 *
 * @returns {Promise<void>}
 */
async function initState() {
  await hydrateStore();
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
  initAlertModal();
  initSearchModal();
  initFolderModal();
  initFolderEditorModal();
  initSettingsModal();
  initBookmarkModal();
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
    updateEditUI(state.ui.isEditing);
    renderBookmarks(container);
    return;
  }

  const settingsChanged =
    state.data.settings !== prev.data.settings;

  const bookmarksChanged =
    state.data.bookmarks !== prev.data.bookmarks;

  const foldersChanged =
    state.data.folders !== prev.data.folders;

  const editingChanged =
    state.ui.isEditing !== prev.ui.isEditing;

  if (editingChanged && !state.ui.isEditing) {
    clearBookmarkSelection();
  }

  if (settingsChanged) {
    applyGlobalTheme(state.data.settings);
    changeLanguage(state.data.settings)
  }

  if (settingsChanged || bookmarksChanged || foldersChanged || editingChanged) {
    renderBookmarks(container);
  }

  if (editingChanged) {
    updateEditUI(state.ui.isEditing);
  }
}
