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
import { flashSuccess } from '../flash.js';

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

    const clearBgImageBtn = document.getElementById('clear-background-image');
    const copyBgImageBtn = document.getElementById('copy-background-image');
    const toggleBtn = document.getElementById('toggle-background-image');

    const bgPreview = document.getElementById('background-preview');

    let draftTheme = null;
    let isLocked = false;

    toggleBtn.addEventListener('click', () => {
        if (isLocked) {
            removeLockedState();
        } else {
            applyLockedState();
        }

        updateColorState(); // 
    });

    /**
     * Updates background input enabled/disabled state.
     *
     * Color input is disabled when an image is set.
     */
    function updateColorState() {
        bgColorInput.disabled = bgImageInput.value.trim() !== "";

        clearBgImageBtn.style.display = 
            (!isLocked && bgImageInput.value.trim()) ? 'block' : 'none';

        copyBgImageBtn.style.display =
            bgImageInput.value.trim() ? 'block' : 'none';

        toggleBtn.style.display =
            bgImageInput.value.trim() ? 'block' : 'none';
    }

    function updatePreviewDraft() {
        const image = draftTheme.backgroundImageUrl;
        const color = draftTheme.backgroundColor;

        if (image) {
            bgPreview.style.backgroundImage = `url(${image})`;
            bgPreview.style.backgroundColor = 'transparent';
        } else {
            bgPreview.style.backgroundImage = 'none';
            bgPreview.style.backgroundColor = color;
        }
    }

    function applyLockedState() {
        isLocked = true;
        draftTheme.backgroundImageUrlLocked = true;

        bgImageInput.classList.add('input-locked');
        bgImageInput.readOnly = true;

        toggleBtn.textContent = '🔒';
        toggleBtn.title = 'Unlock URL';

        updateColorState();
    }

    function removeLockedState() {
        isLocked = false;
        draftTheme.backgroundImageUrlLocked = false;

        bgImageInput.classList.remove('input-locked');
        bgImageInput.readOnly = false;

        toggleBtn.textContent = '🔓';
        toggleBtn.title = 'Lock URL';

        updateColorState();
    }

    registerModal({
        id: 'settings',
        element: settingsModal,
        acceptOnEnter: false,
        closeOnEsc: true,
        closeOnOverlay: false,
        initialFocus: languageSelect
    });

    settingsBtn.addEventListener('click', () => {
        languageSelect.value = SETTINGS.language;

        draftTheme = structuredClone(SETTINGS.theme);

        isLocked = draftTheme.backgroundImageUrlLocked || false;

        if (isLocked) { applyLockedState(); }
            else { removeLockedState(); }

        bgColorInput.value = draftTheme.backgroundColor;
        bgImageInput.value = draftTheme.backgroundImageUrl || '';

        updateColorState();
        updatePreviewDraft();

        openModal('settings');
    });

    settingsCancel.addEventListener('click', () => {
        // todo: showAlert skel
        showAlert(t('alert.settings.cancel'), { type: 'confirm' }).then(ok => {if (ok) { 
            closeModal();
        }});
    });

    settingsSave.addEventListener('click', async () => {
        SETTINGS.language = languageSelect.value;
        SETTINGS.theme = structuredClone(draftTheme);

        applyGlobalTheme(SETTINGS);
        await storage.set({ settings: SETTINGS });

        flashSuccess('flash.settings.saved');
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

        draftTheme = structuredClone(SETTINGS.theme);

        languageSelect.value = SETTINGS.language;

        bgColorInput.value = SETTINGS.theme.backgroundColor;
        bgImageInput.value = SETTINGS.theme.backgroundImageUrl || '';

        isLocked = SETTINGS.theme.backgroundImageUrlLocked || false;
        if (isLocked && bgImageInput.value.trim()) { applyLockedState(); }

        applyI18n();
        applyGlobalTheme(SETTINGS);
        updatePreviewDraft();
        updateColorState();

        if (DEBUG) console.info('Settings loaded from storage:', SETTINGS);
    });

    languageSelect.addEventListener('change', () => {
        SETTINGS.language = languageSelect.value;
        applyI18n();
    });

    bgColorInput.addEventListener('input', async () => {
        if (bgColorInput.disabled) return;

        draftTheme.backgroundColor = bgColorInput.value;
        draftTheme.backgroundImageUrl = null;

        updatePreviewDraft();
        updateColorState();
    });

    bgImageInput.addEventListener('input', async () => {
        const image = bgImageInput.value.trim();

        draftTheme.backgroundImageUrl = image || null;

        updatePreviewDraft();
        updateColorState();
    });

    copyBgImageBtn.addEventListener('click', async () => {
        const value = bgImageInput.value.trim();
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            flashSuccess('flash.settings.copied');
        } catch (err) {
            console.error('Clipboard error:', err);
        }
    });

    clearBgImageBtn.addEventListener('click', async () => {
        bgImageInput.value = '';
        draftTheme.backgroundImageUrl = null;

        updateColorState();
        updatePreviewDraft();
    });

    resetBgBtn.addEventListener('click', async () => {
        const ok = await showAlert(t('alert.settings.reset'), { type: 'confirm' });
        if (!ok) return;

        draftTheme = structuredClone(DEFAULT_SETTINGS.theme);

        bgColorInput.value = draftTheme.backgroundColor;
        bgImageInput.value = draftTheme.backgroundImageUrl || '';

        draftTheme.backgroundImageUrlLocked = false;
        removeLockedState();

        updatePreviewDraft();
        updateColorState();
    });

    if (DEBUG) console.info('Settings modal initialized');
}