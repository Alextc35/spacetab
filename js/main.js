import { storage } from './core/storage.js';
import { pxToGrid, gridToPx, isAreaFree } from './core/grid.js';
import { getFavicon, isDarkColor } from './core/utils.js';
import { initModal, openModal } from './ui/modal.js';

/* ======================= Variables globales ======================= */
const container = document.getElementById('bookmark-container');
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

let editMode = false; // iniciar en modo edición
const GRID_SIZE = 140;
let bookmarks = [];

initModal(bookmarks, renderBookmarks);

/* ======================= Alternar modo edición ======================= */
toggleButton.addEventListener('click', () => {
    editMode = !editMode;
    toggleButton.textContent = editMode ? "🔒" : "✎";
    gridOverlay.style.display = editMode ? 'block' : 'none';
    renderBookmarks();
});

/* ======================= Render bookmarks ======================= */
export function renderBookmarks() {
    container.innerHTML = '';
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    bookmarks.forEach((bookmark, index) => {
        bookmark.w = bookmark.w || 1;
        bookmark.h = bookmark.h || 1;

        const div = document.createElement('div');
        div.className = 'bookmark';
        div.style.cursor = editMode ? "move" : "pointer";

        // Fondo
        if (bookmark.faviconBackground) {
            div.style.backgroundImage = "none";
            div.style.backgroundColor = bookmark.bookmarkColor === "transparent" ? "transparent" : (bookmark.bookmarkColor || "#222");
        } else if (bookmark.backgroundImageUrl) {
            div.style.backgroundImage = `url(${bookmark.backgroundImageUrl})`;
            div.style.backgroundSize = "cover";
            div.style.backgroundPosition = "center";
            div.style.backgroundRepeat = "no-repeat";
            div.style.backgroundColor = "transparent";
        } else {
            div.style.backgroundImage = "none";
            div.style.backgroundColor = bookmark.bookmarkColor || "#222";
        }

        div.style.color = bookmark.textColor || "#fff";
        const darkBg = isDarkColor(bookmark.bookmarkColor || '#222');

        // Posición / tamaño
        const gx = pxToGrid(bookmark.x ?? 0);
        const gy = pxToGrid(bookmark.y ?? 0);
        div.style.width = (gridToPx(bookmark.w) - 20) + 'px';
        div.style.height = (gridToPx(bookmark.h) - 20) + 'px';
        div.style.left = gridToPx(gx) + 'px';
        div.style.top = gridToPx(gy) + 'px';

        // Contenido interno
        const linkEl = document.createElement('a');
        linkEl.href = bookmark.url || '#';
        linkEl.style.display = 'flex';
        linkEl.style.flexDirection = 'column';
        linkEl.style.justifyContent = 'center';
        linkEl.style.alignItems = 'center';
        linkEl.style.width = '100%';
        linkEl.style.height = '100%';
        linkEl.style.textDecoration = 'none';
        linkEl.style.color = div.style.color;
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

        div.appendChild(linkEl);

        /* ---------- Botones editar / eliminar ---------- */
        if (editMode) {
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

            editBtn.addEventListener('click', (e) => { e.stopPropagation(); openModal(bookmarks, index); });
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar ${bookmark.name}?`)) {
                    bookmarks.splice(index, 1);
                    await storage.set({ bookmarks });
                    renderBookmarks();
                }
            });

            // Estilos posición botones
            editBtn.style.position = delBtn.style.position = 'absolute';
            editBtn.style.top = delBtn.style.top = '5px';
            editBtn.style.width = delBtn.style.width = '25px';
            editBtn.style.height = delBtn.style.height = '25px';
            editBtn.style.borderRadius = delBtn.style.borderRadius = '5px';
            editBtn.style.border = delBtn.style.border = 'none';
            editBtn.style.cursor = delBtn.style.cursor = 'pointer';

            editBtn.style.right = '35px';
            delBtn.style.right = '5px';

            div.appendChild(editBtn);
            div.appendChild(delBtn);
        }

        container.appendChild(div);

        /* ---------- Dragging y Resizing ---------- */
        if (editMode) {
            addDragAndResize(div, bookmark, index, containerWidth, containerHeight);
        }

        /* ---------- Click normal ---------- */
        div.addEventListener('click', (e) => {
            if (!editMode && !e.target.classList.contains('edit') && !e.target.classList.contains('delete')) {
                e.preventDefault();
                if (e.ctrlKey || e.metaKey || e.button === 1) window.open(bookmark.url, '_blank');
                else window.location.href = bookmark.url;
            }
        });
    });
}

/* ======================= Drag & Resize helpers ======================= */
function addDragAndResize(div, bookmark, index, containerWidth, containerHeight) {
    let dragging = false;
    let origGX = pxToGrid(bookmark.x ?? 0), origGY = pxToGrid(bookmark.y ?? 0);
    let pointerOffsetX = 0, pointerOffsetY = 0;

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
        await storage.set({ bookmarks });
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
        await storage.set({ bookmarks });
        div.style.border = 'none';
        renderBookmarks();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

/* ======================= Añadir bookmark ======================= */
addButton.addEventListener('click', async () => {
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

    bookmarks.push({
        name,
        url,
        x: gridToPx(gx),
        y: gridToPx(gy),
        w: 1,
        h: 1,
        invertColors: false,
        bookmarkColor: "#cccccc",
        textColor: isDarkColor("#cccccc") ? "#fff" : "#000",
        showFavicon: true,
        showText: true
    });

    await storage.set({ bookmarks });
    renderBookmarks();
});

/* ======================= Cargar bookmarks inicial ======================= */
const data = await storage.get('bookmarks');
bookmarks = Array.isArray(data.bookmarks)
    ? data.bookmarks.map(b => ({ ...b, w: b.w || 1, h: b.h || 1 }))
    : [];
renderBookmarks();

/* ======================= Modal Configuración ======================= */
const settingsBtn = document.getElementById('settings');
const settingsModal = document.getElementById('settings-modal');
const settingsSave = document.getElementById('settings-save');
const settingsCancel = document.getElementById('settings-cancel');
const gridSizeInput = document.getElementById('grid-size');
const languageSelect = document.getElementById('language-select');

let SETTINGS = { gridSize: 140, language: "es" };

settingsBtn.addEventListener('click', () => {
    gridSizeInput.value = SETTINGS.gridSize;
    languageSelect.value = SETTINGS.language || "es";
    settingsModal.style.display = 'flex';
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
});

settingsCancel.addEventListener('click', () => { settingsModal.style.display = 'none'; });

settingsSave.addEventListener('click', () => {
    SETTINGS.gridSize = parseInt(gridSizeInput.value, 10) || 140;
    SETTINGS.language = languageSelect.value;
    settingsModal.style.display = 'none';
    chrome.storage.local.set({ settings: SETTINGS });
});

/* ---------- Tabs ---------- */
document.querySelectorAll("#settings-modal .tab-btn").forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll("#settings-modal .tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll("#settings-modal .tab-content").forEach(tab => tab.style.display = "none");
        const target = btn.dataset.tab;
        document.getElementById(target).style.display = "block";
    });
});

/* ---------- Cargar settings guardados ---------- */
chrome.storage.local.get('settings', (data) => {
    if (data.settings) SETTINGS = data.settings;
});

/* ======================= Background dinámico ======================= */
const bgColorInput = document.getElementById('background-color');
const bgImageInput = document.getElementById('background-image');
const resetBgBtn = document.getElementById('reset-background');

function updateColorState() {
    bgColorInput.disabled = bgImageInput.value.trim() !== "";
}

bgImageInput.addEventListener("input", updateColorState);

chrome.storage.local.get(['bgColor', 'bgImage'], (data) => {
    if (data.bgColor) bgColorInput.value = data.bgColor;
    if (data.bgImage) bgImageInput.value = data.bgImage;
    applyBackground(data.bgColor, data.bgImage);
});

function applyBackground(color, image) {
    if (image) {
        document.body.style.background = `url(${image}) no-repeat center center fixed`;
        document.body.style.backgroundSize = 'cover';
    } else if (color) {
        document.body.style.background = color;
    } else {
        document.body.style.background = '#333';
    }
}

bgColorInput.addEventListener('input', () => {
    const color = bgColorInput.value;
    chrome.storage.local.set({ bgColor: color, bgImage: '' });
    bgImageInput.value = '';
    applyBackground(color, '');
});

bgImageInput.addEventListener('change', () => {
    const image = bgImageInput.value.trim();
    chrome.storage.local.set({ bgImage: image });
    applyBackground('', image);
});

resetBgBtn.addEventListener('click', () => {
    chrome.storage.local.set({ bgColor: '', bgImage: '' });
    bgColorInput.value = '#333';
    bgImageInput.value = '';
    bgColorInput.disabled = false;
    applyBackground('', '');
});