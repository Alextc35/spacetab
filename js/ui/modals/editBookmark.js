import { createBookmarkEditor } from '../bookmark/editor.js';
import { updateBookmarkById } from '../../core/bookmark.js';
import { flashSuccess } from '../flash.js';
import { registerModal, openModal as openManagedModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';
import { showAlert } from './alert.js';
import { t } from '../../core/i18n.js';
import { initTabs } from '../tabs.js';

const editModal = document.getElementById('edit-bookmark-modal');

const modalName = document.getElementById('edit-bookmark-modal-name');
const modalUrl = document.getElementById('edit-bookmark-modal-url');

const modalUrlToggleBtn = document.getElementById('edit-modal-toggle-url');
const modalUrlCopyBtn = document.getElementById('edit-modal-copy-url');
const modalUrlClearBtn = document.getElementById('edit-modal-clear-url');

const modalInvertColorIcon = document.getElementById('edit-bookmark-modal-invert-color-icon');
const modalInvertColorBg = document.getElementById('edit-bookmark-modal-invert-color-bg');

const modalBackgroundColor = document.getElementById('edit-bookmark-modal-background-color');
const modalNoBackground = document.getElementById('edit-bookmark-modal-no-background');

const modalTextColor = document.getElementById('edit-bookmark-modal-text-color');
const modalShowText = document.getElementById('edit-bookmark-modal-show-text');

const modalShowFavicon = document.getElementById('edit-bookmark-modal-show-favicon');

const modalBackgroundImage = document.getElementById('edit-bookmark-modal-background-image');

const modalBgToggleBtn = document.getElementById('edit-modal-toggle-background-image');
const modalBgCopyBtn = document.getElementById('edit-modal-copy-background-image');
const modalBgClearBtn = document.getElementById('edit-modal-clear-background-image');

const modalBackgroundFavicon = document.getElementById('edit-bookmark-modal-background-favicon');

const modalSave = document.getElementById('edit-bookmark-modal-save');
const modalCancel = document.getElementById('edit-bookmark-modal-cancel');

const previewContainer = document.getElementById('edit-bookmark-modal-preview');

let editingId = null;
let editor = null;
let initialSnapshot = null;
let registered = false;
let tabs;

/* =====================================
   Helpers
===================================== */

function getCurrentFormState() {
  return editor?.getState() ?? {};
}

function hasChanges() {
  return JSON.stringify(getCurrentFormState()) !== JSON.stringify(initialSnapshot);
}

function updateSaveButtonState() {
  const changed = hasChanges();

  modalSave.disabled = !changed;
  modalSave.classList.toggle('is-hidden', !changed);
}

function resetTabScroll() {
  const activeTab = editModal.querySelector('.edit-bookmark-modal-tab-content[style*="flex"]');
  if (activeTab) activeTab.scrollTop = 0;
}


/* =====================================
   Init Modal
===================================== */

export function initeditBookmark() {

  if (registered) return;
  registered = true;

  tabs = initTabs({
    root: editModal,
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  registerModal({
    id: 'edit-bookmark',
    element: editModal,
    acceptOnEnter: false,
    closeOnEsc: false,
    closeOnOverlay: false,
    initialFocus: modalName
  });

}


/* =====================================
   Open Modal
===================================== */

export function openModal(bookmarkId) {
  const state = getState();
  const bookmark = state.data.bookmarks.find(b => b.id === bookmarkId);
  if (!bookmark) return;

  editingId = bookmarkId;

  // Destruir editor anterior si existe
  if (editor?.destroy) editor.destroy();

  editor = createBookmarkEditor({
    bookmark: structuredClone(bookmark),
    elements: {
      preview: previewContainer,
      name: modalName,
      url: modalUrl,
      backgroundColor: modalBackgroundColor,
      backgroundImage: modalBackgroundImage,
      backgroundFavicon: modalBackgroundFavicon,
      noBackground: modalNoBackground,
      invertBg: modalInvertColorBg,
      showText: modalShowText,
      textColor: modalTextColor,
      showFavicon: modalShowFavicon,
      invertIcon: modalInvertColorIcon,
      urlToggleBtn: modalUrlToggleBtn,
      urlCopyBtn: modalUrlCopyBtn,
      urlClearBtn: modalUrlClearBtn,
      bgToggleBtn: modalBgToggleBtn,
      bgCopyBtn: modalBgCopyBtn,
      bgClearBtn: modalBgClearBtn
    },
    onChange: updateSaveButtonState
  });

  initialSnapshot = editor.getState();
  updateSaveButtonState();
  tabs.activate('edit-bookmark-modal-tab-general');
  resetTabScroll();
  openManagedModal('edit-bookmark');
};

/* =====================================
   Save
===================================== */

modalSave.addEventListener('click', () => {

  if (!editingId) return;

  const updatedData = editor.getState();

  const bookmark = updateBookmarkById(editingId, updatedData);

  if (bookmark) {
    flashSuccess('flash.bookmark.updated');
  }

  initialSnapshot = null;

  closeEditModal();

});


/* =====================================
   Cancel
===================================== */

modalCancel.addEventListener('click', async () => {

  if (!hasChanges()) {
    closeEditModal();
    return;
  }

  const ok = await showAlert(
    t('alert.bookmark.cancel'),
    { type: 'confirm' }
  );

  if (ok) closeEditModal();

});


function closeEditModal() {
  editingId = null;
  if (editor?.destroy) editor.destroy();
  editor = null;
  closeModal();
}


/* =====================================
   Tabs Logic
===================================== */
