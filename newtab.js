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
const modalBackgroundImage = document.getElementById("modal-background-image");
modalBackgroundImage.addEventListener("input", updateColorInputs);
let editingIndex = null;
const modalFaviconBackground = document.getElementById('modal-favicon-background');

// ----------------------------------------------
// handler único para el checkbox "Favicon como background"
// ----------------------------------------------
modalFaviconBackground.addEventListener('change', () => {
    const checked = modalFaviconBackground.checked;

    // Cuando está activo: no permitimos poner una URL de imagen, y desactivamos el checkbox "mostrar favicon (pequeño)"
    modalBackgroundImage.disabled = checked;
    modalShowFavicon.disabled = checked;

    if (checked) {
        // Si activas este modo, el favicon pequeño no debe mostrarse ni estar checked
        modalShowFavicon.checked = false;
        // No tocar modalBookmarkColor ni modalNoBackground: queremos permitir color sólido o "sin fondo"
        modalNoBackground.disabled = false;
    }

    // Actualiza estados dependientes (color input, etc.)
    updateColorInputs();
});

// Modal abrir/cerrar
function openModal(index) {
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

    // Modo "favicon grande centrado + color de fondo"
    modalFaviconBackground.checked = !!bookmark.faviconBackground;

    // Si está activo faviconBackground: deshabilitamos input de URL y el checkbox pequeño
    modalBackgroundImage.disabled = modalFaviconBackground.checked;
    modalShowFavicon.disabled = modalFaviconBackground.checked;
    if (modalFaviconBackground.checked) {
        // el favicon "pequeño" no debe aparecer ni estar marcado en este modo
        modalShowFavicon.checked = false;
    }

    // El color del bookmark puede seguir cambiándose (permitido)
    modalBookmarkColor.disabled = modalNoBackground.checked;

    // Actualiza estados (opacity, etc.)
    updateColorInputs();

    // Mostrar modal
    editModal.style.display = 'flex';
}


function closeModal() {
    editModal.style.display = 'none';
    editingIndex = null;
}

// Guardar cambios del modal
modalSave.addEventListener('click', () => {
    if (editingIndex === null) return;
    const bookmark = bookmarks[editingIndex];

    // Guardar valores básicos
    bookmark.name = modalName.value.trim();
    bookmark.url = modalUrl.value.trim();
    bookmark.invertColors = modalInvertColors.checked;
    bookmark.bookmarkColor = modalNoBackground.checked ? "transparent" : modalBookmarkColor.value;
    bookmark.textColor = modalTextColor.value;
    bookmark.showText = modalShowText.checked;

    if (modalFaviconBackground.checked) {
        // Modo: favicon grande en el centro + color sólido de fondo (o transparente si se escogió)
        bookmark.faviconBackground = true;
        bookmark.backgroundImageUrl = null; // no usamos imagen de url en este modo
        bookmark.showFavicon = false;        // ocultamos el favicon pequeño
    } else {
        // Modo normal: guardar URL de fondo (si la hay) y valor de showFavicon
        bookmark.faviconBackground = false;
        bookmark.backgroundImageUrl = modalBackgroundImage.value.trim() || null;
        bookmark.showFavicon = modalShowFavicon.checked;
    }

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
  const hasImage = modalBackgroundImage.value.trim() !== "";
  const noBackground = modalNoBackground.checked;

  // Si hay imagen → bloquear color y "sin fondo"
  modalBookmarkColor.disabled = hasImage || noBackground;
  modalNoBackground.disabled = hasImage;
  modalTextColor.disabled = !modalShowText.checked;

  // Visualmente indicar bloqueo
  if (hasImage) {
    modalBookmarkColor.style.opacity = "0.5";
    modalNoBackground.parentElement.style.opacity = "0.5";
  } else {
    modalBookmarkColor.style.opacity = "1";
    modalNoBackground.parentElement.style.opacity = "1";
  }
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

        // --- Fondo ---
        if (bookmark.faviconBackground) {
            // modo: favicon grande centrado + color sólido (sin imagen)
            div.style.backgroundImage = "none";
            div.style.backgroundColor = bookmark.bookmarkColor === "transparent"
                ? "transparent"
                : (bookmark.bookmarkColor || "#222");
        } else if (bookmark.backgroundImageUrl) {
            // imagen de fondo
            div.style.backgroundImage = `url(${bookmark.backgroundImageUrl})`;
            div.style.backgroundSize = "cover";
            div.style.backgroundPosition = "center";
            div.style.backgroundRepeat = "no-repeat";
            div.style.backgroundColor = "transparent";
        } else {
            // color sólido
            div.style.backgroundImage = "none";
            div.style.backgroundColor = bookmark.bookmarkColor || "#222";
        }

        div.style.color = bookmark.textColor || "#fff";
        const darkBg = isDarkColor(bookmark.bookmarkColor || '#222');

        // --- Posición / tamaño ---
        const gx = pxToGrid(bookmark.x ?? 0);
        const gy = pxToGrid(bookmark.y ?? 0);
        div.style.width = (gridToPx(bookmark.w) - 20) + 'px';
        div.style.height = (gridToPx(bookmark.h) - 20) + 'px';
        div.style.left = gridToPx(gx) + 'px';
        div.style.top = gridToPx(gy) + 'px';

        // --- Contenido interno ---
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
            // Favicon grande + color de fondo
            const img = document.createElement('img');
            img.src = getFavicon(bookmark.url);
            img.alt = bookmark.name || '';
            img.style.width = '60%';
            img.style.height = '60%';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
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
            // Modo normal
            const infoBox = document.createElement('div');
            infoBox.style.position = 'absolute';
            infoBox.style.bottom = '6px';
            infoBox.style.right = '8px';
            infoBox.style.display = 'flex';
            infoBox.style.alignItems = 'center';
            infoBox.style.gap = '6px';
            infoBox.style.background = 'transparent'; // sin fondo
            infoBox.style.padding = '0';
            infoBox.style.borderRadius = '0'; // sin bordes redondeados

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

        // --- Botones editar/eliminar ---
        if (editMode) {
            const editBtn = document.createElement('button');
            editBtn.className = 'edit';
            editBtn.textContent = '✎';
            editBtn.style.background = darkBg ? '#fff' : '#222';
            editBtn.style.color = darkBg ? '#000' : '#fff';
            editBtn.addEventListener('click', (e) => { e.stopPropagation(); openModal(index); });

            const delBtn = document.createElement('button');
            delBtn.className = 'delete';
            delBtn.textContent = '🗑';
            delBtn.style.background = darkBg ? '#fff' : '#222';
            delBtn.style.color = darkBg ? '#000' : '#fff';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar ${bookmark.name}?`)) {
                    bookmarks.splice(index, 1);
                    chrome.storage.local.set({ bookmarks });
                    renderBookmarks();
                }
            });

            editBtn.style.position = 'absolute';
            editBtn.style.top = '5px';
            editBtn.style.right = '35px';
            editBtn.style.width = '25px';
            editBtn.style.height = '25px';
            editBtn.style.borderRadius = '5px';
            editBtn.style.border = 'none';
            editBtn.style.cursor = 'pointer';

            delBtn.style.position = 'absolute';
            delBtn.style.top = '5px';
            delBtn.style.right = '5px';
            delBtn.style.width = '25px';
            delBtn.style.height = '25px';
            delBtn.style.borderRadius = '5px';
            delBtn.style.border = 'none';
            delBtn.style.cursor = 'pointer';

            div.appendChild(editBtn);
            div.appendChild(delBtn);
        }

        container.appendChild(div);

        // --- Dragging ---
        if (editMode) {
            let dragging = false;
            let origGX = gx, origGY = gy;
            let pointerOffsetX = 0, pointerOffsetY = 0;

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

                const maxLeftPx = Math.max(0, containerWidth - gridToPx(bookmark.w));
                const maxTopPx = Math.max(0, containerHeight - gridToPx(bookmark.h));
                newLeftPx = Math.max(0, Math.min(newLeftPx, maxLeftPx));
                newTopPx = Math.max(0, Math.min(newTopPx, maxTopPx));

                const snappedGX = pxToGrid(newLeftPx);
                const snappedGY = pxToGrid(newTopPx);
                const currentW = bookmark.w || 1;
                const currentH = bookmark.h || 1;

                if (isAreaFree(snappedGX, snappedGY, currentW, currentH, index)) {
                    div.style.left = gridToPx(snappedGX) + 'px';
                    div.style.top = gridToPx(snappedGY) + 'px';
                    div.style.opacity = "1";
                    div.style.border = "none";
                } else {
                    div.style.opacity = "0.5";
                    div.style.border = "1px solid red";
                }
            });

            div.addEventListener('pointerup', (e) => {
                if (!dragging) return;
                dragging = false;
                div.releasePointerCapture(e.pointerId);

                const snappedGX = pxToGrid(div.offsetLeft);
                const snappedGY = pxToGrid(div.offsetTop);
                let finalGX = snappedGX;
                let finalGY = snappedGY;

                while (!isAreaFree(finalGX, finalGY, bookmark.w, bookmark.h, index) && finalGX > 0) finalGX--;
                while (!isAreaFree(finalGX, finalGY, bookmark.w, bookmark.h, index) && finalGY > 0) finalGY--;

                bookmark.x = gridToPx(finalGX);
                bookmark.y = gridToPx(finalGY);
                chrome.storage.local.set({ bookmarks });
                renderBookmarks();
            });

            // --- Resizers ---
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

                    const onMove = (ev) => {
                        if (!resizing) return;
                        const rect = container.getBoundingClientRect();
                        const localX = ev.clientX - rect.left;
                        const localY = ev.clientY - rect.top;

                        let newGX = origGX, newGY = origGY, newW = origW, newH = origH;

                        if (side === 'right') {
                            newW = Math.max(1, Math.ceil((localX - origGX * GRID_SIZE) / GRID_SIZE));
                            while (!isAreaFree(origGX, origGY, newW, origH, index) && newW > 1) newW--;
                        } else if (side === 'bottom') {
                            newH = Math.max(1, Math.ceil((localY - origGY * GRID_SIZE) / GRID_SIZE));
                            while (!isAreaFree(origGX, origGY, origW, newH, index) && newH > 1) newH--;
                        } else if (side === 'left') {
                            let candidateGX = Math.floor(localX / GRID_SIZE);
                            let deltaW = origGX - candidateGX;
                            if (deltaW > 0) {
                                while (!isAreaFree(origGX - deltaW, origGY, origW + deltaW, origH, index) && deltaW > 0) deltaW--;
                            } else if (deltaW < 0) {
                                deltaW = Math.max(deltaW, -(origW - 1));
                            }
                            newGX = origGX - deltaW;
                            newW = origW + deltaW;
                        } else if (side === 'top') {
                            let candidateGY = Math.floor(localY / GRID_SIZE);
                            let deltaH = origGY - candidateGY;
                            if (deltaH > 0) {
                                while (!isAreaFree(origGX, origGY - deltaH, origW, origH + deltaH, index) && deltaH > 0) deltaH--;
                            } else if (deltaH < 0) {
                                deltaH = Math.max(deltaH, -(origH - 1));
                            }
                            newGY = origGY - deltaH;
                            newH = origH + deltaH;
                        }

                        // clamp
                        if (newGX < 0) { newW += newGX; newGX = 0; }
                        if (newGY < 0) { newH += newGY; newGY = 0; }
                        if (newGX + newW > Math.floor(containerWidth / GRID_SIZE))
                            newW = Math.floor(containerWidth / GRID_SIZE) - newGX;
                        if (newGY + newH > Math.floor(containerHeight / GRID_SIZE))
                            newH = Math.floor(containerHeight / GRID_SIZE) - newGY;

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

        // --- Click normal ---
        div.addEventListener('click', (e) => {
            if (!editMode && !e.target.classList.contains('edit') && !e.target.classList.contains('delete')) {
                e.preventDefault();
                if (e.ctrlKey || e.metaKey || e.button === 1) {
                    window.open(bookmark.url, '_blank');
                } else {
                    window.location.href = bookmark.url;
                }
            }
        });
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

// Modal de Configuración
const settingsBtn = document.getElementById('settings');
const settingsModal = document.getElementById('settings-modal');
const settingsSave = document.getElementById('settings-save');
const settingsCancel = document.getElementById('settings-cancel');
const gridSizeInput = document.getElementById('grid-size');
const languageSelect = document.getElementById('language-select');

let SETTINGS = {
  gridSize: 140,
  language: "es"
};

// Abrir modal
settingsBtn.addEventListener('click', () => {
  gridSizeInput.value = SETTINGS.gridSize;
  languageSelect.value = SETTINGS.language || "es";
  settingsModal.style.display = 'flex';
});

// Cerrar modal al hacer clic fuera del contenido
settingsModal.addEventListener('click', (e) => {
  // si el click fue directamente sobre el overlay y no dentro del modal-content
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
});

// Cerrar modal
settingsCancel.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// Guardar cambios
settingsSave.addEventListener('click', () => {
  SETTINGS.gridSize = parseInt(gridSizeInput.value, 10) || 140;
  SETTINGS.language = languageSelect.value;
  settingsModal.style.display = 'none';
  chrome.storage.local.set({ settings: SETTINGS });
  // 🔄 aquí podrías forzar un rerender si cambia GRID_SIZE
});

// Tabs
document.querySelectorAll("#settings-modal .tab-btn").forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll("#settings-modal .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll("#settings-modal .tab-content").forEach(tab => tab.style.display = "none");
    const target = btn.dataset.tab;
    document.getElementById(target).style.display = "block";
  });
});

// Cargar settings guardados
chrome.storage.local.get('settings', (data) => {
  if (data.settings) {
    SETTINGS = data.settings;
  }
});

const bgColorInput = document.getElementById('background-color');
const bgImageInput = document.getElementById('background-image');
const resetBgBtn = document.getElementById('reset-background');

// Función para actualizar estado del input color
function updateColorState() {
  if (bgImageInput.value.trim() !== "") {
    bgColorInput.disabled = true;
  } else {
    bgColorInput.disabled = false;
  }
}

// Monitorear cambios en el input de imagen
bgImageInput.addEventListener("input", updateColorState);

// Cargar valores guardados
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

// Cambios dinámicos
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

// Reset fondo
resetBgBtn.addEventListener('click', () => {
  chrome.storage.local.set({ bgColor: '', bgImage: '' });
  bgColorInput.value = '#333';
  bgImageInput.value = '';
  bgColorInput.disabled = false;
  applyBackground('', '');
});