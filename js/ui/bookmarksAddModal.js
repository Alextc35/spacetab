import { addBookmark, getBookmarks } from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';
import { isAreaFree } from '../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from './gridLayout.js';
import { flashSuccess, flashError } from '../ui/flash.js';
import { DEBUG } from '../core/config.js';

let modal, nameInput, urlInput;

export function initAddBookmarkModal() {
    if (modal) return;

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

    modal.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewBookmark();
        }
    });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.style.display === 'flex') {
    hideAddModal();
  }
});

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
    const maxRows = getMaxVisibleRows(); // número de filas visibles (6)
    const maxCols = getMaxVisibleCols(); // tu grid de 12 columnas

    let gx = 0, gy = 0;
    let placed = false;

    for (let col = 0; col < maxCols && !placed; col++) {
        for (let row = 0; row < maxRows; row++) {
            if (isAreaFree(bookmarks, col, row, 1, 1)) {
                gx = col;
                gy = row;
                placed = true;
                break;
            }
        }
    }

    if (!placed) {
        hideAddModal();
        flashError('flash.no_space');
        return;
    }

    const bookmark = await addBookmark({ name, url, gx, gy });
    renderBookmarks();
    flashSuccess('flash.bookmark.added');
    if (DEBUG) console.log('Bookmark added:', bookmark);
    hideAddModal();
}
