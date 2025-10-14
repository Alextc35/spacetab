import { createBookmark, addBookmark, getBookmarks, deleteBookmark, saveBookmarks } from '../core/bookmark.js';
import { pxToGrid, gridToPx, isAreaFree } from '../core/grid.js';
import { getFavicon, isDarkColor } from '../core/utils.js';
import { openModal } from './modal.js';

export const container = document.getElementById('bookmark-container');
export const GRID_SIZE = 140;
let editMode = false;

// ======================= Helpers de bookmark =======================
export async function handleAddBookmark() {
    const bookmarks = getBookmarks();
    const name = prompt("Nombre del favorito:");
    if (!name) return;
    const url = prompt("URL del favorito (incluye https://):");
    if (!url) return;

    const rect = container.getBoundingClientRect();
    let gx = pxToGrid(rect.width / 2);
    let gy = pxToGrid(rect.height / 2);

    while (!isAreaFree(bookmarks, gx, gy, 1, 1)) {
        gx++;
        if (gx * GRID_SIZE > rect.width - GRID_SIZE) { gx = 0; gy++; }
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
        if (bookmark.invertColors) img.style.filter = 'invert(1)';
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
            if (bookmark.invertColors) img.style.filter = 'invert(1)';
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

/* ======================= Drag & Resize helpers ======================= */
function addDragAndResize(div, bookmark, index, containerWidth, containerHeight) {
    let dragging = false;
    let origGX = pxToGrid(bookmark.x ?? 0), origGY = pxToGrid(bookmark.y ?? 0);
    let pointerOffsetX = 0, pointerOffsetY = 0;
    const bookmarks = getBookmarks();

    // ---------- Drag ----------
    div.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('edit') || e.target.classList.contains('delete')) return;
        e.preventDefault();
        dragging = true;
        pointerOffsetX = e.clientX - div.offsetLeft;
        pointerOffsetY = e.clientY - div.offsetTop;
        origGX = pxToGrid(div.offsetLeft);
        origGY = pxToGrid(div.offsetTop);
        div.setPointerCapture(e.pointerId);
        div.style.zIndex = 9999;
    });

    div.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        let newLeftPx = e.clientX - pointerOffsetX;
        let newTopPx = e.clientY - pointerOffsetY;

        newLeftPx = Math.max(0, Math.min(newLeftPx, containerWidth - gridToPx(bookmark.w)));
        newTopPx = Math.max(0, Math.min(newTopPx, containerHeight - gridToPx(bookmark.h)));

        const snappedGX = pxToGrid(newLeftPx);
        const snappedGY = pxToGrid(newTopPx);

        if (isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index)) {
            div.style.left = gridToPx(snappedGX) + 'px';
            div.style.top = gridToPx(snappedGY) + 'px';
            div.style.opacity = "1";
            div.style.border = "none";
        } else {
            div.style.opacity = "0.5";
            div.style.border = "1px solid red";
        }
    });

    div.addEventListener('pointerup', async (e) => {
        if (!dragging) return;
        dragging = false;
        div.releasePointerCapture(e.pointerId);

        let snappedGX = pxToGrid(div.offsetLeft);
        let snappedGY = pxToGrid(div.offsetTop);
        while (!isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index) && snappedGX > 0) snappedGX--;
        while (!isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index) && snappedGY > 0) snappedGY--;

        bookmark.x = gridToPx(snappedGX);
        bookmark.y = gridToPx(snappedGY);
        await saveBookmarks();
        renderBookmarks();
    });

    // ---------- Resizers ----------
    ['top', 'right', 'bottom', 'left'].forEach(side => {
        const resizer = document.createElement('div');
        resizer.className = `resizer ${side}`;
        div.appendChild(resizer);

        resizer.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleResize(e, div, bookmark, index, side, containerWidth, containerHeight);
        });
    });
}

/* ---------- Handler de resize ---------- */
function handleResize(e, div, bookmark, index, side, containerWidth, containerHeight) {
    let resizing = true;
    const origW = bookmark.w, origH = bookmark.h;
    const origGX = pxToGrid(div.offsetLeft), origGY = pxToGrid(div.offsetTop);
    let resizeCandidateGX = origGX, resizeCandidateGY = origGY;
    let resizeCandidateW = origW, resizeCandidateH = origH;
    const bookmarks = getBookmarks();

    const onMove = (ev) => {
        if (!resizing) return;
        const rect = container.getBoundingClientRect();
        const localX = ev.clientX - rect.left;
        const localY = ev.clientY - rect.top;

        let newGX = origGX, newGY = origGY, newW = origW, newH = origH;

        // Ajustes según lado
        if (side === 'right') {
            newW = Math.max(1, Math.ceil((localX - origGX * GRID_SIZE) / GRID_SIZE));
            while (!isAreaFree(bookmarks, origGX, origGY, newW, origH, index) && newW > 1) newW--;
        } else if (side === 'bottom') {
            newH = Math.max(1, Math.ceil((localY - origGY * GRID_SIZE) / GRID_SIZE));
            while (!isAreaFree(bookmarks, origGX, origGY, origW, newH, index) && newH > 1) newH--;
        } else if (side === 'left') {
            let candidateGX = Math.floor(localX / GRID_SIZE);
            let deltaW = origGX - candidateGX;
            if (deltaW > 0) while (!isAreaFree(bookmarks, origGX - deltaW, origGY, origW + deltaW, origH, index) && deltaW > 0) deltaW--;
            else if (deltaW < 0) deltaW = Math.max(deltaW, -(origW - 1));
            newGX = origGX - deltaW;
            newW = origW + deltaW;
        } else if (side === 'top') {
            let candidateGY = Math.floor(localY / GRID_SIZE);
            let deltaH = origGY - candidateGY;
            if (deltaH > 0) while (!isAreaFree(bookmarks, origGX, origGY - deltaH, origW, origH + deltaH, index) && deltaH > 0) deltaH--;
            else if (deltaH < 0) deltaH = Math.max(deltaH, -(origH - 1));
            newGY = origGY - deltaH;
            newH = origH + deltaH;
        }

        // Clamp
        if (newGX < 0) { newW += newGX; newGX = 0; }
        if (newGY < 0) { newH += newGY; newGY = 0; }
        if (newGX + newW > Math.floor(containerWidth / GRID_SIZE)) newW = Math.floor(containerWidth / GRID_SIZE) - newGX;
        if (newGY + newH > Math.floor(containerHeight / GRID_SIZE)) newH = Math.floor(containerHeight / GRID_SIZE) - newGY;

        resizeCandidateGX = newGX;
        resizeCandidateGY = newGY;
        resizeCandidateW = newW;
        resizeCandidateH = newH;

        div.style.left = gridToPx(newGX) + 'px';
        div.style.top = gridToPx(newGY) + 'px';
        div.style.width = (gridToPx(newW) - 20) + 'px';
        div.style.height = (gridToPx(newH) - 20) + 'px';
        div.style.border = "1px solid coral";
    };

    const onUp = async () => {
        if (!resizing) return;
        resizing = false;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        bookmark.x = gridToPx(resizeCandidateGX);
        bookmark.y = gridToPx(resizeCandidateGY);
        bookmark.w = resizeCandidateW;
        bookmark.h = resizeCandidateH;
        await saveBookmarks();
        div.style.border = 'none';
        renderBookmarks();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

export function setEditMode(value) {
    editMode = value;
}