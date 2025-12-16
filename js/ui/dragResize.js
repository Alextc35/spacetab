import { getBookmarks, saveBookmarks } from '../core/bookmark.js';
import { pxToGrid, gridToPx, isAreaFree } from '../core/grid.js';
import { GRID_SIZE, PADDING } from '../core/config.js';
import { renderBookmarks, container } from './bookmarks.js';

export function addDragAndResize(div, bookmark, index, containerWidth, containerHeight) {
    let dragging = false;
    let origGX = pxToGrid(bookmark.x ?? 0), origGY = pxToGrid(bookmark.y ?? 0);
    let pointerOffsetX = 0, pointerOffsetY = 0;
    const bookmarks = getBookmarks();

    div.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('edit') || e.target.classList.contains('delete')) return;

        e.preventDefault();
        dragging = true;

        div.classList.add('is-dragging');

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
            applyPosition(div, snappedGX, snappedGY);
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

        let snappedGX = pxToGrid(div.offsetLeft);
        let snappedGY = pxToGrid(div.offsetTop);

        while (!isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index) && snappedGX > 0) snappedGX--;
        while (!isAreaFree(bookmarks, snappedGX, snappedGY, bookmark.w, bookmark.h, index) && snappedGY > 0) snappedGY--;

        bookmark.x = gridToPx(snappedGX);
        bookmark.y = gridToPx(snappedGY);

        await saveBookmarks();
        renderBookmarks();
    });

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

function handleResize(e, div, bookmark, index, side, containerWidth, containerHeight) {
    let resizing = true;
    div.classList.add('is-resizing');
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

        if (newGX < 0) { newW += newGX; newGX = 0; }
        if (newGY < 0) { newH += newGY; newGY = 0; }
        if (newGX + newW > Math.floor(containerWidth / GRID_SIZE)) newW = Math.floor(containerWidth / GRID_SIZE) - newGX;
        if (newGY + newH > Math.floor(containerHeight / GRID_SIZE)) newH = Math.floor(containerHeight / GRID_SIZE) - newGY;

        resizeCandidateGX = newGX;
        resizeCandidateGY = newGY;
        resizeCandidateW = newW;
        resizeCandidateH = newH;

        applyPosition(div, newGX, newGY);
        div.style.width = (gridToPx(newW) - PADDING) + 'px';
        div.style.height = (gridToPx(newH) - PADDING) + 'px';
    };

    const onUp = async () => {
        if (!resizing) return;
        resizing = false;

        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        div.classList.remove('is-resizing');

        bookmark.x = gridToPx(resizeCandidateGX);
        bookmark.y = gridToPx(resizeCandidateGY);
        bookmark.w = resizeCandidateW;
        bookmark.h = resizeCandidateH;

        await saveBookmarks();
        renderBookmarks();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

function applyPosition(div, gx, gy) {
    div.style.left = gridToPx(gx) + 'px';
    div.style.top = gridToPx(gy) + 'px';
}