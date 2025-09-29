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
let editingIndex = null;

function openModal(index) {
    if (index == null || !bookmarks[index]) return;
    editingIndex = index;
    modalName.value = bookmarks[index].name;
    modalUrl.value = bookmarks[index].url;
    modalLightmode.checked = !!bookmarks[index].lightmode;
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
    chrome.storage.local.set({ bookmarks });
    renderBookmarks();
    closeModal();
});
modalCancel.addEventListener('click', closeModal);

// Inicializar cuadrícula según modo
gridOverlay.style.display = editMode ? 'block' : 'none';

// Cargar favoritos guardados
chrome.storage.local.get('bookmarks', (data) => {
    if (data.bookmarks) {
        bookmarks = data.bookmarks;
        renderBookmarks();
    }
});

// Función para obtener favicon dinámicamente
function getFavicon(url) {
    try {
        const u = new URL(url);
        const extensions = ['.ico', '.png', '.jpg', '.jpeg', '.webp'];
        const fallback = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png'; // fallback

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
                img.onerror = () => {
                    index++;
                    tryNext();
                };
            };

            tryNext();
        });
    } catch {
        return Promise.resolve('https://cdn-icons-png.flaticon.com/512/1828/1828843.png');
    }
}

// Alineación a cuadrícula
function snapToGrid(x, y) {
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    return { x: snappedX, y: snappedY };
}

// Alternar modos
toggleButton.addEventListener('click', () => {
    editMode = !editMode;
    toggleButton.textContent = editMode ? "🔒" : "✎";
    gridOverlay.style.display = editMode ? 'block' : 'none';
    renderBookmarks();
});

function renderBookmarks() {
    container.innerHTML = '';
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    bookmarks.forEach((bookmark, index) => {
        const div = document.createElement('div');
        div.className = 'bookmark';
        div.style.cursor = editMode ? "move" : "pointer";

        if (bookmark.x != null && bookmark.y != null) {
            div.style.left = bookmark.x + 'px';
            div.style.top = bookmark.y + 'px';
        } else {
            const randX = Math.random() * (containerWidth - 120);
            const randY = Math.random() * (containerHeight - 120);
            const snapped = snapToGrid(randX, randY);
            div.style.left = snapped.x + 'px';
            div.style.top = snapped.y + 'px';
            bookmarks[index].x = snapped.x;
            bookmarks[index].y = snapped.y;
            chrome.storage.local.set({ bookmarks });
        }

        div.innerHTML = `
            <a href="${bookmark.url}">
                <img src="" alt="${bookmark.name}">
                <span>${bookmark.name}</span>
            </a>
            ${editMode ? '<button class="edit">✎</button><button class="delete">🗑</button>' : ''}
        `;

        const linkEl = div.querySelector('a');
        linkEl.style.cursor = editMode ? 'move' : 'pointer';

        const imgEl = div.querySelector("a img");
        getFavicon(bookmark.url).then(favicon => {
            imgEl.src = favicon;
            if (bookmark.lightmode) {
                imgEl.style.filter = "invert(1)";
            } else {
                imgEl.style.filter = "";
            }
        });

        if (editMode) {
            let offsetX = 0, offsetY = 0;
            let dragging = false;

            div.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (e.target.classList.contains('edit') || e.target.classList.contains('delete')) return;
                dragging = true;
                offsetX = e.clientX - div.offsetLeft;
                offsetY = e.clientY - div.offsetTop;
                div.setPointerCapture(e.pointerId);
            });

            div.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                let newLeft = e.clientX - offsetX;
                let newTop = e.clientY - offsetY;
                newLeft = Math.max(0, Math.min(newLeft, containerWidth - div.offsetWidth));
                newTop = Math.max(0, Math.min(newTop, containerHeight - div.offsetHeight));
                div.style.left = newLeft + 'px';
                div.style.top = newTop + 'px';
            });

            div.addEventListener('pointerup', (e) => {
                if (!dragging) return;
                dragging = false;
                const snapped = snapToGrid(parseInt(div.style.left), parseInt(div.style.top));
                div.style.left = snapped.x + 'px';
                div.style.top = snapped.y + 'px';
                bookmarks[index].x = snapped.x;
                bookmarks[index].y = snapped.y;
                chrome.storage.local.set({ bookmarks });
                div.releasePointerCapture(e.pointerId);
            });

            // Abrir modal para editar
            div.querySelector('.edit').addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(index);
            });

            // Eliminar
            div.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar ${bookmark.name}?`)) {
                    bookmarks.splice(index, 1);
                    chrome.storage.local.set({ bookmarks });
                    renderBookmarks();
                }
            });
        }

        // Abrir link en modo fijo
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
    const snapped = snapToGrid(containerWidth / 2, containerHeight / 2);

    bookmarks.push({ name, url, x: snapped.x, y: snapped.y, lightmode: false });
    chrome.storage.local.set({ bookmarks });
    renderBookmarks();
});
