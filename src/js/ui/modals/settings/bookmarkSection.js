import { showAlert } from '../alert.js';
import { openBookmarkPresetEditor } from '../bookmarkModal.js';
import { t } from '../../../core/i18n.js';
import { DEFAULT_SETTINGS } from '../../../core/defaults.js';
import { normalizeBookmarkPreset } from '../../../core/bookmarkModel.js';
import { deleteAllBookmarks } from '../../bookmark/actions.js';
import { initImportExportButtons } from '../../bookmark/importExport.js';
import {
  getDraftBookmarkDefault,
  getDraftBookmarkDragMode,
  getDraftBookmarkPresets,
  replaceDraftBookmarkDefault,
  replaceDraftBookmarkPresets,
  setDraftBookmarkDragMode
} from './settingsState.js';

/**
 * Initializes the bookmark settings section.
 *
 * @param {Object} params
 * @param {Function} params.onRequestSaveStateUpdate - Callback used to refresh save-state indicators.
 * @returns {{ syncUI: Function }}
 */
export function initBookmarkSection({ onRequestSaveStateUpdate }) {
  const bookmarkConfigureBtn = document.getElementById('settings-bookmark-configure');
  const bookmarkResetBtn = document.getElementById('settings-bookmark-reset');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importInput = document.getElementById('import-input');
  const deleteAllBtn = document.getElementById('delete-all-btn');
  const presetName = document.getElementById('settings-preset-name');
  const presetSelect = document.getElementById('settings-preset-select');
  const presetSave = document.getElementById('settings-preset-save');
  const presetApply = document.getElementById('settings-preset-apply');
  const presetDelete = document.getElementById('settings-preset-delete');
  const dragModeInputs = Array.from(document.querySelectorAll(
    'input[name="bookmark-drag-mode"]'
  ));

  initImportExportButtons(exportBtn, importInput);

  bookmarkConfigureBtn.addEventListener('click', () => {
    openBookmarkPresetEditor(getDraftBookmarkDefault(), {
      onApply: preset => {
        replaceDraftBookmarkDefault(preset);
        onRequestSaveStateUpdate();
      }
    });
  });

  bookmarkResetBtn.addEventListener('click', async () => {
    const ok = await showAlert(
      t('alert.settings.bookmark.reset'),
      { type: 'confirm' }
    );
    if (!ok) return;

    replaceDraftBookmarkDefault(structuredClone(DEFAULT_SETTINGS.bookmarkDefault));
    onRequestSaveStateUpdate();
  });

  presetSave.addEventListener('click', () => {
    const name = presetName.value.trim();
    if (!name) {
      presetName.setCustomValidity(t('validation.preset.name'));
      presetName.reportValidity();
      return;
    }

    presetName.setCustomValidity('');
    const presets = structuredClone(getDraftBookmarkPresets());
    const preset = {
      id: crypto.randomUUID(),
      name,
      style: normalizeBookmarkPreset(getDraftBookmarkDefault())
    };
    presets.push(preset);
    replaceDraftBookmarkPresets(presets);
    presetName.value = '';
    renderPresetOptions(preset.id);
    onRequestSaveStateUpdate();
  });

  presetName.addEventListener('input', () => presetName.setCustomValidity(''));

  for (const input of dragModeInputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      setDraftBookmarkDragMode(input.value);
      renderDragMode();
      onRequestSaveStateUpdate();
    });
  }

  presetApply.addEventListener('click', () => {
    const selected = getDraftBookmarkPresets().find(preset => preset.id === presetSelect.value);
    if (!selected) return;
    replaceDraftBookmarkDefault(normalizeBookmarkPreset(selected.style));
    onRequestSaveStateUpdate();
  });

  presetDelete.addEventListener('click', () => {
    const presets = getDraftBookmarkPresets().filter(preset => preset.id !== presetSelect.value);
    replaceDraftBookmarkPresets(presets);
    renderPresetOptions();
    onRequestSaveStateUpdate();
  });

  function renderPresetOptions(selectedId) {
    const presets = getDraftBookmarkPresets();
    presetSelect.replaceChildren();

    if (!presets.length) {
      const option = new Option(t('settingsModal.bookmark.presets.empty'), '');
      presetSelect.add(option);
    } else {
      for (const preset of presets) presetSelect.add(new Option(preset.name, preset.id));
      presetSelect.value = selectedId && presets.some(preset => preset.id === selectedId)
        ? selectedId
        : presets[0].id;
    }

    presetSelect.disabled = presets.length === 0;
    presetApply.disabled = presets.length === 0;
    presetDelete.disabled = presets.length === 0;
  }

  function renderDragMode() {
    const mode = getDraftBookmarkDragMode();
    for (const input of dragModeInputs) {
      input.checked = input.value === mode;
      input.closest('.drag-mode-option')?.classList.toggle(
        'is-selected',
        input.checked
      );
    }
  }

  function syncUI() {
    renderDragMode();
    renderPresetOptions();
    onRequestSaveStateUpdate();
  }

  deleteAllBtn.addEventListener('click', deleteAllBookmarks);
  importBtn.addEventListener('click', () => importInput.click());

  return {
    syncUI
  };
}
