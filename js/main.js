/* ======================= Imports ======================= */

import {
  initAddBookmarkModal,
  showAddBookmarkModal,
  initEditBookmarkModal,
  initAlertModal,
  initSettingsModal
} from './ui/modals/index.js';

import { loadBookmarks } from './core/bookmark.js';
import { SETTINGS } from './core/config.js';

import {
  renderBookmarks,
  setEditMode
} from './ui/bookmarks.js';

import {
  initImportExportButtons,
  deleteAllBookmarks
} from './ui/bookmarksImportExport.js';

import {
  hasOpenModal,
  shouldSuppressGlobalEnter
} from './ui/modalManager.js';


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
  await loadBookmarks();

  initModals();
  initImportExport();
  initControls();
  initGlobalEvents();

  renderBookmarks();
}


/* ======================= Init Sections ======================= */

function initModals() {
  initSettingsModal(SETTINGS);
  initAlertModal();
  initEditBookmarkModal(renderBookmarks);
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
  const isEditing = gridOverlay.style.display !== 'block';

  toggleButton.textContent = isEditing ? '🔒' : '✎';
  gridOverlay.style.display = isEditing ? 'block' : 'none';

  setEditMode(isEditing);
  renderBookmarks();
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