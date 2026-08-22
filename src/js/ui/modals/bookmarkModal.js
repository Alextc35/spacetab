import { createBookmarkEditorPanel } from '../bookmark/panel.js';
import { addBookmark, updateBookmarkById } from '../../core/bookmark.js';
import { createBookmarkDraft } from '../../core/bookmarkModel.js';
import { flashSuccess } from '../flash.js';
import { registerModal, openModal as openManagedModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';
import { showAlert } from './alert.js';
import { t } from '../../core/i18n.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { findFirstFreeSlot } from '../../core/grid.js';
import { getOccupiedGridItems } from '../../core/bookmark.js';

const modal = document.getElementById('edit-bookmark-modal');
const modalTitle = modal.querySelector('h2');
const modalHost = document.getElementById('bookmark-modal-form-host');
const modalSave = document.getElementById('edit-bookmark-modal-save');
const modalCancel = document.getElementById('edit-bookmark-modal-cancel');

/** @type {'add' | 'edit' | 'preset' | null} */
let mode = null;

/** @type {string|null} */
let editingId = null;

/** @type {ReturnType<typeof createBookmarkEditorPanel>|null} */
let form = null;

/** @type {((preset: BookmarkPreset) => void)|null} */
let applyPreset = null;

let submitting = false;
let registered = false;

/**
 * Initializes the unified bookmark modal.
 */
export function initBookmarkModal() {
  if (registered) return;
  registered = true;

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
    initialFocus: null,
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
  const draft = createBookmarkDraft({
    preset: settings.bookmarkDefault,
    bookmark: { groupId: settings.activeBookmarkGroupId }
  });

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

/**
 * Opens the shared editor in appearance-preset mode.
 * The caller owns the draft and decides how applying it is persisted.
 *
 * @param {Partial<BookmarkPreset>} preset
 * @param {Object} options
 * @param {(preset: BookmarkPreset) => void} options.onApply
 */
export function openBookmarkPresetEditor(preset, { onApply } = {}) {
  if (typeof onApply !== 'function') {
    throw new TypeError('Preset editor requires an onApply callback');
  }

  editingId = null;
  applyPreset = onApply;
  openBookmarkModal('preset', structuredClone(preset));
}

/**
 * @param {'add' | 'edit' | 'preset'} nextMode
 * @param {Object} bookmark
 */
function openBookmarkModal(nextMode, bookmark) {
  mode = nextMode;
  form?.destroy();
  form = createBookmarkEditorPanel({
    host: modalHost,
    idPrefix: 'bookmark-modal-form',
    mode: nextMode === 'add' ? 'create' : nextMode,
    value: bookmark,
    previewName: nextMode === 'preset'
      ? t('settingsModal.bookmark.previewName')
      : undefined,
    previewFaviconUrl: nextMode === 'preset'
      ? chrome.runtime.getURL('assets/icons/icon-128.png')
      : null,
    onChange: updateSaveButtonState
  });

  modalTitle.textContent = t(
    nextMode === 'add'
      ? 'addModal.title'
      : (nextMode === 'preset' ? 'settingsModal.bookmark.editorTitle' : 'editModal.title')
  );
  modalSave.textContent = t(
    nextMode === 'add'
      ? 'buttons.add'
      : (nextMode === 'preset' ? 'buttons.apply' : 'buttons.save')
  );

  updateSaveButtonState();
  form.activateDefaultTab();

  openManagedModal('bookmark-modal', {
    onAccept: handleAccept,
    onCancel: handleCancel,
    initialFocus: form.elements.name ?? form.elements.backgroundColor
  });
}

function getCurrentFormState() {
  return form?.getState() ?? {};
}

function hasChanges() {
  return form?.isDirty() ?? false;
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
  } else if (mode === 'edit') {
    handleEditAccept();
  } else {
    handlePresetAccept();
  }
}

async function handleAddAccept() {
  if (submitting) return;

  submitting = true;

  try {
    const validation = form.validate();
    if (!validation.isValid) return;
    const bookmark = validation.value;

    const groupItems = getOccupiedGridItems(bookmark.groupId);
    const maxRows = getMaxVisibleRows();
    const maxCols = getMaxVisibleCols();

    const position = findFirstFreeSlot(groupItems, {
      columns: maxCols,
      rows: maxRows
    });

    if (!position) {
      closeBookmarkModal();

      await new Promise(requestAnimationFrame);

      await showAlert(t('alert.bookmarks.no_space'), { type: 'info' });
      return;
    }

    const created = addBookmark({ ...bookmark, ...position });

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

  const validation = form.validate();
  if (!validation.isValid) return;
  const bookmark = updateBookmarkById(editingId, validation.value);

  if (bookmark) {
    flashSuccess('flash.bookmark.updated');
  }

  closeBookmarkModal();
}

function handlePresetAccept() {
  if (!hasChanges()) return;

  const validation = form.validate();
  if (!validation.isValid) return;

  applyPreset?.(validation.value);
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
    t(mode === 'preset' ? 'alert.settings.bookmark.cancel' : 'alert.bookmark.cancel'),
    { type: 'confirm' }
  );

  if (ok) closeBookmarkModal();
}

function resetAddForm() {
  const { data: { settings } } = getState();
  form.reset(createBookmarkDraft({
    preset: settings.bookmarkDefault,
    bookmark: { groupId: settings.activeBookmarkGroupId }
  }));
}

function closeBookmarkModal() {
  mode = null;
  editingId = null;
  applyPreset = null;
  closeModal();
}
