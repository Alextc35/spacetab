import { createLockableInputController } from './helper/stateLocked.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';
import { showAlert } from './alertModal.js';
import { changeLanguage, t } from '../../core/i18n.js';
import { flashSuccess } from '../flash.js';
import { getState } from '../../core/store.js';
import { updateSettings } from '../../core/settings.js';
import { DEFAULT_SETTINGS } from '../../core/defaults.js';

export function initSettingsModal() {
    const settingsBtn = document.getElementById('settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsSave = document.getElementById('settings-modal-save');
    const settingsCancel = document.getElementById('settings-modal-cancel');
    const languageSelect = document.getElementById('language-select');

    const bgColorInput = document.getElementById('settings-modal-background-color');
    const bgImageInput = document.getElementById('settings-modal-background-image');
    const resetBgBtn = document.getElementById('settings-modal-reset-background');

    const clearBgImageBtn = document.getElementById('settings-modal-clear-background-image');
    const copyBgImageBtn = document.getElementById('settings-modal-copy-background-image');
    const toggleBtn = document.getElementById('settings-modal-toggle-background-image');
    
    const bgPreview = document.getElementById('settings-modal-background-preview');

    let bgController;

    let draftTheme = null;
    let draftLanguage = null;
    let initialSnapshot = null;

    function updateColorState() {
        const hasImage = bgImageInput.value.trim() !== '';

        clearBgImageBtn.style.display = hasImage ? 'block' : 'none';
        copyBgImageBtn.style.display = hasImage ? 'block' : 'none';
        toggleBtn.style.display = hasImage ? 'block' : 'none';
    }

    function updatePreviewDraft() {
        const image = draftTheme.backgroundImageUrl;
        const color = draftTheme.backgroundColor;

        bgPreview.style.backgroundColor = color;

        if (image) {
            bgPreview.style.backgroundImage = `url(${image})`;
        } else {
            bgPreview.style.backgroundImage = 'none';
        }
    }

    function activateTab(tabId) {
        document.querySelectorAll("#settings-modal .settings-modal-tab-btn")
            .forEach(b => b.classList.remove("active"));

        document.querySelectorAll("#settings-modal .settings-modal-tab-content")
            .forEach(tab => tab.style.display = "none");

        const btn = document.querySelector(`#settings-modal .settings-modal-tab-btn[data-tab="${tabId}"]`);
        if (btn) btn.classList.add("active");

        const content = document.getElementById(tabId);
        if (content) {
            content.style.display = "block";
            requestAnimationFrame(() => {
                content.scrollTop = 0;
            });
        }
    }

    function hasChanges() {
        const currentDraft = {
            language: draftLanguage,
            theme: draftTheme
        };

        return JSON.stringify(currentDraft) !== JSON.stringify(initialSnapshot);
    }

    function updateSaveButtonState() {
        const changed = hasChanges();
        settingsSave.disabled = !changed;
        settingsSave.classList.toggle('is-hidden', !changed);
    }

    registerModal({
        id: 'settings',
        element: settingsModal,
        acceptOnEnter: false,
        closeOnEsc: false,
        closeOnOverlay: false,
        initialFocus: null
    });

    settingsBtn.addEventListener('click', () => {
        const { data: { settings } } = getState();

        initialSnapshot = structuredClone(settings);

        languageSelect.value = settings.language;
        draftTheme = structuredClone(settings.theme);
        draftLanguage = structuredClone(settings.language);

        if (!bgController) {
            bgController = createLockableInputController({
                input: bgImageInput,
                toggleBtn,
                clearBtn: clearBgImageBtn,
                copyBtn: copyBgImageBtn,
                initialLocked: draftTheme.backgroundImageUrlLocked || false,
                onChange: () => {
                    draftTheme.backgroundImageUrl =
                        bgImageInput.value.trim() || null;

                    draftTheme.backgroundImageUrlLocked =
                        bgController?.isLocked() ?? false;

                    updatePreviewDraft();
                    updateSaveButtonState();
                }
            });
        } else {
            bgController.setLocked(draftTheme.backgroundImageUrlLocked || false);
        }

        bgColorInput.value = draftTheme.backgroundColor;
        bgImageInput.value = draftTheme.backgroundImageUrl || '';

        updateSaveButtonState();
        updateColorState();
        updatePreviewDraft();

        activateTab('settings-modal-tab-general');

        openModal('settings');
    });

    settingsCancel.addEventListener('click', async () => {
        if (!hasChanges()) {
            closeModal();
            return;
        }

        const ok = await showAlert(t('alert.settings.cancel'), { type: 'confirm' });
        if (ok) {
            await changeLanguage({ language: initialSnapshot.language });
            closeModal();
        }
    });

    settingsSave.addEventListener('click', async () => {
        const newSettings = {
            language: draftLanguage || languageSelect.value,
            theme: structuredClone(draftTheme)
        };

        updateSettings(newSettings);

        flashSuccess('flash.settings.saved');
        closeModal();
    });

    document.querySelectorAll("#settings-modal .settings-modal-tab-btn").forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll("#settings-modal .settings-modal-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll("#settings-modal .settings-modal-tab-content").forEach(tab => tab.style.display = "none");
            const target = btn.dataset.tab;
            document.getElementById(target).style.display = "block";
        });
    });

    languageSelect.addEventListener('change', async () => {
        draftLanguage = languageSelect.value;
        await changeLanguage({ language: draftLanguage });
        updateSaveButtonState();
    });

    bgColorInput.addEventListener('input', async () => {
        if (bgColorInput.disabled) return;

        draftTheme.backgroundColor = bgColorInput.value;

        updatePreviewDraft();
        updateColorState();
        updateSaveButtonState();
    });

    bgImageInput.addEventListener('input', async () => {
        const image = bgImageInput.value.trim();

        draftTheme.backgroundImageUrl = image || null;

        updatePreviewDraft();
        updateColorState();
        updateSaveButtonState();
    });

    copyBgImageBtn.addEventListener('click', async () => {
        const value = bgImageInput.value.trim();
        if (!value) return;
    });

    clearBgImageBtn.addEventListener('click', async () => {
        bgImageInput.value = '';
        draftTheme.backgroundImageUrl = null;

        updateColorState();
        updatePreviewDraft();
        updateSaveButtonState();
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
        updateSaveButtonState();
    });
}