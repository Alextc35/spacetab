/**
 * settingsModal.js
 * ------------------------------------------------------
 * Application settings modal and persistence handler.
 *
 * Responsibilities:
 * - Manages the Settings modal lifecycle
 * - Handles language selection and i18n updates
 * - Manages background customization (color / image)
 * - Persists settings and UI preferences via storage
 * - Integrates with modalManager for consistent UX
 *
 * Notes:
 * - Settings are applied immediately on change where possible
 * - Modal does NOT accept on Enter to avoid accidental submits
 * - This module owns all DOM interactions related to settings
 * ------------------------------------------------------
 */

import { applyI18n } from '../../core/i18n.js';
import { storage } from '../../core/storage.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';
import { DEBUG } from '../../core/config.js';
import { applyGlobalTheme } from '../../core/theme.js';
import { DEFAULT_SETTINGS } from '../../core/config.js';
import { showAlert } from './alertModal.js';
import { t } from '../../core/i18n.js';

/**
 * Initializes the Settings modal and its behavior.
 *
 * This function:
 * - Registers the modal with the modalManager
 * - Binds UI controls and keyboard-safe actions
 * - Loads persisted settings and applies them
 * - Keeps SETTINGS object in sync with storage
 *
 * @param {Object} SETTINGS - Global mutable settings object
 */
export function initSettingsModal(SETTINGS) {
    const settingsBtn = document.getElementById('settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsSave = document.getElementById('settings-save');
    const settingsCancel = document.getElementById('settings-cancel');
    const languageSelect = document.getElementById('language-select');

    const bgColorInput = document.getElementById('background-color');
    const bgImageInput = document.getElementById('background-image');
    const resetBgBtn = document.getElementById('reset-background');

    /**
     * Updates background input enabled/disabled state.
     *
     * Color input is disabled when an image is set.
     */
    function updateColorState() {
        bgColorInput.disabled = bgImageInput.value.trim() !== "";
    }

    registerModal({
        id: 'settings',
        element: settingsModal,
        acceptOnEnter: false,
        closeOnEsc: true,
        closeOnOverlay: true,
        initialFocus: languageSelect
    });

    settingsBtn.addEventListener('click', () => {
        languageSelect.value = SETTINGS.language;

        bgColorInput.value = SETTINGS.theme.backgroundColor;
        bgImageInput.value = SETTINGS.theme.backgroundImageUrl || '';

        updateColorState();

        openModal('settings');
    });

    settingsModal.addEventListener('click', e => {
        if (e.target === settingsModal) closeModal();
    });

    settingsCancel.addEventListener('click', closeModal);

    settingsSave.addEventListener('click', async () => {
        SETTINGS.language = languageSelect.value;
        await storage.set({ settings: SETTINGS });
        closeModal();
    });

    document.querySelectorAll("#settings-modal .tab-btn").forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll("#settings-modal .tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll("#settings-modal .tab-content").forEach(tab => tab.style.display = "none");
            const target = btn.dataset.tab;
            document.getElementById(target).style.display = "block";
        });
    });

    storage.get(['settings']).then(data => {
        if (data.settings) {
            Object.assign(SETTINGS, data.settings);
        }
 
        languageSelect.value = SETTINGS.language;

        bgColorInput.value = SETTINGS.theme.backgroundColor;
        bgImageInput.value = SETTINGS.theme.backgroundImageUrl || '';

        applyI18n();
        applyGlobalTheme(SETTINGS);
        updateColorState();

        if (DEBUG) console.info('Settings loaded from storage:', SETTINGS);
    });

    languageSelect.addEventListener('change', () => {
        SETTINGS.language = languageSelect.value;
        applyI18n();
    });

    bgColorInput.addEventListener('input', async () => {
        if (bgColorInput.disabled) return;

        SETTINGS.theme.backgroundColor = bgColorInput.value;
        SETTINGS.theme.backgroundImageUrl = null;

        applyGlobalTheme(SETTINGS);

        await storage.set({ settings: SETTINGS });
    });

    bgImageInput.addEventListener('input', async () => {
        const image = bgImageInput.value.trim();

        SETTINGS.theme.backgroundImageUrl = image || null;

        applyGlobalTheme(SETTINGS);
        updateColorState();

        await storage.set({ settings: SETTINGS });
    });

    resetBgBtn.addEventListener('click', async () => {
        const ok = await showAlert(t('alert.settingsReset'), { type: 'confirm' });
        if (!ok) return;
        SETTINGS.theme.backgroundColor = DEFAULT_SETTINGS.theme.backgroundColor;
        SETTINGS.theme.backgroundImageUrl = DEFAULT_SETTINGS.theme.backgroundImageUrl;

        bgColorInput.value = SETTINGS.theme.backgroundColor;
        bgImageInput.value = SETTINGS.theme.backgroundImageUrl || '';

        applyGlobalTheme(SETTINGS);
        updateColorState();

        await storage.set({ settings: SETTINGS });
    });

    if (DEBUG) console.info('Settings modal initialized');
}