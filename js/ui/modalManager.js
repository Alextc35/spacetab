// ui/modalManager.js
import { DEBUG } from '../core/config.js';

const stack = [];
const registry = new Map();

function getActive() {
  return stack[stack.length - 1] || null;
}

export function hasOpenModal() {
  if (DEBUG && (stack.length != 0)) console.log('Modal stack:', stack.map(m => m.id));
  return stack.length > 0;
}

let suppressNextGlobalEnter = false;

export function shouldSuppressGlobalEnter() {
  return suppressNextGlobalEnter;
}

/* ======================= Global keyboard ======================= */

document.addEventListener('keydown', (e) => {
  const modal = getActive();
  if (!modal) return;

  if (e.key === 'Escape' && modal.closeOnEsc) {
    e.preventDefault();
    e.stopPropagation();
    modal.onCancel?.();
    closeModal();
  }

  if (e.key === 'Enter' && modal.acceptOnEnter) {
    e.preventDefault();
    e.stopPropagation();
    suppressNextGlobalEnter = true;
    modal.onAccept?.();
    closeModal();
    requestAnimationFrame(() => {
      suppressNextGlobalEnter = false;
    });
  }
});

/* ======================= Register ======================= */

export function registerModal({
  id,
  element,
  closeOnEsc = true,
  closeOnOverlay = true,
  acceptOnEnter = false,
  initialFocus = null
}) {
  if (!id || !element) {
    throw new Error('Modal must have id and element');
  }

  if (registry.has(id)) {
    console.warn(`Modal "${id}" already registered`);
    return;
  }

  element.dataset.modalId = id;
  element.style.display = 'none';
  element.tabIndex = -1;

  if (closeOnOverlay) {
    const overlay = element.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        const active = getActive();
        if (active?.id === id) {
          active.onCancel?.();
          closeModal();
        }
      });
    }
  }

  registry.set(id, {
    id,
    element,
    closeOnEsc,
    acceptOnEnter,
    initialFocus
  });
}

/* ======================= Open ======================= */

export function openModal(id, {
  onAccept,
  onCancel,
  initialFocus
} = {}) {
  const config = registry.get(id);
  if (!config) {
    console.error(`Modal "${id}" not registered`);
    return;
  }

  // Prevent double open
  if (getActive()?.id === id) return;

  const previouslyFocused = document.activeElement;

  stack.push({
    ...config,
    onAccept,
    onCancel,
    previouslyFocused,
    initialFocus: initialFocus || config.initialFocus
  });

  config.element.style.display = 'flex';

  const focusEl =
    initialFocus
    || config.element.querySelector('[autofocus]')
    || config.element;

  requestAnimationFrame(() => focusEl.focus());
}

/* ======================= Close ======================= */

export function closeModal() {
  const modal = stack.pop();
  if (!modal) return;

  modal.element.style.display = 'none';
  modal.previouslyFocused?.focus?.();
}