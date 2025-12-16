import { saveBookmarks } from '../core/bookmark.js';
import { getBookmarks } from '../core/bookmark.js';

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
const modalBackgroundImage = document.getElementById("modal-background-image");
const modalFaviconBackground = document.getElementById('modal-favicon-background');

let bookmarks = [];
let editingIndex = null;
let renderBookmarks = () => {};

function updateInvertBgState() {
    const disabled = modalFaviconBackground.checked;

    modalInvertColorBg.disabled = disabled;
    modalInvertColorBg.parentElement.style.opacity = disabled ? '0.5' : '1';

    if (disabled) {
        modalInvertColorBg.checked = false;
    }
}

function updateFaviconBgState() {
    const hasImage = modalBackgroundImage.value.trim() !== "";

    modalFaviconBackground.disabled = hasImage;
    modalFaviconBackground.parentElement.style.opacity = hasImage ? '0.5' : '1';

    if (hasImage) {
        modalFaviconBackground.checked = false;
    }
}

function updateColorInputs() {
    const hasImage = modalBackgroundImage.value.trim() !== "";
    const noBackground = modalNoBackground.checked;
    const faviconBg = modalFaviconBackground.checked;

    modalBookmarkColor.disabled = hasImage || noBackground;
    modalNoBackground.disabled = hasImage && !faviconBg;
    modalTextColor.disabled = !modalShowText.checked;

    modalBookmarkColor.style.opacity = hasImage ? "0.5" : "1";
    modalNoBackground.parentElement.style.opacity = (hasImage && !faviconBg) ? "0.5" : "1";
}

modalBackgroundImage.addEventListener("input", () => {
    updateColorInputs();
    updateFaviconBgState();
});
modalNoBackground.addEventListener('change', updateColorInputs);
modalShowText.addEventListener('change', updateColorInputs);

modalFaviconBackground.addEventListener('change', () => {
    const checked = modalFaviconBackground.checked;
    modalBackgroundImage.disabled = checked;
    modalShowFavicon.disabled = checked;
    if (checked) {
        modalShowFavicon.checked = false;
        modalNoBackground.checked = true;
    }

    updateColorInputs();
    updateInvertBgState();
});

export function initBookmarkModal(onRender) {
    bookmarks = getBookmarks();
    renderBookmarks = onRender;
}

export function openModal(currentBookmarks, index) {
    bookmarks = currentBookmarks;
    if (index == null || !bookmarks[index]) return;
    editingIndex = index;

    const bookmark = bookmarks[index];

    modalName.value = bookmark.name || '';
    modalUrl.value = bookmark.url || '';
    modalInvertColorIcon.checked = !!bookmark.invertColorIcon;
    modalInvertColorBg.checked = !!bookmark.invertColorBg;
    modalBookmarkColor.value = bookmark.bookmarkColor || "#222222";
    modalNoBackground.checked = !bookmark.bookmarkColor || bookmark.bookmarkColor === "transparent";
    modalTextColor.value = bookmark.textColor || "#ffffff";
    modalShowFavicon.checked = bookmark.showFavicon ?? true;
    modalShowText.checked = bookmark.showText ?? true;
    modalBackgroundImage.value = bookmark.backgroundImageUrl || "";
    modalFaviconBackground.checked = !!bookmark.faviconBackground;

    modalBackgroundImage.disabled = modalFaviconBackground.checked;
    modalShowFavicon.disabled = modalFaviconBackground.checked;
    if (modalFaviconBackground.checked) modalShowFavicon.checked = false;
    modalBookmarkColor.disabled = modalNoBackground.checked;

    updateColorInputs();

    editModal.style.setProperty('display', 'flex', 'important');
    updateInvertBgState();
    updateFaviconBgState();
}

function closeModal() {
    editModal.style.display = 'none';
    editingIndex = null;
}

modalSave.addEventListener('click', async () => {
    if (editingIndex === null) return;

    const bookmark = bookmarks[editingIndex];

    bookmark.name = modalName.value.trim();
    bookmark.url = modalUrl.value.trim();
    bookmark.invertColorIcon = modalInvertColorIcon.checked;
    bookmark.invertColorBg = modalInvertColorBg.checked;
    bookmark.bookmarkColor = modalNoBackground.checked ? "transparent" : modalBookmarkColor.value;
    bookmark.textColor = modalTextColor.value;
    bookmark.showText = modalShowText.checked;

    if (modalFaviconBackground.checked) {
        bookmark.faviconBackground = true;
        bookmark.backgroundImageUrl = null;
        bookmark.showFavicon = false;
        bookmark.invertColorBg = false;
    } else {
        bookmark.faviconBackground = false;
        bookmark.backgroundImageUrl = modalBackgroundImage.value.trim() || null;
        bookmark.showFavicon = modalShowFavicon.checked;
    }

    await saveBookmarks(bookmarks);
    renderBookmarks();
    closeModal();
});

modalCancel.addEventListener('click', closeModal);