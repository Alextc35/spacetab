import { createBookmark, addBookmark, getBookmarks, deleteBookmark, saveBookmarks } from '../core/bookmark.js';
import { pxToGrid, gridToPx, isAreaFree } from '../core/grid.js';
import { getFavicon, isDarkColor } from '../core/utils.js';
import { openModal } from './modal.js';
import { addDragAndResize } from './dragResize.js';
import { GRID_SIZE } from '../core/config.js';

export const container = document.getElementById('bookmark-container');
let editMode = false;

// ======================= Helpers de bookmark =======================
export async function handleAddBookmark() {
    const bookmarks = getBookmarks();
    const name = prompt("Nombre del favorito:");
    if (!name) return;
    const url = prompt("URL del favorito (incluye https://):");
    if (!url) return;

    const rect = container.getBoundingClientRect();
    let gx = 0;
    let gy = 0;

    const maxGy = pxToGrid(rect.height - GRID_SIZE);

    while (!isAreaFree(bookmarks, gx, gy, 1, 1)) {
        gy++;

        if (gy > maxGy) {
            gy = 0;
            gx++;
        }
    }

    const newBookmark = createBookmark({ name, url, x: gridToPx(gx), y: gridToPx(gy), w: 1, h: 1 });
    await addBookmark(newBookmark);
    renderBookmarks();
}

// ======================= Render bookmarks =======================
export function renderBookmarks() {
    const bookmarks = getBookmarks();
    container.innerHTML = '';
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    bookmarks.forEach((bookmark, index) => {
        bookmark.w ||= 1;
        bookmark.h ||= 1;

        const div = document.createElement('div');
        div.className = 'bookmark';
        div.style.cursor = editMode ? 'move' : 'pointer';

        // Fondo y color
        applyBookmarkStyle(div, bookmark);

        // Posición y tamaño
        const gx = pxToGrid(bookmark.x ?? 0);
        const gy = pxToGrid(bookmark.y ?? 0);
        div.style.width = (gridToPx(bookmark.w) - 20) + 'px';
        div.style.height = (gridToPx(bookmark.h) - 20) + 'px';
        div.style.left = gridToPx(gx) + 'px';
        div.style.top = gridToPx(gy) + 'px';

        // Contenido interno
        const linkEl = createBookmarkContent(bookmark);
        div.appendChild(linkEl);

        // Botones de edición si estamos en modo edit
        if (editMode) addEditButtons(div, bookmark, index);

        // Drag & Resize
        if (editMode) addDragAndResize(div, bookmark, index, containerWidth, containerHeight);

        // Click normal
        div.addEventListener('click', (e) => {
            if (!editMode && !e.target.classList.contains('edit') && !e.target.classList.contains('delete')) {
                if (e.ctrlKey || e.metaKey || e.button === 1) window.open(bookmark.url, '_blank');
                else window.location.href = bookmark.url;
            }
        });

        container.appendChild(div);
    });
}

// ======================= Helpers visuales =======================
function applyBookmarkStyle(div, bookmark) {
    if (bookmark.faviconBackground) {
        div.style.backgroundImage = 'none';
        div.style.backgroundColor = bookmark.bookmarkColor === 'transparent' ? 'transparent' : (bookmark.bookmarkColor || '#222');
    } else if (bookmark.backgroundImageUrl) {
        div.style.backgroundImage = `url(${bookmark.backgroundImageUrl})`;
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center';
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundColor = 'transparent';
    } else {
        div.style.backgroundImage = 'none';
        div.style.backgroundColor = bookmark.bookmarkColor || '#222';
    }
    div.style.color = bookmark.textColor || '#fff';
    div.classList.toggle('invert-bg', bookmark.invertColorBg);
}

function createBookmarkContent(bookmark) {
    const linkEl = document.createElement('a');
    linkEl.href = bookmark.url || '#';
    linkEl.style.display = 'flex';
    linkEl.style.flexDirection = 'column';
    linkEl.style.justifyContent = 'center';
    linkEl.style.alignItems = 'center';
    linkEl.style.width = '100%';
    linkEl.style.height = '100%';
    linkEl.style.textDecoration = 'none';
    linkEl.style.color = bookmark.textColor || '#fff';
    linkEl.style.cursor = editMode ? 'move' : 'pointer';

    if (bookmark.faviconBackground) {
        const img = document.createElement('img');
        img.src = getFavicon(bookmark.url);
        img.alt = bookmark.name || '';
        img.style.width = '60%';
        img.style.height = '60%';
        img.style.objectFit = 'contain';
        if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
        linkEl.appendChild(img);

        if (bookmark.showText) {
            const span = document.createElement('span');
            span.textContent = bookmark.name || '';
            span.style.marginTop = '6px';
            span.style.whiteSpace = 'nowrap';
            span.style.overflow = 'hidden';
            span.style.textOverflow = 'ellipsis';
            linkEl.appendChild(span);
        }
    } else {
        const infoBox = document.createElement('div');
        infoBox.style.position = 'absolute';
        infoBox.style.bottom = '6px';
        infoBox.style.right = '8px';
        infoBox.style.display = 'flex';
        infoBox.style.alignItems = 'center';
        infoBox.style.gap = '6px';
        infoBox.style.background = 'transparent';
        infoBox.style.padding = '0';
        infoBox.style.borderRadius = '0';

        if (bookmark.showFavicon ?? true) {
            const img = document.createElement('img');
            img.src = getFavicon(bookmark.url);
            img.alt = bookmark.name || '';
            img.style.width = '16px';
            img.style.height = '16px';
            if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
            infoBox.appendChild(img);
        }

        if (bookmark.showText ?? true) {
            const span = document.createElement('span');
            span.textContent = bookmark.name || '';
            span.style.fontSize = '0.85em';
            span.style.whiteSpace = 'nowrap';
            span.style.overflow = 'hidden';
            span.style.textOverflow = 'ellipsis';
            span.style.color = bookmark.textColor || '#fff';
            infoBox.appendChild(span);
        }
        linkEl.appendChild(infoBox);
    }

    return linkEl;
}

function addEditButtons(div, bookmark, index) {
    const darkBg = isDarkColor(bookmark.bookmarkColor || '#222');
    const bookmarks = getBookmarks();
    const editBtn = document.createElement('button');
    const delBtn = document.createElement('button');
    editBtn.className = 'edit';
    delBtn.className = 'delete';
    editBtn.textContent = '✎';
    delBtn.textContent = '🗑';
    editBtn.style.background = darkBg ? '#fff' : '#222';
    editBtn.style.color = darkBg ? '#000' : '#fff';
    delBtn.style.background = darkBg ? '#fff' : '#222';
    delBtn.style.color = darkBg ? '#000' : '#fff';

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(bookmarks, index); // modal seguirá en UI
    });

    delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar ${bookmark.name}?`)) {
            await deleteBookmark(index); // core se encarga de borrar
            renderBookmarks();
        }
    });

    [editBtn, delBtn].forEach(btn => {
        btn.style.position = 'absolute';
        btn.style.top = '5px';
        btn.style.width = '25px';
        btn.style.height = '25px';
        btn.style.borderRadius = '5px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
    });
    editBtn.style.right = '35px';
    delBtn.style.right = '5px';
    div.appendChild(editBtn);
    div.appendChild(delBtn);
}

export function setEditMode(value) {
    editMode = value;
}