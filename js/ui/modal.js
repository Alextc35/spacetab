// modal.js
import { storage } from '../core/storage.js';
import { getBookmarks } from '../core/bookmark.js';

/* ======================= Modal de edición ======================= */
const editModal = document.getElementById('edit-modal');
const modalName = document.getElementById('modal-name');
const modalUrl = document.getElementById('modal-url');
const modalInvertColors = document.getElementById('modal-invert-colors');
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

/* ---------- Helpers colores / inputs ---------- */
function updateColorInputs() {
    const hasImage = modalBackgroundImage.value.trim() !== "";
    const noBackground = modalNoBackground.checked;

    modalBookmarkColor.disabled = hasImage || noBackground;
    modalNoBackground.disabled = hasImage;
    modalTextColor.disabled = !modalShowText.checked;

    modalBookmarkColor.style.opacity = hasImage ? "0.5" : "1";
    modalNoBackground.parentElement.style.opacity = hasImage ? "0.5" : "1";
}

modalBackgroundImage.addEventListener("input", updateColorInputs);
modalNoBackground.addEventListener('change', updateColorInputs);
modalShowText.addEventListener('change', updateColorInputs);

/* ---------- Modal Favicon background handler ---------- */
modalFaviconBackground.addEventListener('change', () => {
    const checked = modalFaviconBackground.checked;
    modalBackgroundImage.disabled = checked;
    modalShowFavicon.disabled = checked;
    if (checked) modalShowFavicon.checked = false;
    updateColorInputs();
});

/* ======================= API del modal ======================= */
export function initBookmarkModal(onRender) {
    bookmarks = getBookmarks();
    renderBookmarks = onRender;
}

/* ---------- Abrir / cerrar modal ---------- */
export function openModal(currentBookmarks, index) {
    bookmarks = currentBookmarks;
    if (index == null || !bookmarks[index]) return;
    editingIndex = index;

    const bookmark = bookmarks[index];

    // Valores básicos
    modalName.value = bookmark.name || '';
    modalUrl.value = bookmark.url || '';
    modalInvertColors.checked = !!bookmark.invertColors;
    modalBookmarkColor.value = bookmark.bookmarkColor || "#222222";
    modalNoBackground.checked = bookmark.bookmarkColor === "transparent";
    modalTextColor.value = bookmark.textColor || "#ffffff";
    modalShowFavicon.checked = bookmark.showFavicon ?? true;
    modalShowText.checked = bookmark.showText ?? true;
    modalBackgroundImage.value = bookmark.backgroundImageUrl || "";
    modalFaviconBackground.checked = !!bookmark.faviconBackground;

    // Ajustes de inputs según modo
    modalBackgroundImage.disabled = modalFaviconBackground.checked;
    modalShowFavicon.disabled = modalFaviconBackground.checked;
    if (modalFaviconBackground.checked) modalShowFavicon.checked = false;
    modalBookmarkColor.disabled = modalNoBackground.checked;

    updateColorInputs();

    editModal.style.setProperty('display', 'flex', 'important');
}

function closeModal() {
    editModal.style.display = 'none';
    editingIndex = null;
}

/* ---------- Guardar cambios modal ---------- */
modalSave.addEventListener('click', async () => {
    if (editingIndex === null) return;

    const bookmark = bookmarks[editingIndex];

    bookmark.name = modalName.value.trim();
    bookmark.url = modalUrl.value.trim();
    bookmark.invertColors = modalInvertColors.checked;
    bookmark.bookmarkColor = modalNoBackground.checked ? "transparent" : modalBookmarkColor.value;
    bookmark.textColor = modalTextColor.value;
    bookmark.showText = modalShowText.checked;

    if (modalFaviconBackground.checked) {
        bookmark.faviconBackground = true;
        bookmark.backgroundImageUrl = null;
        bookmark.showFavicon = false;
    } else {
        bookmark.faviconBackground = false;
        bookmark.backgroundImageUrl = modalBackgroundImage.value.trim() || null;
        bookmark.showFavicon = modalShowFavicon.checked;
    }

    await storage.set({ bookmarks });
    renderBookmarks();
    closeModal();
});

modalCancel.addEventListener('click', closeModal);