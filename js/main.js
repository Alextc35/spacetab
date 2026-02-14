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
  setState, getState, subscribe, finishHydration
} from './core/store.js';
import { loadBookmarks } from './core/bookmark.js';
import { renderBookmarks } from './ui/bookmarks.js';
import { loadSettings } from './core/settings.js';
import { DEBUG, DEFAULT_SETTINGS } from './core/config.js';
import { applyGlobalTheme } from './core/theme.js';
import { applyI18n, t } from './core/i18n.js';
import { flash } from './ui/flash.js';

/* ======================= DOM References ======================= */

const addButton     = document.getElementById('add-bookmark');
const toggleButton  = document.getElementById('toggle-mode');
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
  await initState(DEFAULT_SETTINGS);
  initModals();
  initImportExport();
  initControls();
  initGlobalEvents();
}

/* ======================= Init Sections ======================= */
async function initState(DEFAULT_SETTINGS) {
  subscribe((state, prev) => {
    if (
      state.bookmarks !== prev.bookmarks ||
      state.isEditing !== prev.isEditing
    ) {
      renderBookmarks();
    }

    if (state.settings !== prev.settings) {
      applyGlobalTheme(state.settings);
      applyI18n();
    }
  });

  await loadBookmarks();
  await loadSettings(DEFAULT_SETTINGS);

  finishHydration();
  
  if (DEBUG) console.log('State local loaded:', getState());
}

function initModals() {
  initSettingsModal();
  initAlertModal();
  initEditBookmarkModal();
  initAddBookmarkModal();
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

function toggleEditMode() {
  const { isEditing } = getState();

  const next = !isEditing;

  toggleButton.textContent = next ? '🔒' : '✎';
  gridOverlay.style.display = next ? 'block' : 'none';

  if (next) flash(t('flash.editMode.enabled'), 'info', 1000);
   else flash(t('flash.editMode.disabled'), 'info', 1000);

  setState({ isEditing: next });
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