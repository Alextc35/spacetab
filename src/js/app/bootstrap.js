import { debug } from '../core/debug.js';
import { finishDebugStartup, initDebugTools } from '../core/diagnostics.js';
import { initI18n } from '../platform/i18n/i18n.js';
import { applyInterfaceTheme } from '../shared/ui/interfaceTheme.js';
import {
  getState,
  getSyncCompatibility,
  hydrateStore,
  subscribe,
  subscribeToRemoteSyncUpdates
} from '../core/store.js';
import {
  ensureRecycleBinPosition,
  purgeExpiredRecycleBinEntries
} from '../features/recycle-bin/recycleBinActions.js';
import { initSettingsModal } from '../features/settings/settingsModal.js';
import { preloadLocalImages } from '../platform/images/localImages.js';
import { initBookmarkKeyboardMovement } from '../ui/bookmark/keyboardMovement.js';
import { initBulkBookmarkActions } from '../ui/bookmark/bulkActions.js';
import { initGridKeyboardNavigation } from '../ui/bookmark/gridKeyboardNavigation.js';
import { flashInfo } from '../ui/flash.js';
import { initFloatingMenu } from '../ui/floatingMenu.js';
import { initFolderController } from '../ui/folder/controller.js';
import { initKeyboardShortcuts } from '../ui/keyboardShortcuts.js';
import {
  initAlertModal,
  initBookmarkModal,
  initFolderEditorModal,
  initFolderModal,
  initRecycleBinEditorModal,
  initRecycleBinModal,
  initSearchModal
} from '../ui/modals/index.js';
import { initUIController } from '../ui/uiController.js';
import { initWorkspaceToolbar } from '../ui/workspaceToolbar.js';
import { createAppController } from './appController.js';
import { registerGridItemTypes } from './registerGridItemTypes.js';

const RECYCLE_BIN_PURGE_INTERVAL_MS = 60 * 60 * 1000;

/** Starts SpaceTab and reports bootstrap failures at the application boundary. */
export async function startApplication() {
  const startedAt = performance.now();
  const trace = debug.start('Initial load');

  try {
    await bootstrapApplication({ trace, startedAt });
  } catch (error) {
    trace.end({ status: 'error', error: error.message });
    console.error('[SpaceTab] Could not initialize the page:', error);
  }
}

/**
 * Composes the bundled features, hydrates state and connects UI controllers.
 * Ordering is intentional: state and localization are ready before UI setup.
 */
export async function bootstrapApplication({ trace, startedAt }) {
  const elements = getApplicationElements();
  registerGridItemTypes();

  await hydrateStore();
  purgeExpiredRecycleBinEntries();
  ensureRecycleBinPosition();
  setInterval(purgeExpiredRecycleBinEntries, RECYCLE_BIN_PURGE_INTERVAL_MS);
  trace.mark('Load and migrate data');

  applyInterfaceTheme(getState().data.settings.interfaceTheme);
  await preloadLocalImages(getState().data);
  trace.mark('Load local images');

  await initI18n(getState().data.settings);
  trace.mark('Load language');

  const appController = createAppController({ container: elements.container });
  subscribe(appController.handleStateChange);
  subscribeToRemoteSyncUpdates(() => {
    ensureRecycleBinPosition();
    flashInfo('flash.sync.updatedFromOtherDevice', 4000);
  });

  initializeUserInterface(elements);

  if (getSyncCompatibility()) {
    flashInfo('flash.sync.versionBlocked', 8000);
  }

  trace.mark('Initialize UI');
  initDebugTools();
  void finishDebugStartup(trace, startedAt).catch(error => {
    debug.info('Could not complete the startup report', { error: error.message });
  });
}

function getApplicationElements() {
  return {
    container: document.getElementById('bookmark-container'),
    gridOverlay: document.getElementById('grid-overlay'),
    toggleButton: document.getElementById('edit-toggle-mode')
  };
}

function initializeUserInterface({ container, gridOverlay, toggleButton }) {
  initUIController({ container, gridOverlay, toggleButton });
  initFloatingMenu();
  initModals();
  initWorkspaceToolbar();
  initBulkBookmarkActions();
  initGridKeyboardNavigation(container);
  initBookmarkKeyboardMovement();
  initFolderController();
  initKeyboardShortcuts();
}

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
