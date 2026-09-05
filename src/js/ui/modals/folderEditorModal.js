import {
  BOOKMARK_FOLDER_NAME_MAX_LENGTH,
  updateBookmarkFolder
} from '../../core/bookmarkFolders.js';
import { validateFolderDraft } from '../../core/folderModel.js';
import { t } from '../../core/i18n.js';
import { getState, getStorageMode } from '../../core/store.js';
import { createFolderVisual, applyFolderAppearance } from '../folder/visual.js';
import { flashSuccess } from '../flash.js';
import { initTabs } from '../tabs.js';
import { closeModal, openModal, registerModal } from '../modalManager.js';
import {
  getImageInputValue,
  initLocalImageUpload,
  setLocalImageSyncNoticeVisibility,
  setImageInputValue
} from '../localImageUpload.js';
import { showAlert } from './alert.js';
import { createLockableInputController } from './helper/stateLocked.js';
import { ensurePanelFits } from '../viewportMode.js';

let initialized = false;
let activeFolderId = null;
let initialValue = null;
let modal;
let nameInput;
let noBackgroundInput;
let colorInput;
let outerColorInput;
let outerColorResetButton;
let outerBackgroundColor = null;
let showFolderInput;
let showPreviewsInput;
let showNameInput;
let showCountInput;
let imageInput;
let localImageInput;
let imageUploadInput;
let imageUploadButton;
let imageUploadNotice;
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
  outerColorInput = document.getElementById('folder-editor-outer-color');
  outerColorResetButton = document.getElementById('folder-editor-outer-color-reset');
  showFolderInput = document.getElementById('folder-editor-show-folder');
  showPreviewsInput = document.getElementById('folder-editor-show-previews');
  showNameInput = document.getElementById('folder-editor-show-name');
  showCountInput = document.getElementById('folder-editor-show-count');
  imageInput = document.getElementById('folder-editor-image');
  localImageInput = document.getElementById('folder-editor-image-local');
  imageUploadInput = document.getElementById('folder-editor-image-upload-input');
  imageUploadButton = document.getElementById('folder-editor-image-upload');
  imageUploadNotice = imageUploadButton?.parentElement?.querySelector('.local-image-notice');
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
  for (const input of [
    noBackgroundInput, showFolderInput, showPreviewsInput, showNameInput, showCountInput
  ]) {
    input.addEventListener('change', handleInput);
  }
  outerColorInput.addEventListener('input', () => {
    outerBackgroundColor = outerColorInput.value;
    handleInput();
  });
  outerColorResetButton.addEventListener('click', () => {
    outerBackgroundColor = null;
    outerColorInput.value = '#0f172a';
    handleInput();
  });
  imageController = createLockableInputController({
    input: imageInput,
    toggleBtn: document.getElementById('folder-editor-image-toggle'),
    copyBtn: document.getElementById('folder-editor-image-copy'),
    clearBtn: document.getElementById('folder-editor-image-clear'),
    onChange: handleInput
  });
  initLocalImageUpload({
    button: imageUploadButton,
    fileInput: imageUploadInput,
    targetInput: localImageInput,
    clearButton: document.getElementById('folder-editor-image-local-clear'),
    onChange: handleInput
  });
  document.getElementById('edit-folder-modal-cancel')
    .addEventListener('click', handleCancel);
  saveButton.addEventListener('click', handleSave);

  registerModal({
    id: 'folder-editor',
    element: modal,
    requiresWideViewport: true,
    closeOnEsc: true,
    closeOnOverlay: true,
    acceptOnEnter: true
  });
}

export function openFolderEditor(folderId) {
  if (!ensurePanelFits()) return;
  const folder = getState().data.folders.find(item => item.id === folderId);
  if (!folder) return;

  activeFolderId = folderId;
  initialValue = editableFolderValue(folder);
  nameInput.maxLength = BOOKMARK_FOLDER_NAME_MAX_LENGTH;
  nameInput.value = initialValue.name;
  noBackgroundInput.checked = initialValue.noBackground;
  colorInput.value = initialValue.backgroundColor;
  outerBackgroundColor = initialValue.outerBackgroundColor;
  outerColorInput.value = outerBackgroundColor || '#0f172a';
  showFolderInput.checked = initialValue.showFolder;
  showPreviewsInput.checked = initialValue.showPreviews;
  showNameInput.checked = initialValue.showName;
  showCountInput.checked = initialValue.showCount;
  setImageInputValue(imageInput, initialValue.backgroundImageUrl);
  setImageInputValue(localImageInput, initialValue.backgroundImageLocal);
  textColorInput.value = initialValue.textColor;
  imageController.setLocked(initialValue.backgroundImageUrlLocked);
  setLocalImageSyncNoticeVisibility(imageUploadNotice, getStorageMode());
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
    outerBackgroundColor,
    showFolder: showFolderInput.checked,
    showPreviews: showFolderInput.checked && showPreviewsInput.checked,
    showName: showNameInput.checked,
    showCount: showCountInput.checked,
    backgroundImageUrl: getImageInputValue(imageInput) || null,
    backgroundImageLocal: getImageInputValue(localImageInput) || null,
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
    || current.outerBackgroundColor !== initialValue.outerBackgroundColor
    || current.showFolder !== initialValue.showFolder
    || current.showPreviews !== initialValue.showPreviews
    || current.showName !== initialValue.showName
    || current.showCount !== initialValue.showCount
    || current.backgroundImageUrl !== initialValue.backgroundImageUrl
    || current.backgroundImageLocal !== initialValue.backgroundImageLocal
    || current.backgroundImageUrlLocked !== initialValue.backgroundImageUrlLocked
    || current.textColor !== initialValue.textColor;
}

function syncStyleControls() {
  colorInput.disabled = noBackgroundInput.checked;
  if (!showFolderInput.checked) showPreviewsInput.checked = false;
  showPreviewsInput.disabled = !showFolderInput.checked;
  outerColorResetButton.disabled = outerBackgroundColor === null;
}

function syncSaveButton() {
  const changed = isDirty();
  saveButton.disabled = !changed;
  saveButton.classList.toggle('is-hidden', !changed);
}

function renderPreview() {
  const folder = currentValue();
  const bookmarks = getState().data.bookmarks.filter(
    bookmark => bookmark.folderId === activeFolderId
  );
  const count = bookmarks.length;
  const name = folder.name.trim() || t('folder.editor.previewName');
  const card = document.createElement('div');
  card.className = 'folder-editor-preview-card';
  card.setAttribute('role', 'img');
  card.setAttribute('aria-label', `${name}, ${t('folder.count', { count })}`);
  applyFolderAppearance(card, folder);
  card.append(createFolderVisual(folder, bookmarks));

  const caption = document.createElement('span');
  caption.className = 'folder-caption';
  const title = document.createElement('span');
  title.className = 'folder-title';
  title.textContent = name;
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
  closeModal('folder-editor');
}
