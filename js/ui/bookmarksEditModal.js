import { getBookmarks, updateBookmarkById } from '../core/bookmark.js';
import { flashSuccess, flashError } from '../ui/flash.js';
import { DEBUG } from '../core/config.js';

const editModal = document.getElementById('edit-modal');
const modalName = document.getElementById('modal-name');
const modalUrl = document.getElementById('modal-url');
const modalInvertColorIcon = document.getElementById('modal-invert-color-icon');
const modalInvertColorBg = document.getElementById('modal-invert-color-bg');
const modalSave = document.getElementById('modal-save');
const modalCancel = document.getElementById('modal-cancel');
const modalBookmarkColor = document.getElementById('modal-bookmark-color');
const modalNoBackground = document.getElementById('modal-no-background');
const modalTextColor = document.getElementById('modal-text-color');
const modalShowFavicon = document.getElementById('modal-show-favicon');
const modalShowText = document.getElementById('modal-show-text');
const modalBackgroundImage = document.getElementById('modal-background-image');
const modalFaviconBackground = document.getElementById('modal-favicon-background');

let editingId = null;
let renderBookmarks = () => {};

export function initBookmarkModal(onRender) {
  renderBookmarks = onRender;
}

export function openModal(bookmarkId) {
  const bookmark = getBookmarks().find(b => b.id === bookmarkId);
  if (!bookmark) return;

  editingId = bookmarkId;

  modalName.value = bookmark.name;
  modalUrl.value = bookmark.url;
  modalInvertColorIcon.checked = !!bookmark.invertColorIcon;
  modalInvertColorBg.checked = !!bookmark.invertColorBg;
  modalBookmarkColor.value = bookmark.bookmarkColor;
  modalNoBackground.checked = !!bookmark.noBackground;
  modalTextColor.value = bookmark.textColor;
  modalShowText.checked = !!bookmark.showText;
  modalShowFavicon.checked = !!bookmark.showFavicon;
  modalBackgroundImage.value = bookmark.backgroundImageUrl || '';
  modalFaviconBackground.checked = !!bookmark.faviconBackground;

  updateStates();

  editModal.style.display = 'flex';
}

/* ---------- helpers ---------- */

function updateStates() {
  const hasImage = modalBackgroundImage.value.trim() !== '';

  modalBookmarkColor.disabled = hasImage || modalNoBackground.checked;
  modalNoBackground.disabled = hasImage && !modalFaviconBackground.checked;
  modalTextColor.disabled = !modalShowText.checked;

  modalBackgroundImage.disabled = modalFaviconBackground.checked;
  modalShowFavicon.disabled = modalFaviconBackground.checked;

  modalInvertColorBg.disabled = modalFaviconBackground.checked;
}

/* ---------- events ---------- */

modalBackgroundImage.addEventListener('input', updateStates);
modalNoBackground.addEventListener('change', updateStates);
modalShowText.addEventListener('change', updateStates);

modalFaviconBackground.addEventListener('change', () => {
  if (modalFaviconBackground.checked) {
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
    bookmarkColor: modalBookmarkColor.value
  };

  if (modalFaviconBackground.checked) {
    updatedData.faviconBackground = true;
    updatedData.backgroundImageUrl = null;
    updatedData.showFavicon = false;
    updatedData.invertColorBg = false;
  } else {
    updatedData.faviconBackground = false;
    updatedData.backgroundImageUrl =
      modalBackgroundImage.value.trim() || null;
    updatedData.showFavicon = modalShowFavicon.checked;
  }

  const bookmark = await updateBookmarkById(editingId, updatedData);

  flashSuccess('flash.bookmark.updated');
  if (DEBUG) console.log('Bookmark updated ', bookmark);

  renderBookmarks();
  closeModal();
});

modalCancel.addEventListener('click', closeModal);

function closeModal() {
  editModal.style.display = 'none';
  editingId = null;
}