import { t } from '../../core/i18n.js';
import { normalizeRecycleBinStyle } from '../../core/recycleBinModel.js';
import { updateRecycleBinAppearance } from '../../core/recycleBin.js';
import { getState, waitForPersistence } from '../../core/store.js';
import { flashSuccess } from '../flash.js';
import { applyRecycleBinAppearance, createRecycleBinGlyph } from '../recycleBinAppearance.js';
import { ensurePanelFits } from '../viewportMode.js';
import { closeModal, openModal, registerModal } from '../modalManager.js';
import { showAlert } from './alert.js';

let initialized = false;
let initialValue = null;
let modal;
let customBackgroundInput;
let backgroundColorInput;
let iconColorInput;
let customTextInput;
let textColorInput;
let showIconInput;
let showNameInput;
let showCountInput;
let visibleInput;
let preview;
let saveButton;

export function initRecycleBinEditorModal() {
  if (initialized) return;
  initialized = true;

  modal = document.getElementById('edit-recycle-bin-modal');
  customBackgroundInput = document.getElementById('recycle-bin-editor-custom-background');
  backgroundColorInput = document.getElementById('recycle-bin-editor-background-color');
  iconColorInput = document.getElementById('recycle-bin-editor-icon-color');
  customTextInput = document.getElementById('recycle-bin-editor-custom-text');
  textColorInput = document.getElementById('recycle-bin-editor-text-color');
  showIconInput = document.getElementById('recycle-bin-editor-show-icon');
  showNameInput = document.getElementById('recycle-bin-editor-show-name');
  showCountInput = document.getElementById('recycle-bin-editor-show-count');
  visibleInput = document.getElementById('recycle-bin-editor-visible');
  preview = document.getElementById('recycle-bin-editor-preview');
  saveButton = document.getElementById('edit-recycle-bin-modal-save');

  for (const input of [backgroundColorInput, iconColorInput, textColorInput]) {
    input.addEventListener('input', handleInput);
  }
  for (const input of [
    customBackgroundInput,
    customTextInput,
    showIconInput,
    showNameInput,
    showCountInput,
    visibleInput
  ]) {
    input.addEventListener('change', handleInput);
  }
  document.getElementById('edit-recycle-bin-modal-cancel').addEventListener('click', handleCancel);
  saveButton.addEventListener('click', handleSave);

  registerModal({
    id: 'recycle-bin-editor',
    element: modal,
    requiresWideViewport: true,
    closeOnEsc: true,
    closeOnOverlay: true,
    acceptOnEnter: true
  });
}

export function openRecycleBinEditor() {
  if (!ensurePanelFits()) return;
  const { recycleBin, settings } = getState().data;
  const style = normalizeRecycleBinStyle(recycleBin);
  initialValue = { ...style, showRecycleBin: settings.showRecycleBin !== false };

  customBackgroundInput.checked = Boolean(style.backgroundColor);
  backgroundColorInput.value = style.backgroundColor || '#0f172a';
  iconColorInput.value = style.iconColor;
  customTextInput.checked = Boolean(style.textColor);
  textColorInput.value = style.textColor || '#f8fafc';
  showIconInput.checked = style.showIcon;
  showNameInput.checked = style.showName;
  showCountInput.checked = style.showCount;
  visibleInput.checked = initialValue.showRecycleBin;
  syncControls();
  renderPreview();
  syncSaveButton();

  openModal('recycle-bin-editor', {
    onAccept: handleSave,
    onCancel: handleCancel,
    initialFocus: customBackgroundInput
  });
}

function handleInput() {
  syncControls();
  renderPreview();
  syncSaveButton();
}

function currentValue() {
  return {
    backgroundColor: customBackgroundInput.checked ? backgroundColorInput.value : null,
    iconColor: iconColorInput.value,
    textColor: customTextInput.checked ? textColorInput.value : null,
    showIcon: showIconInput.checked,
    showName: showNameInput.checked,
    showCount: showCountInput.checked,
    showRecycleBin: visibleInput.checked
  };
}

function syncControls() {
  backgroundColorInput.disabled = !customBackgroundInput.checked;
  textColorInput.disabled = !customTextInput.checked;
}

function isDirty() {
  return initialValue !== null
    && JSON.stringify(currentValue()) !== JSON.stringify(initialValue);
}

function syncSaveButton() {
  const changed = isDirty();
  saveButton.disabled = !changed;
  saveButton.classList.toggle('is-hidden', !changed);
}

function renderPreview() {
  const value = currentValue();
  const countValue = getState().data.trash.length;
  const card = document.createElement('div');
  card.className = 'recycle-bin recycle-bin-editor-preview-card';
  applyRecycleBinAppearance(card, value);

  const content = document.createElement('div');
  content.className = 'recycle-bin-open';
  const caption = document.createElement('span');
  caption.className = 'recycle-bin-caption';
  const title = document.createElement('strong');
  title.textContent = t('recycleBin.title');
  const count = document.createElement('small');
  count.textContent = t(countValue === 1 ? 'recycleBin.countOne' : 'recycleBin.count', {
    count: countValue
  });
  caption.append(title, count);
  content.append(createRecycleBinGlyph(), caption);
  card.append(content);
  preview.replaceChildren(card);
}

async function handleSave() {
  if (!isDirty()) return;
  saveButton.disabled = true;
  await updateRecycleBinAppearance(currentValue());
  await waitForPersistence();
  flashSuccess('flash.recycleBin.updated');
  closeRecycleBinEditor();
}

async function handleCancel() {
  if (isDirty()) {
    const confirmed = await showAlert(t('alert.recycleBin.cancel'), { type: 'confirm' });
    if (!confirmed) return false;
  }
  closeRecycleBinEditor();
  return true;
}

function closeRecycleBinEditor() {
  initialValue = null;
  closeModal('recycle-bin-editor');
}
