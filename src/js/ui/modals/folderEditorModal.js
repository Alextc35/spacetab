import {
  BOOKMARK_FOLDER_NAME_MAX_LENGTH,
  updateBookmarkFolder
} from '../../core/bookmarkFolders.js';
import { validateFolderDraft } from '../../core/folderModel.js';
import { t } from '../../core/i18n.js';
import { getState } from '../../core/store.js';
import { createFolderVisual, applyFolderAppearance } from '../folder/visual.js';
import { flashSuccess } from '../flash.js';
import { initTabs } from '../tabs.js';
import { closeModal, openModal, registerModal } from '../modalManager.js';
import { showAlert } from './alert.js';
import { createLockableInputController } from './helper/stateLocked.js';

let initialized = false;
let activeFolderId = null;
let initialValue = null;
let modal;
let nameInput;
let noBackgroundInput;
let colorInput;
let imageInput;
let textColorInput;
let preview;
let saveButton;
let nameError;
let imageError;
let imageController;

export function initFolderEditorModal() {
  if (initialized) return;
  initialized = true;

  modal = document.getElementById('edit-folder-modal');
  nameInput = document.getElementById('folder-editor-name');
  noBackgroundInput = document.getElementById('folder-editor-no-background');
  colorInput = document.getElementById('folder-editor-color');
  imageInput = document.getElementById('folder-editor-image');
  textColorInput = document.getElementById('folder-editor-text-color');
  preview = document.getElementById('folder-editor-preview');
  saveButton = document.getElementById('edit-folder-modal-save');
  nameError = document.getElementById('folder-editor-name-error');
  imageError = document.getElementById('folder-editor-image-error');

  initTabs({
    root: modal,
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  for (const input of [nameInput, colorInput, textColorInput]) {
    input.addEventListener('input', handleInput);
  }
  noBackgroundInput.addEventListener('change', handleInput);
  imageController = createLockableInputController({
    input: imageInput,
    toggleBtn: document.getElementById('folder-editor-image-toggle'),
    copyBtn: document.getElementById('folder-editor-image-copy'),
    clearBtn: document.getElementById('folder-editor-image-clear'),
    onChange: handleInput
  });
  document.getElementById('edit-folder-modal-cancel')
    .addEventListener('click', handleCancel);
  saveButton.addEventListener('click', handleSave);

  registerModal({
    id: 'folder-editor',
    element: modal,
    closeOnEsc: true,
    closeOnOverlay: true,
    acceptOnEnter: true
  });
}

export function openFolderEditor(folderId) {
  const folder = getState().data.folders.find(item => item.id === folderId);
  if (!folder) return;

  activeFolderId = folderId;
  initialValue = editableFolderValue(folder);
  nameInput.maxLength = BOOKMARK_FOLDER_NAME_MAX_LENGTH;
  nameInput.value = initialValue.name;
  noBackgroundInput.checked = initialValue.noBackground;
  colorInput.value = initialValue.backgroundColor;
  imageInput.value = initialValue.backgroundImageUrl ?? '';
  textColorInput.value = initialValue.textColor;
  imageController.setLocked(initialValue.backgroundImageUrlLocked);
  clearErrors();
  syncStyleControls();
  activateGeneralTab();
  renderPreview();
  syncSaveButton();

  openModal('folder-editor', {
    onAccept: handleSave,
    onCancel: handleCancel,
    initialFocus: nameInput
  });
}

function handleInput() {
  clearErrors();
  syncStyleControls();
  renderPreview();
  syncSaveButton();
}

function currentValue() {
  return {
    name: nameInput.value,
    noBackground: noBackgroundInput.checked,
    backgroundColor: colorInput.value,
    backgroundImageUrl: imageInput.value.trim() || null,
    backgroundImageUrlLocked: imageController?.isLocked() ?? false,
    textColor: textColorInput.value
  };
}

function editableFolderValue(folder) {
  const validation = validateFolderDraft(folder);
  return validation.value;
}

function isDirty() {
  if (!initialValue) return false;
  const current = currentValue();
  return current.name !== initialValue.name
    || current.noBackground !== initialValue.noBackground
    || current.backgroundColor !== initialValue.backgroundColor
    || current.backgroundImageUrl !== initialValue.backgroundImageUrl
    || current.backgroundImageUrlLocked !== initialValue.backgroundImageUrlLocked
    || current.textColor !== initialValue.textColor;
}

function syncStyleControls() {
  colorInput.disabled = noBackgroundInput.checked;
}

function syncSaveButton() {
  const changed = isDirty();
  saveButton.disabled = !changed;
  saveButton.classList.toggle('is-hidden', !changed);
}

function renderPreview() {
  const folder = currentValue();
  const count = getState().data.bookmarks.filter(
    bookmark => bookmark.folderId === activeFolderId
  ).length;
  const card = document.createElement('div');
  card.className = 'folder-editor-preview-card';
  applyFolderAppearance(card, folder);
  card.append(createFolderVisual(folder));

  const caption = document.createElement('span');
  caption.className = 'folder-caption';
  const title = document.createElement('span');
  title.className = 'folder-title';
  title.textContent = folder.name.trim() || t('folder.editor.previewName');
  const saved = document.createElement('span');
  saved.className = 'folder-count';
  saved.textContent = t('folder.count', { count });
  caption.append(title, saved);
  card.append(caption);
  preview.replaceChildren(card);
}

function handleSave() {
  if (!activeFolderId || !isDirty()) return;
  const result = validateFolderDraft(currentValue());
  if (!result.isValid) {
    renderErrors(result.errors);
    return;
  }

  const updated = updateBookmarkFolder(activeFolderId, result.value);
  if (!updated) return;

  flashSuccess('flash.folder.updated');
  closeFolderEditor();
}

async function handleCancel() {
  if (isDirty()) {
    const confirmed = await showAlert(t('alert.folder.cancel'), { type: 'confirm' });
    if (!confirmed) return false;
  }
  closeFolderEditor();
  return true;
}

function renderErrors(errors) {
  clearErrors();
  if (errors.name) {
    nameInput.setAttribute('aria-invalid', 'true');
    nameError.textContent = t(`validation.folderName.${errors.name}`);
    nameError.classList.remove('is-hidden');
  }
  if (errors.backgroundImageUrl) {
    imageInput.setAttribute('aria-invalid', 'true');
    imageError.textContent = t(
      `validation.backgroundImageUrl.${errors.backgroundImageUrl}`
    );
    imageError.classList.remove('is-hidden');
  }
}

function clearErrors() {
  nameInput.removeAttribute('aria-invalid');
  imageInput.removeAttribute('aria-invalid');
  for (const error of [nameError, imageError]) {
    error.textContent = '';
    error.classList.add('is-hidden');
  }
}

function activateGeneralTab() {
  for (const button of modal.querySelectorAll('.edit-bookmark-modal-tab-btn')) {
    const active = button.dataset.tab === 'folder-editor-panel-general';
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
  for (const panel of modal.querySelectorAll('.edit-bookmark-modal-tab-content')) {
    panel.classList.toggle('is-hidden', panel.id !== 'folder-editor-panel-general');
  }
}

function closeFolderEditor() {
  activeFolderId = null;
  initialValue = null;
  closeModal();
}
