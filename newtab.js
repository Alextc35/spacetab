const container = document.getElementById('bookmark-container');
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

let editMode = false;
const GRID_SIZE = 140;
let bookmarks = [];

// Modal
const editModal = document.getElementById('edit-modal');
const modalName = document.getElementById('modal-name');
const modalUrl = document.getElementById('modal-url');
const modalLightmode = document.getElementById('modal-lightmode');
const modalSave = document.getElementById('modal-save');
const modalCancel = document.getElementById('modal-cancel');
const modalBookmarkColor = document.getElementById('modal-bookmark-color');
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
    modalLightmode.checked = !!bookmarks[index].lightmode;
    modalBookmarkColor.value = bookmarks[index].bookmarkColor || "#222222";
    modalTextColor.value = bookmarks[index].textColor || "#ffffff";
    modalShowFavicon.checked = bookmarks[index].showFavicon ?? true;
    modalShowText.checked = bookmarks[index].showText ?? true;
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
    bookmarks[editingIndex].lightmode = modalLightmode.checked;
    bookmarks[editingIndex].bookmarkColor = modalBookmarkColor.value;
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

// Evitar superposición
function isOverlapping(x, y, ignoreIndex = -1) {
    return bookmarks.some((bm, i) => {
        if (i === ignoreIndex) return false; // ignorar el bookmark que estamos moviendo
        if (bm.x == null || bm.y == null) return false;
        return Math.abs(bm.x - x) < GRID_SIZE && Math.abs(bm.y - y) < GRID_SIZE;
    });
}

// Función para detectar si un color hexadecimal es oscuro
function isDarkColor(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
    return luminance < 64; // umbral: 64
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
        const div = document.createElement('div');
        div.className = 'bookmark';
        div.style.cursor = editMode ? "move" : "pointer";
        div.style.backgroundColor = bookmark.bookmarkColor || "#222";
        div.style.color = bookmark.textColor || "#fff";

        // Posición
        if (bookmark.x != null && bookmark.y != null) {
            div.style.left = bookmark.x + 'px';
            div.style.top = bookmark.y + 'px';
        } else {
            let x = containerWidth / 2, y = containerHeight / 2;
            while (isOverlapping(x, y)) { x += GRID_SIZE; y += GRID_SIZE; }
            const snapped = snapToGrid(x, y);
            div.style.left = snapped.x + 'px';
            div.style.top = snapped.y + 'px';
            bookmark.x = snapped.x;
            bookmark.y = snapped.y;
            chrome.storage.local.set({ bookmarks });
        }

        div.innerHTML = `
            <a href="${bookmark.url}">
                <img src="" alt="${bookmark.name}">
                <span>${bookmark.name}</span>
            </a>
            ${editMode ? `
                <button class="edit" style="
                    background: ${isDarkColor(bookmark.bookmarkColor || '#222') ? '#fff' : '#222'};
                    color: ${isDarkColor(bookmark.bookmarkColor || '#222') ? '#000' : '#fff'};
                ">✎</button>
                <button class="delete" style="
                    background: ${isDarkColor(bookmark.bookmarkColor || '#222') ? '#fff' : '#222'};
                    color: ${isDarkColor(bookmark.bookmarkColor || '#222') ? '#000' : '#fff'};
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
            imgEl.style.filter = bookmark.lightmode ? "invert(1)" : "";
        });

        if (editMode) {
            let offsetX = 0, offsetY = 0;
            let dragging = false;
            let highestZ = 1; // valor global para controlar capas

            div.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (e.target.classList.contains('edit') || e.target.classList.contains('delete')) return;
                dragging = true;
                offsetX = e.clientX - div.offsetLeft;
                offsetY = e.clientY - div.offsetTop;
                div.setPointerCapture(e.pointerId);

                // Subir al frente
                highestZ = 9999;
                div.style.zIndex = highestZ;
            });

            div.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                let newLeft = e.clientX - offsetX;
                let newTop = e.clientY - offsetY;
                newLeft = Math.max(0, Math.min(newLeft, containerWidth - div.offsetWidth));
                newTop = Math.max(0, Math.min(newTop, containerHeight - div.offsetHeight));
                div.style.left = newLeft + 'px';
                div.style.top = newTop + 'px';

                // Feedback de superposición
                const snapped = snapToGrid(newLeft, newTop);
                if (isOverlapping(snapped.x, snapped.y, index)) {
                    div.style.opacity = "0.5";          // visualmente “deshabilitado”
                    div.style.border = "2px solid red"; // borde rojo de aviso
                } else {
                    div.style.opacity = "1";
                    div.style.border = "none";
                }
            });

            div.addEventListener('pointerup', (e) => {
                if (!dragging) return;
                dragging = false;
                const snapped = snapToGrid(parseInt(div.style.left), parseInt(div.style.top));
                // Evitar superposición
                if (!isOverlapping(snapped.x, snapped.y)) {
                    div.style.left = snapped.x + 'px';
                    div.style.top = snapped.y + 'px';
                    bookmark.x = snapped.x;
                    bookmark.y = snapped.y;
                    chrome.storage.local.set({ bookmarks });
                } else {
                    // Volver al lugar anterior
                    div.style.left = bookmark.x + 'px';
                    div.style.top = bookmark.y + 'px';
                }

                // Reset visual
                div.style.opacity = "1";
                div.style.border = "none";
                // Devolver a capa normal
                div.style.zIndex = 1;

                div.releasePointerCapture(e.pointerId);
            });

            div.querySelector('.edit').addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(index);
            });

            div.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar ${bookmark.name}?`)) {
                    bookmarks.splice(index, 1);
                    chrome.storage.local.set({ bookmarks });
                    renderBookmarks();
                }
            });
        }

        // Abrir link en modo normal
        div.addEventListener('click', (e) => {
            if (!editMode && !e.target.classList.contains('edit') && !e.target.classList.contains('delete')) {
                window.location.href = bookmark.url;
            }
        });

        container.appendChild(div);
    });
}

// Agregar bookmark en modo edición
addButton.addEventListener('click', () => {
    const name = prompt("Nombre del favorito:");
    if (!name) return;
    const url = prompt("URL del favorito (incluye https://):");
    if (!url) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    let x = containerWidth / 2;
    let y = containerHeight / 2;
    while (isOverlapping(x, y)) { x += GRID_SIZE; y += GRID_SIZE; }
    const snapped = snapToGrid(x, y);

    bookmarks.push({ name, url, x: snapped.x, y: snapped.y, lightmode: false });
    chrome.storage.local.set({ bookmarks });
    renderBookmarks();
});
