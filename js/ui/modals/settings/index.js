import { registerModal, openModal, closeModal } from '../../modalManager.js';
import { flashSuccess } from '../../flash.js';
import { initTabs } from '../../tabs.js';

import { t } from '../../../core/i18n.js';
import { getState } from '../../../core/store.js';
import { updateSettings } from '../../../core/settings.js';

import { showAlert } from '../alert.js';

import { initGeneralSection } from './generalSection.js'; // TODO: implement general section
import { initThemeSection } from './themeSection.js';
import { initBookmarkSection } from './bookmarkSection.js';
import { initLanguageSection } from './languageSection.js';
import { initDraft, resetState, hasChanges, buildNewSettings } from './settingsState.js';

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

  const tabs = initTabs({
    root: '#settings-modal',
    tabButtonSelector: '.settings-modal-tab-btn',
    tabContentSelector: '.settings-modal-tab-content'
  });

  const bookmarkTabs = initTabs({
    root: '#settings-modal-tab-bookmark',
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  const themeSection = initThemeSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const bookmarkSection = initBookmarkSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const languageSection = initLanguageSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  /* ==================================================
     Modal registration
  ================================================== */

  registerModal({
    id: 'settings',
    element: settingsModal,
    acceptOnEnter: false,
    closeOnEsc: true,
    closeOnOverlay: false,
    initialFocus: null,
    shortcut: '.',
    toggleWithShortcut: true,
    onShortcut: () => settingsBtn.click()
  });

  async function handleCancelAttempt() {
    if (!hasChanges()) {
      closeModal();
      return true;
    }

    const ok = await showAlert(
      t('alert.settings.cancel'),
      { type: 'confirm' }
    );

    if (!ok) return false;

    await languageSection.restoreInitialLanguage();
    bookmarkSection.cancelChanges();
    resetState();
    closeModal();
    return true;
  }

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

    tabs.activate('settings-modal-tab-general');
    bookmarkTabs.activate('settings-bookmark-tab-style');
    
    openModal('settings', {
      onCancel: handleCancelAttempt
    });
  });

  /* ==================================================
     CANCEL / SAVE
  ================================================== */

  settingsCancel.addEventListener('click', handleCancelAttempt);

  settingsSave.addEventListener('click', () => {
    const newSettings = buildNewSettings();

    updateSettings(newSettings);
    flashSuccess('flash.settings.saved');
    resetState();
    closeModal();
  });
}