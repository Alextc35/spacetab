import { addBookmark, getBookmarks } from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';
import { isAreaFree } from '../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from './gridLayout.js';
import { flashSuccess, flashError } from '../ui/flash.js';
import { DEBUG } from '../core/config.js';
import { showAlert } from './alert.js';
import { t } from '../core/i18n.js';

let modal, nameInput, urlInput;

export function initAddBookmarkModal() {
    if (modal) return;

    modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-card">
        <h2>➕ ${t('addModal.title')}</h2>
        <div class="modal-field">
            <label>${t('addModal.name')}</label>
            <input type="text" id="add-name" placeholder="Ej: GitHub">
        </div>
        <div class="modal-field">
            <label>${t('addModal.url')}</label>
            <input type="url" id="add-url" placeholder="https://github.com">
        </div>
        <div class="modal-actions">
            <button id="add-cancel" class="btn ghost">${t('buttons.cancel')}</button>
            <button id="add-save" class="btn primary">${t('buttons.accept')}</button>
        </div>
    </div>
    `;

    document.body.appendChild(modal);

    nameInput = modal.querySelector('#add-name');
    urlInput = modal.querySelector('#add-url');

    const addBtn = modal.querySelector('#add-save');
    const cancelBtn = modal.querySelector('#add-cancel');
    const overlay = modal.querySelector('.modal-overlay');

    if (!addBtn || !cancelBtn || !overlay) {
        console.error('Add modal buttons not found!');
        return;
    }

    addBtn.addEventListener('click', addNewBookmark);
    cancelBtn.addEventListener('click', hideAddModal);
    overlay.addEventListener('click', hideAddModal);
}

export function showAddModal() {
    if (!modal) return;
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
    const maxRows = getMaxVisibleRows();
    const maxCols = getMaxVisibleCols();

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

        await showAlert(t('flash.no_space'), { type: 'info' });
        return;
    }

    const bookmark = await addBookmark({ name, url, gx, gy });
    renderBookmarks();
    flashSuccess('flash.bookmark.added');
    if (DEBUG) console.log('Bookmark added:', bookmark);
    hideAddModal();
}