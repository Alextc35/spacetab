// ui/settings.js
import { applyI18n } from '../core/i18n.js';
import { storage } from '../core/storage.js';

export function initSettings(SETTINGS) {
    const settingsBtn = document.getElementById('settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsSave = document.getElementById('settings-save');
    const settingsCancel = document.getElementById('settings-cancel');
    const gridSizeInput = document.getElementById('grid-size');
    const languageSelect = document.getElementById('language-select');

    const bgColorInput = document.getElementById('background-color');
    const bgImageInput = document.getElementById('background-image');
    const resetBgBtn = document.getElementById('reset-background');

    function updateColorState() {
        bgColorInput.disabled = bgImageInput.value.trim() !== "";
    }

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

    // Abrir modal
    settingsBtn.addEventListener('click', () => {
        languageSelect.value = SETTINGS.language || "es";
        settingsModal.style.display = 'flex';
    });

    settingsModal.addEventListener('click', e => {
        if (e.target === settingsModal) settingsModal.style.display = 'none';
    });

    settingsCancel.addEventListener('click', () => { settingsModal.style.display = 'none'; });

    settingsSave.addEventListener('click', async () => {
        SETTINGS.language = languageSelect.value;
        settingsModal.style.display = 'none';
        await storage.set({ settings: SETTINGS });
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

    // Cargar valores guardados
    storage.get(['settings', 'bgColor', 'bgImage']).then(data => {
        if (data.settings) Object.assign(SETTINGS, data.settings);
        languageSelect.value = SETTINGS.language || "es";
        applyI18n();
        if (data.bgColor) bgColorInput.value = data.bgColor;
        if (data.bgImage) bgImageInput.value = data.bgImage;
        applyBackground(data.bgColor, data.bgImage);
        updateColorState();
    });

    languageSelect.addEventListener('change', () => {
        SETTINGS.language = languageSelect.value;
        applyI18n();
    });

    // Background dinámico
    bgColorInput.addEventListener('input', async () => {
        if (bgColorInput.disabled) return;
        const color = bgColorInput.value;
        await storage.set({ bgColor: color, bgImage: '' });
        bgImageInput.value = '';
        applyBackground(color, '');
    });

    bgImageInput.addEventListener('input', async () => {
        const image = bgImageInput.value.trim();
        await storage.set({ bgImage: image });
        bgColorInput.disabled = image !== '';
        applyBackground('', image);
    });

    resetBgBtn.addEventListener('click', async () => {
        await storage.set({ bgColor: '', bgImage: '' });
        bgColorInput.value = '#333333';
        bgImageInput.value = '';
        bgColorInput.disabled = false;
        applyBackground('', '');
    });
}