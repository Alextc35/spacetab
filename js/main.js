/* ======================= Imports ======================= */

import {
  initAddBookmarkModal, showAddBookmarkModal,
  initEditBookmarkModal, initAlertModal, initSettingsModal
} from './ui/modals/index.js';
import {
  hasOpenModal, shouldSuppressGlobalEnter
} from './ui/modalManager.js';
import {
  initImportExportButtons, deleteAllBookmarks
} from './ui/bookmarksImportExport.js';
import {
  subscribe, hydrateStore, toggleEditing
} from './core/store.js';
import { renderBookmarks } from './ui/bookmarks.js';
import { DEBUG } from './core/config.js';
import { applyGlobalTheme } from './core/theme.js';
import { changeLanguage, initI18n, t } from './core/i18n.js';
import { flash } from './ui/flash.js';
import { VERSION } from './core/config.js';

/* ======================= DOM References ======================= */

const addButton     = document.getElementById('add-bookmark');
const toggleButton  = document.getElementById('edit-toggle-mode');
const gridOverlay   = document.getElementById('grid-overlay');

const exportBtn     = document.getElementById('export-btn');
const importBtn     = document.getElementById('import-btn');
const importInput   = document.getElementById('import-input');
const deleteAllBtn  = document.getElementById('delete-all-btn');

/* ======================= Internal State ======================= */

let resizeTimeout = null;

/* ======================= Bootstrap ======================= */

initApp();

async function initApp() {
  if (DEBUG) {
    console.info('Initializing SpaceTab ' + VERSION + ' alfa');
    console.time("Execution time"); 
  }
  
  await initState();
  await initI18n();
  initModals();
  initImportExport();
  initControls();
  initGlobalEvents();

  if (DEBUG) console.timeEnd("Execution time");
}

/* ======================= Init Sections ======================= */
async function initState() {
  await hydrateStore();
  subscribe(handleStateChange);
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

function initControls() {
  addButton.addEventListener('click', showAddBookmarkModal);
  toggleButton.addEventListener('click', toggleEditMode);
}

function initGlobalEvents() {
  document.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('resize', handleResize);
}

/* ======================= Handlers ======================= */
function handleStateChange(state, prev) {
  if (!prev) {
    applyGlobalTheme(state.data.settings);
    changeLanguage(state.data.settings);
    updateEditUI(state.ui.isEditing);
    renderBookmarks();
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
    renderBookmarks();
  }

  if (editingChanged) {
    updateEditUI(state.ui.isEditing);
  }
}

function updateEditUI(isEditing) {
  toggleButton.textContent = isEditing ? '🔒' : '✎';
  gridOverlay.style.display = isEditing ? 'block' : 'none';
}

function handleGlobalKeydown(e) {
  // Suppress global Enter when modal requests it
  if (e.code === 'Enter' && shouldSuppressGlobalEnter()) {
    e.preventDefault();
    return;
  }

  // Ignore typing contexts
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  // Ignore if modal is open
  if (hasOpenModal()) return;

  // Open settings with "."
  if (e.key === '.') {
    e.preventDefault();
    document.getElementById('settings')?.click();
    return;
  }

  // Open Add Bookmark
  if (e.code === 'Enter') {
    e.preventDefault();
    showAddBookmarkModal();
    return;
  }

  // Toggle edit mode
  if (e.code === 'Space') {
    e.preventDefault();
    toggleButton.click();
  }
}

function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(renderBookmarks, 100);
}

async function toggleEditMode() {
  let isEditing = await toggleEditing();

  flash(
    isEditing
      ? t('flash.editMode.enabled')
      : t('flash.editMode.disabled'),
    'info',
    1000
  );
}