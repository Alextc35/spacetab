import { addBookmark, getBookmarks } from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';
import { isAreaFree } from '../core/grid.js';
import { getMaxVisibleRows } from './gridLayout.js';

let modal, nameInput, urlInput;

export function initAddBookmarkModal() {
    if (modal) return; // ⛔ evita duplicar

    modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
    <div class="modal-overlay"></div>

    <div class="modal-card">
        <h2>➕ Nuevo favorito</h2>

        <div class="modal-field">
        <label>Nombre</label>
        <input type="text" id="add-name" placeholder="Ej: GitHub">
        </div>

        <div class="modal-field">
        <label>URL</label>
        <input type="url" id="add-url" placeholder="https://github.com">
        </div>

        <div class="modal-actions">
        <button id="add-cancel" class="btn ghost">Cancelar</button>
        <button id="add-save" class="btn primary">Añadir</button>
        </div>
    </div>
    `;

    document.body.appendChild(modal);

    nameInput = modal.querySelector('#add-name');
    urlInput = modal.querySelector('#add-url');

    modal.querySelector('#add-save').addEventListener('click', addNewBookmark);
    modal.querySelector('#add-cancel').addEventListener('click', hideAddModal);

    modal.querySelector('.modal-overlay')
        .addEventListener('click', hideAddModal);

    urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewBookmark();
        }
    });
}

export function showAddModal() {
    nameInput.value = '';
    urlInput.value = '';
    modal.style.display = 'flex';
    nameInput.focus();
}

function hideAddModal() {
    modal.style.display = 'none';
}

async function addNewBookmark() {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url) return;

    const bookmarks = getBookmarks();
    const maxRows = getMaxVisibleRows() - 1;

    let gx = 0, gy = 0;
    while (!isAreaFree(bookmarks, gx, gy)) {
        gy++;
        if (gy > maxRows) {
            gy = 0;
            gx++;
        }
    }

    await addBookmark({ name, url, gx, gy, w: 1, h: 1 });
    renderBookmarks();
    hideAddModal();
}
