import { t } from '../core/i18n.js';
import { applyGridItemPosition } from './gridItemLayout.js';
import { addDragAndResize } from './bookmark/dragResize.js';
import { openRecycleBinModal } from './modals/recycleBinModal.js';
import { isGridKeyboardActive } from './bookmark/gridKeyboardNavigation.js';

export function createRecycleBinElement({ container, recycleBin, trash, isEditing }) {
  const element = document.createElement('div');
  element.className = 'recycle-bin';
  element.dataset.recycleBinId = recycleBin.id;
  element.classList.toggle('is-editing', isEditing);
  element.classList.toggle('is-keyboard-active', isGridKeyboardActive(recycleBin.id));
  applyGridItemPosition(container, element, recycleBin);

  const button = document.createElement('button');
  button.className = 'recycle-bin-open';
  button.type = 'button';
  button.title = t('recycleBin.open');
  button.setAttribute('aria-label', t('recycleBin.openCount', { count: trash.length }));

  const glyph = document.createElement('span');
  glyph.className = 'recycle-bin-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.append(
    Object.assign(document.createElement('span'), { className: 'recycle-bin-lid' }),
    Object.assign(document.createElement('span'), { className: 'recycle-bin-can' })
  );

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
    if (isEditing || element.dataset.suppressOpen === 'true') {
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
  addDragAndResize(container, element, recycleBin, { kind: 'recycle-bin' });
}
