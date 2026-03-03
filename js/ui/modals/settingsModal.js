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

    const bookmarkBgColor = document.getElementById('settings-bookmark-background-color');
    const bookmarkBgImage = document.getElementById('settings-bookmark-background-image');
    const bookmarkNoBg = document.getElementById('settings-bookmark-no-background');
    const bookmarkBgFavicon = document.getElementById('settings-bookmark-background-favicon');
    const bookmarkInvertBg = document.getElementById('settings-bookmark-invert-bg');
    const bookmarkShowText = document.getElementById('settings-bookmark-show-text');
    const bookmarkTextColor = document.getElementById('settings-bookmark-text-color');
    const bookmarkShowFavicon = document.getElementById('settings-bookmark-show-favicon');
    const bookmarkInvertIcon = document.getElementById('settings-bookmark-invert-icon');
    const bookmarkResetBtn = document.getElementById('settings-bookmark-reset');

    const labelBookmarkInvertBg = document.querySelector('label[for="settings-bookmark-invert-bg"]');
    const labelBookmarkShowFavicon = document.querySelector('label[for="settings-bookmark-show-favicon"]');
    const labelBookmarkBgFavicon = document.querySelector('label[for="settings-bookmark-background-favicon"]');
    const labelBookmarkInvertIcon = document.querySelector('label[for="settings-bookmark-invert-icon"]');

    let bgController;

    let draftTheme = null;
    let draftLanguage = null;
    let draftBookmarkDefault = null;
    let initialSnapshot = null;

    function updateBookmarkDefaultStates() {
        const hasImage = bookmarkBgImage.value.trim() !== '';

        bookmarkBgFavicon.disabled = hasImage;
        bookmarkBgColor.disabled = bookmarkNoBg.checked;
        bookmarkTextColor.disabled = !bookmarkShowText.checked;

        bookmarkBgImage.disabled = bookmarkBgFavicon.checked;
        bookmarkShowFavicon.disabled = bookmarkBgFavicon.checked;

        bookmarkInvertBg.disabled = bookmarkBgFavicon.checked || !hasImage;

        bookmarkInvertIcon.disabled = !bookmarkBgFavicon.checked && !bookmarkShowFavicon.checked;

        if (bookmarkInvertBg.disabled) {
            labelBookmarkInvertBg.classList.add('is-disabled');
        } else {
            labelBookmarkInvertBg.classList.remove('is-disabled');
        }

        if (bookmarkShowFavicon.disabled) {
            labelBookmarkShowFavicon.classList.add('is-disabled');
        } else {
            labelBookmarkShowFavicon.classList.remove('is-disabled');
        }

        if (bookmarkBgFavicon.disabled) {
            labelBookmarkBgFavicon.classList.add('is-disabled');
        } else {
            labelBookmarkBgFavicon.classList.remove('is-disabled');
        }

        if (bookmarkInvertIcon.disabled) {
            labelBookmarkInvertIcon.classList.add('is-disabled');
        } else {
            labelBookmarkInvertIcon.classList.remove('is-disabled');
        }
    }

    function updateColorState() {
        const hasImage = bgImageInput.value.trim() !== '';
        const isLocked = bgController?.isLocked?.() ?? false;

        clearBgImageBtn.style.display = hasImage && !isLocked ? 'block' : 'none';
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
        let changed = false;

        if (draftLanguage !== initialSnapshot.language) changed = true;

        const themeKeys = Object.keys(draftTheme);
        themeKeys.forEach(k => {
            if (draftTheme[k] !== initialSnapshot.theme[k]) changed = true;
        });

        const bookmarkKeys = Object.keys(draftBookmarkDefault);
        bookmarkKeys.forEach(k => {
            if (draftBookmarkDefault[k] !== initialSnapshot.bookmarkDefault[k]) changed = true;
        });

        return changed;
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

        draftTheme = structuredClone(settings.theme);
        draftLanguage = structuredClone(settings.language);
        draftBookmarkDefault = structuredClone(settings.bookmarkDefault);

        languageSelect.value = settings.language;

        bookmarkBgColor.value = draftBookmarkDefault.backgroundColor;
        bookmarkBgImage.value = draftBookmarkDefault.backgroundImageUrl || '';
        bookmarkNoBg.checked = draftBookmarkDefault.noBackground;
        bookmarkBgFavicon.checked = draftBookmarkDefault.backgroundFavicon;
        bookmarkInvertBg.checked = draftBookmarkDefault.invertColorBg;
        bookmarkShowText.checked = draftBookmarkDefault.showText;
        bookmarkTextColor.value = draftBookmarkDefault.textColor;
        bookmarkShowFavicon.checked = draftBookmarkDefault.showFavicon;
        bookmarkInvertIcon.checked = draftBookmarkDefault.invertColorIcon;

        updateBookmarkDefaultStates();

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
            theme: structuredClone(draftTheme),
            bookmarkDefault: structuredClone(draftBookmarkDefault)
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

    bookmarkBgColor.addEventListener('input', () => {
        draftBookmarkDefault.backgroundColor = bookmarkBgColor.value;
        updateSaveButtonState();
    });

    bookmarkBgImage.addEventListener('input', () => {
        const image = bookmarkBgImage.value.trim();
        draftBookmarkDefault.backgroundImageUrl = image || null;

        updateBookmarkDefaultStates();
        updateSaveButtonState();
    });

    bookmarkNoBg.addEventListener('change', () => {
        draftBookmarkDefault.noBackground = bookmarkNoBg.checked;

        updateBookmarkDefaultStates();
        updateSaveButtonState();
    });

    bookmarkBgFavicon.addEventListener('change', () => {
        draftBookmarkDefault.backgroundFavicon = bookmarkBgFavicon.checked;

        if (bookmarkBgFavicon.checked) {
            bookmarkBgImage.value = '';
            draftBookmarkDefault.backgroundImageUrl = null;

            bookmarkShowFavicon.checked = false;
            draftBookmarkDefault.showFavicon = false;

            bookmarkInvertBg.checked = false;
            draftBookmarkDefault.invertColorBg = false;
        }

        updateBookmarkDefaultStates();
        updateSaveButtonState();
    });

    bookmarkInvertBg.addEventListener('change', () => {
        draftBookmarkDefault.invertColorBg = bookmarkInvertBg.checked;
        updateSaveButtonState();
    });

    bookmarkShowText.addEventListener('change', () => {
        draftBookmarkDefault.showText = bookmarkShowText.checked;

        if (!bookmarkShowText.checked) {
            bookmarkTextColor.disabled = true;
        }

        updateBookmarkDefaultStates();
        updateSaveButtonState();
    });

    bookmarkTextColor.addEventListener('input', () => {
        draftBookmarkDefault.textColor = bookmarkTextColor.value;
        updateSaveButtonState();
    });

    bookmarkShowFavicon.addEventListener('change', () => {
        draftBookmarkDefault.showFavicon = bookmarkShowFavicon.checked;
        updateBookmarkDefaultStates();
        updateSaveButtonState();
    });

    bookmarkInvertIcon.addEventListener('change', () => {
        draftBookmarkDefault.invertColorIcon = bookmarkInvertIcon.checked;
        updateSaveButtonState();
    });

    bookmarkResetBtn.addEventListener('click', async () => {
        const ok = await showAlert(
            t('alert.settings.bookmark.reset'),
            { type: 'confirm' }
        );
        if (!ok) return;

        draftBookmarkDefault = structuredClone(DEFAULT_SETTINGS.bookmarkDefault);

        bookmarkBgColor.value = draftBookmarkDefault.backgroundColor;
        bookmarkBgImage.value = draftBookmarkDefault.backgroundImageUrl || '';
        bookmarkNoBg.checked = draftBookmarkDefault.noBackground;
        bookmarkBgFavicon.checked = draftBookmarkDefault.backgroundFavicon;
        bookmarkInvertBg.checked = draftBookmarkDefault.invertColorBg;
        bookmarkShowText.checked = draftBookmarkDefault.showText;
        bookmarkTextColor.value = draftBookmarkDefault.textColor;
        bookmarkShowFavicon.checked = draftBookmarkDefault.showFavicon;
        bookmarkInvertIcon.checked = draftBookmarkDefault.invertColorIcon;

        updateBookmarkDefaultStates();
        updateSaveButtonState();
    });
}