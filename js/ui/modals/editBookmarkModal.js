import { updateBookmarkById } from '../../core/bookmark.js';
import { flashSuccess } from '../flash.js';
import { DEBUG } from '../../core/config.js';
import { registerModal, openModal as openManagedModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';
import { createBookmarkElement } from '../bookmarks.js';

const editModal = document.getElementById('edit-modal');
const modalName = document.getElementById('modal-name');
const modalUrl = document.getElementById('modal-url');
const modalInvertColorIcon = document.getElementById('modal-invert-color-icon');
const modalInvertColorBg = document.getElementById('modal-invert-color-bg');
const modalSave = document.getElementById('modal-save');
const modalCancel = document.getElementById('modal-cancel');
const modalBackgroundColor = document.getElementById('modal-background-color');
const modalNoBackground = document.getElementById('modal-no-background');
const modalTextColor = document.getElementById('modal-text-color');
const modalShowFavicon = document.getElementById('modal-show-favicon');
const modalShowText = document.getElementById('modal-show-text');
const modalBackgroundImage = document.getElementById('modal-background-image');
const modalBackgroundFavicon = document.getElementById('modal-background-favicon');

let editingId = null;
let draft = null;
let registered = false;

function resetTabScroll() {
  const activeTab = editModal.querySelector('.edit-tab-content[style*="flex"]');
  if (activeTab) activeTab.scrollTop = 0;
}

function buildDraft() {
  draft = {
    id: editingId,
    name: modalName.value.trim(),
    url: modalUrl.value.trim(),
    invertColorIcon: modalInvertColorIcon.checked,
    invertColorBg: modalInvertColorBg.checked,
    noBackground: modalNoBackground.checked,
    textColor: modalTextColor.value,
    showText: modalShowText.checked,
    backgroundColor: modalBackgroundColor.value,
    backgroundImageUrl: modalBackgroundImage.value.trim() || null,
    backgroundFavicon: modalBackgroundFavicon.checked,
    showFavicon: modalShowFavicon.checked
  };
}

const previewContainer = document.getElementById('edit-bookmark-preview');

function renderPreview() {
  if (!draft) return;

  previewContainer.innerHTML = '';

  const previewBookmark = createBookmarkElement(draft, {
    isEditing: false,
    isPreview: true
  });

  // Evitamos posicionamiento grid
  previewBookmark.style.removeProperty('--x');
  previewBookmark.style.removeProperty('--y');
  previewBookmark.style.removeProperty('--w');
  previewBookmark.style.removeProperty('--h');

  previewContainer.appendChild(previewBookmark);
}

function updatePreview() {
  buildDraft();
  renderPreview();
}

[
  modalName,
  modalUrl,
  modalInvertColorIcon,
  modalInvertColorBg,
  modalNoBackground,
  modalTextColor,
  modalShowText,
  modalBackgroundColor,
  modalBackgroundImage,
  modalBackgroundFavicon,
  modalShowFavicon
].forEach(input => {
  input.addEventListener('input', updatePreview);
  input.addEventListener('change', updatePreview);
});

export function initEditBookmarkModal() {
  if (registered) return;
  registered = true;

  registerModal({
    id: 'edit-bookmark',
    element: editModal,
    acceptOnEnter: false,
    closeOnEsc: false,
    closeOnOverlay: false,
    initialFocus: modalName
  });

  if (DEBUG) console.log('EditBookmark modal initialized');
}

export function openModal(bookmarkId) {
  const { bookmarks } = getState();
  const bookmark = bookmarks.find(b => b.id === bookmarkId);

  if (!bookmark) return;

  editingId = bookmarkId;

  modalName.value = bookmark.name;
  modalUrl.value = bookmark.url;
  modalInvertColorIcon.checked = !!bookmark.invertColorIcon;
  modalInvertColorBg.checked = !!bookmark.invertColorBg;
  modalBackgroundColor.value = bookmark.backgroundColor ?? '#0f172a';
  modalNoBackground.checked = !!bookmark.noBackground;
  modalTextColor.value = bookmark.textColor ?? '#e2e8f0';
  modalShowText.checked = !!bookmark.showText;
  modalShowFavicon.checked = !!bookmark.showFavicon;
  modalBackgroundImage.value = bookmark.backgroundImageUrl || '';
  modalBackgroundFavicon.checked = !!bookmark.backgroundFavicon;

  updateStates();
  updatePreview();
  activateTab('edit-tab-general');
  resetTabScroll();
  openManagedModal('edit-bookmark');
}

function updateStates() {
  const hasImage = modalBackgroundImage.value.trim() !== '';

  modalBackgroundFavicon.disabled = hasImage;
  modalBackgroundColor.disabled = hasImage || modalNoBackground.checked;
  modalNoBackground.disabled = hasImage && !modalBackgroundFavicon.checked;
  modalTextColor.disabled = !modalShowText.checked;

  modalBackgroundImage.disabled = modalBackgroundFavicon.checked || modalNoBackground.checked;
  modalShowFavicon.disabled = modalBackgroundFavicon.checked;

  modalInvertColorBg.disabled = modalBackgroundFavicon.checked;
}

modalBackgroundImage.addEventListener('input', updateStates);
modalNoBackground.addEventListener('change', updateStates);
modalShowText.addEventListener('change', updateStates);

modalBackgroundFavicon.addEventListener('change', () => {
  if (modalBackgroundFavicon.checked) {
    modalShowFavicon.checked = false;
    modalInvertColorBg.checked = false;
  }
  updateStates();
});

modalSave.addEventListener('click', async () => {
  if (!editingId) return;

  const updatedData = {
    name: modalName.value.trim(),
    url: modalUrl.value.trim(),
    invertColorIcon: modalInvertColorIcon.checked,
    invertColorBg: modalInvertColorBg.checked,
    noBackground: modalNoBackground.checked,
    textColor: modalTextColor.value,
    showText: modalShowText.checked,
    backgroundColor: modalBackgroundColor.value
  };

  if (modalBackgroundFavicon.checked) {
    updatedData.backgroundFavicon = true;
    updatedData.backgroundImageUrl = null;
    updatedData.showFavicon = false;
    updatedData.invertColorBg = false;
  } else {
    updatedData.backgroundFavicon = false;
    updatedData.backgroundImageUrl =
      modalBackgroundImage.value.trim() || null;
    updatedData.showFavicon = modalShowFavicon.checked;
  }

  const bookmark = await updateBookmarkById(editingId, updatedData);

  if (bookmark) {
    flashSuccess('flash.bookmark.updated');
    if (DEBUG) console.log('Bookmark updated: ', bookmark);
  }

  closeEditModal();
});

modalCancel.addEventListener('click', closeEditModal);

function closeEditModal() {
  editingId = null;
  closeModal();
}

/* =====================================
   Tabs Logic
===================================== */

const tabButtons = editModal.querySelectorAll('.edit-tab-btn');
const tabContents = editModal.querySelectorAll('.edit-tab-content');

function activateTab(tabId) {
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  tabContents.forEach(content => {
    const isActive = content.id === tabId;
    content.style.display = isActive ? 'flex' : 'none';
    if (isActive) content.scrollTop = 0;
  });
}

// Click listener
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    activateTab(btn.dataset.tab);
  });
});