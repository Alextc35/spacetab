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

const container     = document.getElementById('bookmark-container');
const gridOverlay   = document.getElementById('grid-overlay');

const addButton     = document.getElementById('add-bookmark');
const toggleButton  = document.getElementById('edit-toggle-mode');

const exportBtn     = document.getElementById('export-btn');
const importBtn     = document.getElementById('import-btn');
const importInput   = document.getElementById('import-input');

const deleteAllBtn  = document.getElementById('delete-all-btn');

/* ======================= Bootstrap ======================= */

initApp();

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

async function initState() {
  await hydrateStore();
  subscribe(handleStateChange);
}

function initUI() {
  initUIController({
    container,
    gridOverlay,
    addButton,
    toggleButton
  });
}

function initModals() {
  initSettingsModal();
  initAlertModal();
  initAddBookmarkModal();
  initEditBookmarkModal();
}

function initImportExport() {
  initImportExportButtons(exportBtn, importInput);
  deleteAllBtn.addEventListener('click', deleteAllBookmarks);
  importBtn.addEventListener('click', () => importInput.click());
}

/* ======================= Store Reaction ======================= */

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