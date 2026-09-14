import { t } from '../core/i18n.js';
import { applyGridItemPosition } from './gridItemLayout.js';
import { addDragAndResize } from './bookmark/dragResize.js';
import { openRecycleBinModal } from './modals/recycleBinModal.js';
import { isGridKeyboardActive } from './bookmark/gridKeyboardNavigation.js';
import { createItemActionButton } from './bookmark/actions.js';
import { isVisuallyDark } from './bookmark/utils.js';
import { openRecycleBinEditor } from './modals/recycleBinEditorModal.js';
import { applyRecycleBinAppearance, createRecycleBinGlyph } from './recycleBinAppearance.js';

export function createRecycleBinElement({ container, recycleBin, trash, isEditing }) {
  const element = document.createElement('div');
  element.className = 'recycle-bin';
  element.dataset.recycleBinId = recycleBin.id;
  element.classList.toggle('is-editing', isEditing);
  element.classList.toggle('is-keyboard-active', isGridKeyboardActive(recycleBin.id));
  applyRecycleBinAppearance(element, recycleBin);
  applyGridItemPosition(container, element, recycleBin);

  const button = document.createElement('button');
  button.className = 'recycle-bin-open';
  button.type = 'button';
  button.title = t('recycleBin.open');
  button.setAttribute('aria-label', t('recycleBin.openCount', { count: trash.length }));

  const glyph = createRecycleBinGlyph();

  const caption = document.createElement('span');
  caption.className = 'recycle-bin-caption';
  const title = document.createElement('strong');
  title.textContent = t('recycleBin.title');
  const count = document.createElement('small');
  count.textContent = t(
    trash.length === 1 ? 'recycleBin.countOne' : 'recycleBin.count',
    { count: trash.length }
  );
  caption.append(title, count);

  const dropFeedback = document.createElement('span');
  dropFeedback.className = 'recycle-bin-drop-feedback';
  dropFeedback.textContent = t('recycleBin.dropHint');

  button.append(glyph, caption, dropFeedback);
  button.addEventListener('click', event => {
    if (element.classList.contains('is-editing') || element.dataset.suppressOpen === 'true') {
      event.preventDefault();
      return;
    }
    openRecycleBinModal();
  });
  element.append(button);

  if (isEditing) enableRecycleBinEditing(container, element, recycleBin);
  return element;
}

export function enableRecycleBinEditing(container, element, recycleBin) {
  if (element.dataset.editingControlsAttached === 'true') return;
  element.dataset.editingControlsAttached = 'true';
  addRecycleBinActions(element, recycleBin);
  addDragAndResize(container, element, recycleBin, { kind: 'recycle-bin' });
}

function addRecycleBinActions(container, recycleBin) {
  const themeClass = recycleBin.backgroundColor && !recycleBin.noBackground
    ? (isVisuallyDark(recycleBin) ? 'is-dark' : 'is-light')
    : defaultActionTheme();
  const actions = document.createElement('div');
  actions.className = 'item-actions recycle-bin-item-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', t('recycleBin.editor.actions'));

  const editButton = createItemActionButton(
    '✎',
    'edit',
    themeClass,
    openRecycleBinEditor
  );
  editButton.setAttribute('aria-label', t('recycleBin.editor.edit'));
  actions.append(editButton);
  container.append(actions);
}

function defaultActionTheme() {
  const interfaceTheme = document.documentElement.dataset.interfaceTheme;
  if (interfaceTheme === 'light') return 'is-light';
  if (interfaceTheme === 'dark') return 'is-dark';
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'is-dark' : 'is-light';
}
