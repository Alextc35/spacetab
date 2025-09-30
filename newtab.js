const container = document.getElementById('bookmark-container');
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

let editMode = false; // iniciar en modo edición
const GRID_SIZE = 140;
let bookmarks = [];

// Modal
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
let editingIndex = null;

// Modal abrir/cerrar
function openModal(index) {
    if (index == null || !bookmarks[index]) return;
    editingIndex = index;
    modalName.value = bookmarks[index].name;
    modalUrl.value = bookmarks[index].url;
    modalInvertColors.checked = !!bookmarks[index].invertColors;
    modalBookmarkColor.value = bookmarks[index].bookmarkColor || "#222222";
    modalNoBackground.checked = bookmarks[index].bookmarkColor === "transparent";
    modalTextColor.value = bookmarks[index].textColor || "#ffffff";
    modalShowFavicon.checked = bookmarks[index].showFavicon ?? true;
    modalShowText.checked = bookmarks[index].showText ?? true;
    updateColorInputs();
    editModal.style.display = 'flex';
}
function closeModal() {
    editModal.style.display = 'none';
    editingIndex = null;
}

// Guardar cambios del modal
modalSave.addEventListener('click', () => {
    if (editingIndex === null) return;
    bookmarks[editingIndex].name = modalName.value;
    bookmarks[editingIndex].url = modalUrl.value;
    bookmarks[editingIndex].invertColors = modalInvertColors.checked;
    bookmarks[editingIndex].bookmarkColor = modalNoBackground.checked ? "transparent" : modalBookmarkColor.value;
    bookmarks[editingIndex].textColor = modalTextColor.value;
    bookmarks[editingIndex].showFavicon = modalShowFavicon.checked;
    bookmarks[editingIndex].showText = modalShowText.checked;
    chrome.storage.local.set({ bookmarks });
    renderBookmarks();
    closeModal();
});
modalCancel.addEventListener('click', closeModal);

// Función para detectar si un color hexadecimal es oscuro
function isDarkColor(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
    return luminance < 64; // umbral: 64
}

function updateColorInputs() {
    // Deshabilitar input de color de fondo si "Sin fondo" está marcado
    modalBookmarkColor.disabled = modalNoBackground.checked;

    // Deshabilitar input de color de texto si "Mostrar texto" está marcado
    modalTextColor.disabled = !modalShowText.checked; // deshabilitado si no mostrar
}
modalNoBackground.addEventListener('change', updateColorInputs);
modalShowText.addEventListener('change', updateColorInputs);

/* ------------- Helpers de rejilla / colisión ------------- */
function pxToGrid(px) {
    return Math.round(px / GRID_SIZE);
}
function gridToPx(g) {
    return g * GRID_SIZE;
}
function getGridRectFromBookmark(bm) {
    const gx = pxToGrid(bm.x ?? 0);
    const gy = pxToGrid(bm.y ?? 0);
    const w = bm.w || 1;
    const h = bm.h || 1;
    return { gx, gy, w, h };
}

// Devuelve true si el área (gx,gy,w,h) está libre (no colisiona con otros)
// ignoreIndex: índice del bookmark que estamos moviendo/redimensionando
function isAreaFree(gx, gy, w, h, ignoreIndex = -1) {
    for (let i = 0; i < bookmarks.length; i++) {
        if (i === ignoreIndex) continue;
        const bm = bookmarks[i];
        if (bm.x == null || bm.y == null) continue;
        const other = getGridRectFromBookmark(bm);
        // Si NO se cumple ninguna de las condiciones de separación => hay intersección
        const separated =
            gx + w <= other.gx ||
            other.gx + other.w <= gx ||
            gy + h <= other.gy ||
            other.gy + other.h <= gy;
        if (!separated) return false;
    }
    return true;
}

// --- Obtener favicon ---
function getFavicon(url) {
    try {
        const u = new URL(url);
        const origin = u.origin; // solo el dominio principal
        return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=64`;
    } catch {
        // fallback si la URL es inválida
        return 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
    }
}


// Alternar modo editar
toggleButton.addEventListener('click', () => {
    editMode = !editMode;
    toggleButton.textContent = editMode ? "🔒" : "✎";
    gridOverlay.style.display = editMode ? 'block' : 'none';
    renderBookmarks();
});

// Render bookmarks
function renderBookmarks() {
    container.innerHTML = '';
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    bookmarks.forEach((bookmark, index) => {
        // asegurar w/h por si faltan
        bookmark.w = bookmark.w || 1;
        bookmark.h = bookmark.h || 1;

        const div = document.createElement('div');
        div.className = 'bookmark';
        div.style.cursor = editMode ? "move" : "pointer";
        div.style.backgroundColor = bookmark.bookmarkColor || "#222";
        div.style.color = bookmark.textColor || "#fff";

        // Determinar si el fondo es oscuro desde el principio
        const darkBg = isDarkColor(bookmark.bookmarkColor || '#222');

        // grid rect del bookmark
        const gx = pxToGrid(bookmark.x ?? 0);
        const gy = pxToGrid(bookmark.y ?? 0);

        // tamaño/pixel basado en rejilla
        div.style.width = (gridToPx(bookmark.w) - 20) + 'px';
        div.style.height = (gridToPx(bookmark.h) - 20) + 'px';
        div.style.left = gridToPx(gx) + 'px';
        div.style.top = gridToPx(gy) + 'px';

        div.innerHTML = `
            <a href="${bookmark.url}">
                <img src="${getFavicon(bookmark.url)}"
                     alt="${bookmark.name}"
                     style="${bookmark.invertColors?'filter:invert(1);':''}">
                <span>${bookmark.name}</span>
            </a>
            ${editMode ? `
                <button class="edit" style="
                    background: ${darkBg ? '#fff' : '#222'};
                    color: ${darkBg ? '#000' : '#fff'};
                ">✎</button>
                <button class="delete" style="
                    background: ${darkBg ? '#fff' : '#222'};
                    color: ${darkBg ? '#000' : '#fff'};
                ">🗑</button>
            ` : ''}
        `;

        const linkEl = div.querySelector('a');
        const imgEl = div.querySelector("a img");
        const spanEl = div.querySelector("a span");

        linkEl.style.cursor = editMode ? 'move' : 'pointer';
        linkEl.style.color = bookmark.textColor || "#fff";
        imgEl.style.display = (bookmark.showFavicon ?? true) ? "inline-block" : "none";
        spanEl.style.display = (bookmark.showText ?? true) ? "inline-block" : "none";

        if (editMode) {
            // --- Dragging ---
            let dragging = false;
            let origGX = gx, origGY = gy;
            let candidateGX = origGX, candidateGY = origGY;
            let pointerOffsetX = 0, pointerOffsetY = 0;
            let candidateValid = true;

            div.addEventListener('pointerdown', (e) => {
                if (e.target.classList.contains('edit') || e.target.classList.contains('delete')) return;
                e.preventDefault();
                dragging = true;
                pointerOffsetX = e.clientX - div.offsetLeft;
                pointerOffsetY = e.clientY - div.offsetTop;
                origGX = pxToGrid(div.offsetLeft);
                origGY = pxToGrid(div.offsetTop);
                candidateGX = origGX;
                candidateGY = origGY;
                div.setPointerCapture(e.pointerId);
                div.style.zIndex = 9999;
            });

            div.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                let newLeftPx = e.clientX - pointerOffsetX;
                let newTopPx = e.clientY - pointerOffsetY;
                // Clamp por limites del contenedor teniendo en cuenta tamaño en px
                const maxLeftPx = Math.max(0, containerWidth - gridToPx(bookmark.w));
                const maxTopPx = Math.max(0, containerHeight - gridToPx(bookmark.h));
                newLeftPx = Math.max(0, Math.min(newLeftPx, maxLeftPx));
                newTopPx = Math.max(0, Math.min(newTopPx, maxTopPx));

                const snappedGX = pxToGrid(newLeftPx);
                const snappedGY = pxToGrid(newTopPx);
                // 👇 usar siempre el tamaño actual del bookmark
                const currentW = bookmark.w || 1;
                const currentH = bookmark.h || 1;

                // comprobar colisión (con width/height actuales)
                if (isAreaFree(snappedGX, snappedGY, currentW, currentH, index)) {
                    candidateValid = true;
                    candidateGX = snappedGX;
                    candidateGY = snappedGY;
                    div.style.left = gridToPx(snappedGX) + 'px';
                    div.style.top  = gridToPx(snappedGY) + 'px';
                    div.style.opacity = "1";
                    div.style.border = "none";
                } else {
                    candidateValid = false;
                    div.style.opacity = "0.5";
                    div.style.border = "2px solid red";
                }
            });

            div.addEventListener('pointerup', (e) => {
                if (!dragging) return;
                dragging = false;
                div.releasePointerCapture(e.pointerId);

                // Siempre guardar la posición más cercana válida
                const snappedGX = pxToGrid(div.offsetLeft);
                const snappedGY = pxToGrid(div.offsetTop);
                let finalGX = snappedGX;
                let finalGY = snappedGY;

                // Ajustar si colisiona
                while (!isAreaFree(finalGX, finalGY, bookmark.w, bookmark.h, index) && finalGX > 0) finalGX--;
                while (!isAreaFree(finalGX, finalGY, bookmark.w, bookmark.h, index) && finalGY > 0) finalGY--;

                bookmark.x = gridToPx(finalGX);
                bookmark.y = gridToPx(finalGY);

                chrome.storage.local.set({ bookmarks });
                renderBookmarks();
            });

            // --- Edit / Delete ---
            const editBtn = div.querySelector('.edit');
            const delBtn = div.querySelector('.delete');
            if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openModal(index); });
            if (delBtn) delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar ${bookmark.name}?`)) {
                    bookmarks.splice(index, 1);
                    chrome.storage.local.set({ bookmarks });
                    renderBookmarks();
                }
            });

            // --- Resizers en los 4 bordes ---
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                const resizer = document.createElement('div');
                resizer.className = `resizer ${side}`;
                div.appendChild(resizer);

                let resizing = false;
                let origW, origH, origGX, origGY;
                let resizeCandidateW, resizeCandidateH, resizeCandidateGX, resizeCandidateGY;

                resizer.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    resizing = true;

                    origW = bookmark.w;
                    origH = bookmark.h;
                    origGX = pxToGrid(div.offsetLeft);
                    origGY = pxToGrid(div.offsetTop);

                    resizeCandidateW = origW;
                    resizeCandidateH = origH;
                    resizeCandidateGX = origGX;
                    resizeCandidateGY = origGY;

                    const onMove = (ev) => {
                        if (!resizing) return;
                        const rect = container.getBoundingClientRect();
                        const localX = ev.clientX - rect.left;
                        const localY = ev.clientY - rect.top;

                        let newGX = origGX, newGY = origGY, newW = origW, newH = origH;

                        if (side === 'right') {
                            newW = Math.max(1, Math.ceil((localX - origGX * GRID_SIZE) / GRID_SIZE));
                            // limitar solo crecimiento hacia la derecha
                            while (!isAreaFree(origGX, origGY, newW, origH, index) && newW > 1) newW--;
                        } else if (side === 'bottom') {
                            newH = Math.max(1, Math.ceil((localY - origGY * GRID_SIZE) / GRID_SIZE));
                            while (!isAreaFree(origGX, origGY, origW, newH, index) && newH > 1) newH--;
                        } else if (side === 'left') {
                            let candidateGX = Math.floor(localX / GRID_SIZE);
                            let deltaW = origGX - candidateGX;

                            if (deltaW > 0) {
                                // crecimiento hacia la izquierda → limitar por colisión
                                while (!isAreaFree(origGX - deltaW, origGY, origW + deltaW, origH, index) && deltaW > 0) deltaW--;
                            } else if (deltaW < 0) {
                                // reducción hacia la derecha → siempre permitir
                                deltaW = Math.max(deltaW, -(origW - 1));
                            }

                            newGX = origGX - deltaW;
                            newW = origW + deltaW;
                        } else if (side === 'top') {
                            let candidateGY = Math.floor(localY / GRID_SIZE);
                            let deltaH = origGY - candidateGY;

                            if (deltaH > 0) {
                                // crecimiento hacia arriba → limitar por colisión
                                while (!isAreaFree(origGX, origGY - deltaH, origW, origH + deltaH, index) && deltaH > 0) deltaH--;
                            } else if (deltaH < 0) {
                                // reducción hacia abajo → siempre permitir
                                deltaH = Math.max(deltaH, -(origH - 1));
                            }

                            newGY = origGY - deltaH;
                            newH = origH + deltaH;
                        }

                        // clamp al contenedor
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
                        div.style.border = "2px solid lime";
                    };

                    const onUp = () => {
                        if (!resizing) return;
                        resizing = false;
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);

                        bookmark.x = gridToPx(resizeCandidateGX);
                        bookmark.y = gridToPx(resizeCandidateGY);
                        bookmark.w = resizeCandidateW;
                        bookmark.h = resizeCandidateH;
                        chrome.storage.local.set({ bookmarks });
                        div.style.border = 'none';
                        renderBookmarks();
                    };

                    document.addEventListener('pointermove', onMove);
                    document.addEventListener('pointerup', onUp);
                });
            });
        }

        // Abrir link en modo normal
        div.addEventListener('click', (e) => {
            if (!editMode && !e.target.classList.contains('edit') && !e.target.classList.contains('delete')) {
                e.preventDefault();
                if (e.ctrlKey || e.metaKey || e.button === 1) {
                    // ctrl+click, cmd+click o rueda del ratón → nueva pestaña
                    window.open(bookmark.url, '_blank');
                } else {
                    // click normal → misma pestaña
                    window.location.href = bookmark.url;
                }
            }
        });

        container.appendChild(div);
    });
}
/* ------------- Fin renderBookmarks ------------- */

/* ------------- Actualizar handler addButton para usar grid y w/h ------------- */
addButton.addEventListener('click', () => {
    const name = prompt("Nombre del favorito:");
    if (!name) return;
    const url = prompt("URL del favorito (incluye https://):");
    if (!url) return;

    const rect = container.getBoundingClientRect();
    let gx = pxToGrid(rect.width / 2);
    let gy = pxToGrid(rect.height / 2);

    // buscar celda libre (simple loop diagonal)
    while (!isAreaFree(gx, gy, 1, 1)) {
        gx++;
        if (gx * GRID_SIZE > rect.width - GRID_SIZE) { gx = 0; gy++; }
    }

    const pxX = gridToPx(gx);
    const pxY = gridToPx(gy);

    bookmarks.push({
        name,
        url,
        x: pxX,
        y: pxY,
        w: 1,
        h: 1,
        invertColors: false,
        bookmarkColor: "#cccccc",
        textColor: isDarkColor("#cccccc") ? "#fff" : "#000",
        showFavicon: true,
        showText: true
    });

    chrome.storage.local.set({ bookmarks });
    renderBookmarks();
});

// --- Cargar bookmarks al iniciar ---
chrome.storage.local.get('bookmarks', (data) => {
    bookmarks = Array.isArray(data.bookmarks)
        ? data.bookmarks.map(b => ({ ...b, w: b.w || 1, h: b.h || 1 }))
        : [];
    renderBookmarks();
});