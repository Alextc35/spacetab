import { debug } from './core/debug.js';
import { initDebugTools, finishDebugStartup } from './core/diagnostics.js';
import {
  subscribe,
  hydrateStore,
  getState,
  getSyncCompatibility,
  subscribeToRemoteSyncUpdates
} from './core/store.js';
import { preloadLocalImages } from './platform/images/localImages.js';
import { initI18n, changeLanguage } from './core/i18n.js';
import { applyGlobalTheme } from './core/theme.js';
import { applyInterfaceTheme } from './core/interfacePreferences.js';
import { registerGridItemTypes } from './app/registerGridItemTypes.js';
import { enableGridEditing, renderGrid } from './features/grid/gridRenderer.js';
import { clearBookmarkSelection } from './ui/bookmark/selection.js';
import { initUIController, updateEditUI } from './ui/uiController.js';
import { initWorkspaceToolbar } from './ui/workspaceToolbar.js';
import { initFloatingMenu } from './ui/floatingMenu.js';
import { initBulkBookmarkActions } from './ui/bookmark/bulkActions.js';
import { initBookmarkKeyboardMovement } from './ui/bookmark/keyboardMovement.js';
import { initGridKeyboardNavigation } from './ui/bookmark/gridKeyboardNavigation.js';
import { initFolderController } from './ui/folder/controller.js';
import {
  initKeyboardShortcuts,
  syncKeyboardShortcutAccessibility
} from './ui/keyboardShortcuts.js';
import { flashInfo } from './ui/flash.js';
import {
  ensureRecycleBinPosition,
  purgeExpiredRecycleBinEntries
} from './features/recycle-bin/recycleBinActions.js';
import { initBookmarkModal,
  initAlertModal, initFolderEditorModal, initFolderModal,
  initRecycleBinEditorModal, initRecycleBinModal,
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
  registerGridItemTypes();
  await initState();
  purgeExpiredRecycleBinEntries();
  ensureRecycleBinPosition();
  setInterval(purgeExpiredRecycleBinEntries, 60 * 60 * 1000);
  startupTrace.mark('Load and migrate data');
  applyInterfaceTheme(getState().data.settings.interfaceTheme);
  await preloadLocalImages(getState().data);

  startupTrace.mark('Load local images');

  await initI18n();
  startupTrace.mark('Load language');
  subscribe(handleStateChange);
  subscribeToRemoteSyncUpdates(() => {
    ensureRecycleBinPosition();
    flashInfo('flash.sync.updatedFromOtherDevice', 4000);
  });

  initUI();
  initFloatingMenu();
  initModals();
  initWorkspaceToolbar();
  initBulkBookmarkActions();
  initGridKeyboardNavigation(container);
  initBookmarkKeyboardMovement();
  initFolderController();
  initKeyboardShortcuts();

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
  initRecycleBinModal();
  initRecycleBinEditorModal();
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
    renderGrid(container);
    trace.end();
    return;
  }

  const settingsChanged =
    state.data.settings !== prev.data.settings;

  const bookmarksChanged =
    state.data.bookmarks !== prev.data.bookmarks;

  const foldersChanged =
    state.data.folders !== prev.data.folders;

  const widgetsChanged =
    state.data.widgets !== prev.data.widgets;

  const recycleBinChanged =
    state.data.recycleBin !== prev.data.recycleBin
    || state.data.trash !== prev.data.trash;

  const editingChanged =
    state.ui.isEditing !== prev.ui.isEditing;

  if (editingChanged && !state.ui.isEditing) {
    clearBookmarkSelection();
  }

  if (settingsChanged) {
    applyInterfaceTheme(state.data.settings.interfaceTheme);
    void changeLanguage(state.data.settings);
    syncKeyboardShortcutAccessibility(state.data.settings.keyboardShortcuts);
  }

  if (settingsChanged || bookmarksChanged || foldersChanged || widgetsChanged || recycleBinChanged) {
    const trace = debug.start('Render grid', {
      bookmarks: state.data.bookmarks.length,
      folders: state.data.folders.length,
      widgets: state.data.widgets.length
    });
    void preloadLocalImages(state.data).then(() => {
      trace.mark('Resolve local images');
      if (settingsChanged) applyGlobalTheme(state.data.settings);
      renderGrid(container);
      trace.mark('Build grid DOM');
      trace.end();
    }).catch(error => {
      trace.end({ status: 'error', error: error.message });
      console.error('[LOCAL_IMAGE] Could not load local image:', error);
      if (settingsChanged) applyGlobalTheme(state.data.settings);
      renderGrid(container);
    });
  } else if (editingChanged) {
    if (state.ui.isEditing) {
      enableGridEditing(container);
    } else {
      renderGrid(container);
    }
  }

  if (editingChanged) {
    updateEditUI(state.ui.isEditing);
  }
}
