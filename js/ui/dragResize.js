import { getBookmarks, saveBookmarks, deleteBookmarkById } from '../core/bookmark.js';
import { isAreaFree } from '../core/grid.js';
import { DEBUG, PADDING } from '../core/config.js';
import { renderBookmarks, container } from './bookmarks.js';
import { getRowWidth, getRowHeight } from './gridLayout.js';
import { flashError, flashSuccess } from './flash.js';

export function addDragAndResize(div, bookmark, index, containerWidth, containerHeight) {
    let dragging = false;
    let pointerOffsetX = 0, pointerOffsetY = 0;
    const bookmarks = getBookmarks();

    div.addEventListener('pointerdown', async e => {
        if (e.button === 1) {
            e.preventDefault(); e.stopPropagation();
            if (confirm(`¿Eliminar ${bookmark.name}?`)) {
                const infoBookmark = await deleteBookmarkById(bookmark.id);
                if (infoBookmark) {
                    flashSuccess('flash.bookmark.deleted');
                    if (DEBUG) console.log('Bookmark deleted with id:', bookmark.id);
                } else if (DEBUG) {
                    console.warn('Bookmark not found for id:', bookmark.id);
                    flashError('flash.bookmark.notFound');
                }
                renderBookmarks();
            }
            return;
        }

        if (e.target.classList.contains('edit') || e.target.classList.contains('delete')) return;

        e.preventDefault();
        dragging = true;
        div.classList.add('is-dragging');

        pointerOffsetX = e.clientX - div.offsetLeft;
        pointerOffsetY = e.clientY - div.offsetTop;

        div.setPointerCapture(e.pointerId);
        div.style.zIndex = 9999;
    });

    div.addEventListener('pointermove', (e) => {
        if (!dragging) return;

        const rowWidth = getRowWidth();
        const rowHeight = getRowHeight();

        let newLeftPx = e.clientX - pointerOffsetX;
        let newTopPx = e.clientY - pointerOffsetY;

        newLeftPx = Math.max(0, Math.min(newLeftPx, containerWidth - bookmark.w * rowWidth));
        newTopPx = Math.max(0, Math.min(newTopPx, containerHeight - bookmark.h * rowHeight));

        // Snap a la grilla
        const snappedGX = Math.round(newLeftPx / rowWidth);
        const snappedGY = Math.round(newTopPx / rowHeight);

        if (isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index)) {
            applyPosition(div, snappedGX, snappedGY, rowWidth, rowHeight);
            div.classList.remove('is-invalid');
        } else {
            div.classList.add('is-invalid');
        }
    });

    div.addEventListener('pointerup', async (e) => {
        if (!dragging) return;

        dragging = false;
        div.classList.remove('is-dragging', 'is-invalid');
        div.releasePointerCapture(e.pointerId);
        div.style.zIndex = '';

        const rowWidth = getRowWidth();
        const rowHeight = getRowHeight();
        const maxGY = Math.floor(containerHeight / rowHeight) - bookmark.h;
        const maxGX = Math.floor(containerWidth / rowWidth) - bookmark.w;

        let snappedGX = Math.round(div.offsetLeft / rowWidth);
        let snappedGY = Math.round(div.offsetTop / rowHeight);

        snappedGX = Math.min(Math.max(snappedGX, 0), maxGX);
        snappedGY = Math.min(Math.max(snappedGY, 0), maxGY);

        while (!isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index) && snappedGX > 0) snappedGX--;
        while (!isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index) && snappedGY > 0) snappedGY--;

        bookmark.gx = snappedGX;
        bookmark.gy = snappedGY;

        await saveBookmarks();
        renderBookmarks();
    });

    ['top', 'right', 'bottom', 'left'].forEach(side => {
        const resizer = document.createElement('div');
        resizer.className = `resizer ${side}`;
        div.appendChild(resizer);

        resizer.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); e.preventDefault();
            handleResize(e, div, bookmark, index, side, containerWidth, containerHeight);
        });
    });
}

function handleResize(e, div, bookmark, index, side, containerWidth, containerHeight) {
    let resizing = true;
    div.classList.add('is-resizing');

    const origGX = bookmark.gx;
    const origGY = bookmark.gy;
    const origW = bookmark.w;
    const origH = bookmark.h;
    const bookmarks = getBookmarks();
    const rowWidth = getRowWidth();
    const rowHeight = getRowHeight();

    let resizeCandidateGX = origGX;
    let resizeCandidateGY = origGY;
    let resizeCandidateW = origW;
    let resizeCandidateH = origH;

    const onMove = (ev) => {
        if (!resizing) return;
        const rect = container.getBoundingClientRect();
        const localX = ev.clientX - rect.left;
        const localY = ev.clientY - rect.top;

        let newGX = origGX, newGY = origGY, newW = origW, newH = origH;

        if (side === 'right') {
            newW = Math.max(1, Math.round((localX / rowWidth) - origGX));
            while (!isAreaFree(bookmarks, origGX, origGY, newW, origH, index) && newW > 1) newW--;
        } else if (side === 'bottom') {
            newH = Math.max(1, Math.round((localY / rowHeight) - origGY));
            while (!isAreaFree(bookmarks, origGX, origGY, origW, newH, index) && newH > 1) newH--;
        } else if (side === 'left') {
            let deltaW = origGX - Math.round(localX / rowWidth);
            if (deltaW > 0) while (!isAreaFree(bookmarks, origGX - deltaW, origGY, origW + deltaW, origH, index) && deltaW > 0) deltaW--;
            else if (deltaW < 0) deltaW = Math.max(deltaW, -(origW - 1));
            newGX = origGX - deltaW;
            newW = origW + deltaW;
        } else if (side === 'top') {
            let deltaH = origGY - Math.round(localY / rowHeight);
            if (deltaH > 0) while (!isAreaFree(bookmarks, origGX, origGY - deltaH, origW, origH + deltaH, index) && deltaH > 0) deltaH--;
            else if (deltaH < 0) deltaH = Math.max(deltaH, -(origH - 1));
            newGY = origGY - deltaH;
            newH = origH + deltaH;
        }

        // ajustes contenedor
        if (newGX < 0) { newW += newGX; newGX = 0; }
        if (newGY < 0) { newH += newGY; newGY = 0; }
        if ((newGX + newW) * rowWidth > containerWidth) newW = Math.floor(containerWidth / rowWidth) - newGX;
        if ((newGY + newH) * rowHeight > containerHeight) newH = Math.floor(containerHeight / rowHeight) - newGY;

        resizeCandidateGX = newGX;
        resizeCandidateGY = newGY;
        resizeCandidateW = newW;
        resizeCandidateH = newH;

        applyPosition(div, newGX, newGY, rowWidth);
        div.style.width = newW * rowWidth - PADDING + 'px';
        div.style.height = newH * rowWidth - PADDING + 'px';
    };

    const onUp = async () => {
        if (!resizing) return;
        resizing = false;

        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        div.classList.remove('is-resizing');

        bookmark.gx = resizeCandidateGX;
        bookmark.gy = resizeCandidateGY;
        bookmark.w = resizeCandidateW;
        bookmark.h = resizeCandidateH;

        await saveBookmarks();
        renderBookmarks();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

function applyPosition(div, gx, gy, rowWidth, rowHeight) {
    div.style.left = gx * rowWidth + 'px';
    div.style.top = gy * rowHeight + 'px';
}