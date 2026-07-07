import { createBookmarkForm } from '../bookmark/form.js';
import { addBookmark, updateBookmarkById } from '../../core/bookmark.js';
import { flashSuccess } from '../flash.js';
import { registerModal, openModal as openManagedModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';
import { showAlert } from './alert.js';
import { t } from '../../core/i18n.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { isAreaFree } from '../../core/grid.js';

const modal = document.getElementById('edit-bookmark-modal');
const modalTitle = modal.querySelector('h2');
const modalSave = document.getElementById('edit-bookmark-modal-save');
const modalCancel = document.getElementById('edit-bookmark-modal-cancel');

/** @type {'add' | 'edit' | null} */
let mode = null;

/** @type {string|null} */
let editingId = null;

/** @type {ReturnType<typeof createBookmarkForm>|null} */
let form = null;

/** @type {Object|null} */
let initialSnapshot = null;

let submitting = false;
let registered = false;

/**
 * Initializes the unified bookmark modal.
 */
export function initBookmarkModal() {
  if (registered) return;
  registered = true;

  const host = document.getElementById('bookmark-modal-form-host');

  form = createBookmarkForm({
    host,
    idPrefix: 'bookmark-modal-form',
    showGeneral: true,
    bookmark: {},
    onChange: updateSaveButtonState
  });

  modalSave.addEventListener('click', handleAccept);
  modalCancel.addEventListener('click', handleCancel);

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAccept();
    }
  });

  document.getElementById('add-bookmark')
    ?.addEventListener('click', openAddBookmark);

  registerModal({
    id: 'bookmark-modal',
    element: modal,
    closeOnEsc: true,
    closeOnOverlay: true,
    acceptOnEnter: false,
    initialFocus: form.elements.name,
    shortcut: 'Enter',
    toggleWithShortcut: true,
    onShortcut: openAddBookmark
  });
}

/**
 * Opens the modal in add mode with a fresh bookmark draft.
 */
export function openAddBookmark() {
  const { data: { settings } } = getState();
  const draft = structuredClone(settings.bookmarkDefault);
  draft.name = '';
  draft.url = '';
  draft.urlLocked = false;

  openBookmarkModal('add', draft);
}

/**
 * Opens the modal in edit mode for the given bookmark id.
 *
 * @param {string} bookmarkId
 */
export function openEditBookmark(bookmarkId) {
  const state = getState();
  const bookmark = state.data.bookmarks.find(b => b.id === bookmarkId);
  if (!bookmark) return;

  editingId = bookmarkId;
  openBookmarkModal('edit', structuredClone(bookmark));
}

/** @deprecated Use openEditBookmark */
export { openEditBookmark as openModal };

/**
 * @param {'add' | 'edit'} nextMode
 * @param {Object} bookmark
 */
function openBookmarkModal(nextMode, bookmark) {
  mode = nextMode;

  modalTitle.textContent = t(nextMode === 'add' ? 'addModal.title' : 'editModal.title');
  modalSave.textContent = t(nextMode === 'add' ? 'buttons.add' : 'buttons.save');

  form.reset(bookmark);
  initialSnapshot = nextMode === 'edit' ? form.getState() : null;

  updateSaveButtonState();
  form.activateDefaultTab();

  openManagedModal('bookmark-modal', {
    onAccept: handleAccept,
    onCancel: handleCancel
  });
}

function getCurrentFormState() {
  return form?.getState() ?? {};
}

function hasChanges() {
  return JSON.stringify(getCurrentFormState()) !== JSON.stringify(initialSnapshot);
}

function updateSaveButtonState() {
  if (mode === 'add') {
    const hasName = getCurrentFormState().name?.trim().length > 0;
    modalSave.disabled = !hasName;
    modalSave.classList.toggle('is-disabled', !hasName);
    modalSave.classList.remove('is-hidden');
    return;
  }

  const changed = hasChanges();
  modalSave.disabled = !changed;
  modalSave.classList.toggle('is-hidden', !changed);
  modalSave.classList.remove('is-disabled');
}

async function handleAccept() {
  if (mode === 'add') {
    await handleAddAccept();
  } else {
    handleEditAccept();
  }
}

async function handleAddAccept() {
  if (submitting) return;

  submitting = true;

  try {
    const bookmark = form.getState();
    const name = bookmark.name.trim();
    const url = bookmark.url.trim();

    if (!name) {
      submitting = false;
      return;
    }

    const { data: { bookmarks } } = getState();
    const maxRows = getMaxVisibleRows();
    const maxCols = getMaxVisibleCols();

    let gx = 0;
    let gy = 0;
    let placed = false;

    for (let col = 0; col < maxCols && !placed; col++) {
      for (let row = 0; row < maxRows; row++) {
        if (isAreaFree(bookmarks, col, row, 1, 1)) {
          gx = col;
          gy = row;
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      closeBookmarkModal();

      await new Promise(requestAnimationFrame);

      await showAlert(t('alert.bookmarks.no_space'), { type: 'info' });
      return;
    }

    const created = addBookmark({ ...bookmark, name, url, gx, gy });

    if (created) {
      flashSuccess('flash.bookmark.added');
    }

    closeBookmarkModal();
  } finally {
    submitting = false;
    if (form.elements.backgroundImage) {
      form.elements.backgroundImage.value = '';
    }
  }
}

function handleEditAccept() {
  if (!editingId || !hasChanges()) return;

  const updatedData = form.getState();
  const bookmark = updateBookmarkById(editingId, updatedData);

  if (bookmark) {
    flashSuccess('flash.bookmark.updated');
  }

  initialSnapshot = null;
  closeBookmarkModal();
}

async function handleCancel() {
  if (mode === 'add') {
    const ok = await showAlert(
      t('alert.bookmark.add.cancel'),
      { type: 'confirm' }
    );

    if (!ok) return false;

    resetAddForm();
    closeBookmarkModal();
    return;
  }

  if (!hasChanges()) {
    closeBookmarkModal();
    return;
  }

  const ok = await showAlert(
    t('alert.bookmark.cancel'),
    { type: 'confirm' }
  );

  if (ok) closeBookmarkModal();
}

function resetAddForm() {
  const { data: { settings } } = getState();
  const resetBookmark = structuredClone(settings.bookmarkDefault);
  resetBookmark.name = '';
  resetBookmark.url = '';
  resetBookmark.urlLocked = false;

  if (form.elements.backgroundImage) form.elements.backgroundImage.value = '';
  form.elements.urlClearBtn?.click();
  if (form.elements.url) form.elements.url.value = '';

  form.reset(resetBookmark);
}

function closeBookmarkModal() {
  mode = null;
  editingId = null;
  initialSnapshot = null;
  closeModal();
}