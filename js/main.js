import { loadBookmarks } from './core/bookmark.js';
import { initModal } from './ui/modal.js';
import { handleAddBookmark, renderBookmarks, setEditMode} from './ui/bookmarks.js';

/* ======================= Variables globales ======================= */
const addButton = document.getElementById('add-bookmark');
const toggleButton = document.getElementById('toggle-mode');
const gridOverlay = document.getElementById('grid-overlay');

await loadBookmarks();
initModal(renderBookmarks);
renderBookmarks();

/* ======================= Alternar modo edición ======================= */
toggleButton.addEventListener('click', () => {
    const isEditing = gridOverlay.style.display !== 'block';
    toggleButton.textContent = isEditing ? "🔒" : "✎";
    gridOverlay.style.display = isEditing ? 'block' : 'none';
    setEditMode(isEditing);
    renderBookmarks();
});

/* ======================= Añadir bookmark ======================= */
addButton.addEventListener('click', handleAddBookmark);

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