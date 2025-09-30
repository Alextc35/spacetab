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

// Cargar bookmarks
chrome.storage.local.get('bookmarks', (data) => {
    if (data.bookmarks) {
        bookmarks = data.bookmarks;
        renderBookmarks();
    }
});

// Función para favicon
function getFavicon(url) {
    try {
        const u = new URL(url);
        const extensions = ['.ico', '.png', '.jpg', '.jpeg', '.webp'];
        const fallback = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';

        return new Promise((resolve) => {
            let index = 0;
            let usePublic = false;

            const tryNext = () => {
                if (index >= extensions.length) {
                    if (!usePublic) {
                        usePublic = true;
                        index = 0;
                    } else {
                        resolve(fallback);
                        return;
                    }
                }

                const path = usePublic ? '/public/favicon' : '/favicon';
                const faviconUrl = `${u.origin}${path}${extensions[index]}`;
                const img = new Image();
                img.src = faviconUrl;
                img.onload = () => resolve(faviconUrl);
                img.onerror = () => { index++; tryNext(); };
            };
            tryNext();
        });
    } catch {
        return Promise.resolve('https://cdn-icons-png.flaticon.com/512/1828/1828843.png');
    }
}

// Grid snapping
function snapToGrid(x, y) {
    return { x: Math.round(x / GRID_SIZE) * GRID_SIZE, y: Math.round(y / GRID_SIZE) * GRID_SIZE };
}

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

/* Asegúrate al cargar de que cada bookmark tenga w,h (migración) */
chrome.storage.local.get('bookmarks', (data) => {
    if (data.bookmarks) {
        bookmarks = data.bookmarks.map(b => ({ ...b, w: b.w || 1, h: b.h || 1 }));
        renderBookmarks();
    }
});
/* ------------- Fin helpers ------------- */

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
    const containerRect = container.getBoundingClientRect();
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
        const w = bookmark.w;
        const h = bookmark.h;

        // tamaño/pixel basado en rejilla
        div.style.width = (gridToPx(w) - 20) + 'px';
        div.style.height = (gridToPx(h) - 20) + 'px';
        div.style.left = gridToPx(gx) + 'px';
        div.style.top = gridToPx(gy) + 'px';

        div.innerHTML = `
            <a href="${bookmark.url}">
                <img src="" alt="${bookmark.name}">
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

        // Mostrar/ocultar favicon y texto
        imgEl.style.display = (bookmark.showFavicon ?? true) ? "inline-block" : "none";
        spanEl.style.display = (bookmark.showText ?? true) ? "inline-block" : "none";

        getFavicon(bookmark.url).then(favicon => {
            imgEl.src = favicon;
            imgEl.style.filter = bookmark.invertColors ? "invert(1)" : "";
        });

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
                const maxLeftPx = Math.max(0, containerWidth - gridToPx(w));
                const maxTopPx = Math.max(0, containerHeight - gridToPx(h));
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
                if (candidateValid) {
                    bookmark.x = gridToPx(candidateGX);
                    bookmark.y = gridToPx(candidateGY);
                    chrome.storage.local.set({ bookmarks });
                } else {
                    // revertir
                    div.style.left = gridToPx(origGX) + 'px';
                    div.style.top = gridToPx(origGY) + 'px';
                }
                div.style.opacity = "1";
                div.style.border = "none";
                div.style.zIndex = 2;
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

            // --- Resizer (esquina inferior derecha) ---
            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            div.appendChild(resizer);

            let resizing = false;
            let origW = w, origH = h, origGxForResize = gx, origGyForResize = gy;
            let resizeCandidateW = origW, resizeCandidateH = origH;
            let resizeValid = true;

            resizer.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                resizing = true;
                origW = w;
                origH = h;
                origGxForResize = pxToGrid(div.offsetLeft);
                origGyForResize = pxToGrid(div.offsetTop);
                // attach document handlers to be robust if cursor sale del div
                const onMove = (ev) => {
                    if (!resizing) return;
                    const rect = container.getBoundingClientRect();
                    // posición del puntero relativa al contenedor
                    const localX = ev.clientX - rect.left;
                    const localY = ev.clientY - rect.top;
                    // calcular nuevo ancho/alto en celdas con el origen en origGxForResize/origGyForResize
                    let newW = Math.max(1, Math.ceil((localX - origGxForResize * GRID_SIZE) / GRID_SIZE));
                    let newH = Math.max(1, Math.ceil((localY - origGyForResize * GRID_SIZE) / GRID_SIZE));
                    // clamp para no salirse del contenedor
                    const maxW = Math.max(1, Math.floor((containerWidth - (origGxForResize * GRID_SIZE)) / GRID_SIZE));
                    const maxH = Math.max(1, Math.floor((containerHeight - (origGyForResize * GRID_SIZE)) / GRID_SIZE));
                    newW = Math.min(newW, maxW);
                    newH = Math.min(newH, maxH);

                    // comprobar si el area [origGxForResize, origGyForResize, newW, newH] está libre
                    if (isAreaFree(origGxForResize, origGyForResize, newW, newH, index)) {
                        resizeValid = true;
                        resizeCandidateW = newW;
                        resizeCandidateH = newH;
                        bookmark.w = newW;
                        bookmark.h = newH;
                        div.style.width = (gridToPx(newW) - 20) + 'px';
                        div.style.height = (gridToPx(newH) - 20) + 'px';
                        div.style.border = "2px solid lime";
                    } else {
                        resizeValid = false;
                        div.style.border = "2px solid red";
                    }
                };

                const onUp = (ev) => {
                    if (!resizing) return;
                    resizing = false;
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    if (resizeValid) {
                        bookmark.w = resizeCandidateW;
                        bookmark.h = resizeCandidateH;
                        chrome.storage.local.set({ bookmarks });
                    } else {
                        // revertir tamaño
                        div.style.width = (gridToPx(origW) - 20) + 'px';
                        div.style.height = (gridToPx(origH) - 20) + 'px';
                    }
                    div.style.border = 'none';
                };

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
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
/* ------------- Fin addButton handler ------------- */