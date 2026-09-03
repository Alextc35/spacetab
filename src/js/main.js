import { debug } from './core/debug.js';
import { initDebugTools, finishDebugStartup } from './core/diagnostics.js';
import {
  subscribe,
  hydrateStore,
  getState,
  getSyncCompatibility,
  subscribeToRemoteSyncUpdates
} from './core/store.js';
import { preloadLocalImages } from './core/localImages.js';
import { initI18n, changeLanguage } from './core/i18n.js';
import { applyGlobalTheme } from './core/theme.js';
import { applyInterfaceTheme } from './core/interfacePreferences.js';
import { enableGridEditing, renderBookmarks } from './ui/bookmark/renderer.js';
import { clearBookmarkSelection } from './ui/bookmark/selection.js';
import { initUIController, updateEditUI } from './ui/uiController.js';
import { initWorkspaceToolbar } from './ui/workspaceToolbar.js';
import { initBulkBookmarkActions } from './ui/bookmark/bulkActions.js';
import { initBookmarkKeyboardMovement } from './ui/bookmark/keyboardMovement.js';
import { initGridKeyboardNavigation } from './ui/bookmark/gridKeyboardNavigation.js';
import { initFolderController } from './ui/folder/controller.js';
import { flashInfo } from './ui/flash.js';
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

const startupStartedAt = performance.now();
const startupTrace = debug.start('Initial load');
initApp().catch(error => {
  startupTrace.end({ status: 'error', error: error.message });
  console.error('[SpaceTab] Could not initialize the page:', error);
});

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
  await initState();
  startupTrace.mark('Load and migrate data');
  applyInterfaceTheme(getState().data.settings.interfaceTheme);
  await preloadLocalImages(getState().data);

  startupTrace.mark('Load local images');

  await initI18n();
  startupTrace.mark('Load language');
  subscribe(handleStateChange);
  subscribeToRemoteSyncUpdates(() => {
    flashInfo('flash.sync.updatedFromOtherDevice', 4000);
  });

  initUI();
  initModals();
  initWorkspaceToolbar();
  initBulkBookmarkActions();
  initGridKeyboardNavigation(container);
  initBookmarkKeyboardMovement();
  initFolderController();

  if (getSyncCompatibility()) {
    flashInfo('flash.sync.versionBlocked', 8000);
  }

  startupTrace.mark('Initialize UI');
  initDebugTools();
  void finishDebugStartup(startupTrace, startupStartedAt).catch(error => {
    debug.info('Could not complete the startup report', { error: error.message });
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
    const trace = debug.start('Initial grid render');
    renderBookmarks(container);
    trace.end();
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
    applyInterfaceTheme(state.data.settings.interfaceTheme);
    void changeLanguage(state.data.settings);
  }

  if (settingsChanged || bookmarksChanged || foldersChanged) {
    const trace = debug.start('Render grid', { bookmarks: state.data.bookmarks.length, folders: state.data.folders.length });
    void preloadLocalImages(state.data).then(() => {
      trace.mark('Resolve local images');
      if (settingsChanged) applyGlobalTheme(state.data.settings);
      renderBookmarks(container);
      trace.mark('Build grid DOM');
      trace.end();
    }).catch(error => {
      trace.end({ status: 'error', error: error.message });
      console.error('[LOCAL_IMAGE] Could not load local image:', error);
      if (settingsChanged) applyGlobalTheme(state.data.settings);
      renderBookmarks(container);
    });
  } else if (editingChanged) {
    if (state.ui.isEditing) {
      enableGridEditing(container);
    } else {
      renderBookmarks(container);
    }
  }

  if (editingChanged) {
    updateEditUI(state.ui.isEditing);
  }
}
