import { initBookmarkSection } from './bookmarkSection.js';
import { initLanguageSection } from './languageSection.js';
import { initThemeSection } from './themeSection.js';
import { registerModal, openModal, closeModal } from '../../modalManager.js';
import { showAlert } from '../alertModal.js';
import { flashSuccess } from '../../flash.js';
import { getState } from '../../../core/store.js';
import { updateSettings } from '../../../core/settings.js';
import {
  initDraft,
  resetState,
  hasChanges,
  buildNewSettings
} from './settingsState.js';
import { t } from '../../../core/i18n.js';

export function initSettingsModal() {
  const settingsBtn = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsSave = document.getElementById('settings-modal-save');
  const settingsCancel = document.getElementById('settings-modal-cancel');

  /* ==================================================
     Helpers
  ================================================== */

  function updateSaveButtonState() {
    const changed = hasChanges();
    settingsSave.disabled = !changed;
    settingsSave.classList.toggle('is-hidden', !changed);
  }

  const themeSection = initThemeSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const bookmarkSection = initBookmarkSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const languageSection = initLanguageSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  function activateTab(tabId) {
    document.querySelectorAll('#settings-modal .settings-modal-tab-btn')
      .forEach(b => b.classList.remove('active'));

    document.querySelectorAll('#settings-modal .settings-modal-tab-content')
      .forEach(tab => tab.style.display = 'none');

    const btn = document.querySelector(
      `#settings-modal .settings-modal-tab-btn[data-tab="${tabId}"]`
    );

    if (btn) btn.classList.add('active');

    const content = document.getElementById(tabId);
    if (content) {
      content.style.display = 'block';
      requestAnimationFrame(() => content.scrollTop = 0);
    }
  }

  /* ==================================================
     Modal registration
  ================================================== */

  registerModal({
    id: 'settings',
    element: settingsModal,
    acceptOnEnter: false,
    closeOnEsc: false,
    closeOnOverlay: false,
    initialFocus: null
  });

  /* ==================================================
     OPEN
  ================================================== */

  settingsBtn.addEventListener('click', () => {
    const { data: { settings } } = getState();

    initDraft(settings);

    themeSection.syncUI();
    bookmarkSection.syncUI();
    languageSection.syncUI();

    updateSaveButtonState();

    activateTab('settings-modal-tab-general');
    openModal('settings');
  });

  /* ==================================================
     CANCEL / SAVE
  ================================================== */

  settingsCancel.addEventListener('click', async () => {
    if (!hasChanges()) {
      closeModal();
      return;
    }

    const ok = await showAlert(
      t('alert.settings.cancel'),
      { type: 'confirm' }
    );

    if (ok) {
      await languageSection.restoreInitialLanguage();
      resetState();
      closeModal();
    }
  });

  settingsSave.addEventListener('click', () => {
    const newSettings = buildNewSettings();

    updateSettings(newSettings);
    flashSuccess('flash.settings.saved');
    resetState();
    closeModal();
  });

    /* ==================================================
    Tabs
    ================================================== */

    document
    .querySelectorAll('#settings-modal .settings-modal-tab-btn')
    .forEach(btn => {
        btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab);
        });
    });
}