/**
 * modalManager.js
 * ------------------------------------------------------
 * Centralized modal stack manager with keyboard handling.
 *
 * Responsibilities:
 * - Acts as the single authority for modal open/close state
 * - Manages a modal stack (supports nested modals)
 * - Handles global keyboard shortcuts (Enter / Escape)
 * - Restores focus correctly when modals close
 * - Prevents accidental global Enter re-triggering
 *
 * Notes:
 * - Only one modal is considered "active" at a time (top of stack)
 * - Modals must be registered before they can be opened
 * - Consumers should NEVER manipulate modal visibility directly
 * ------------------------------------------------------
 */

import { DEBUG } from '../core/config.js';

/**
 * Stack of currently open modals.
 *
 * The last element is always the active modal.
 *
 * @type {Array<Object>}
 */
const stack = [];

/**
 * Registry of all known modals.
 *
 * Keyed by modal id.
 *
 * @type {Map<string, Object>}
 */
const registry = new Map();

/**
 * Returns the currently active modal (top of stack).
 *
 * @returns {Object|null}
 */
function getActive() {
  return stack[stack.length - 1] || null;
}

/**
 * Returns whether any modal is currently open.
 *
 * Used by global keyboard handlers to avoid conflicts.
 *
 * @returns {boolean}
 */
export function hasOpenModal() {
  if (DEBUG && (stack.length != 0)) console.log('Modal stack:', stack.map(m => m.id));
  return stack.length > 0;
}

/**
 * Flag used to suppress the next global Enter key action.
 *
 * This prevents scenarios where:
 * - Enter closes a modal
 * - The same Enter propagates to a global handler
 *
 * @type {boolean}
 */
let suppressNextGlobalEnter = false;

/**
 * Returns whether the next global Enter should be ignored.
 *
 * @returns {boolean}
 */
export function shouldSuppressGlobalEnter() {
  return suppressNextGlobalEnter;
}

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

    requestAnimationFrame(() => {
      suppressNextGlobalEnter = false;
      modal.previouslyFocused?.focus?.();
    });
    return;
  }
});

/**
 * Registers a modal with the manager.
 *
 * A modal must be registered once before it can be opened.
 *
 * @param {Object} config
 * @param {string} config.id - Unique modal identifier
 * @param {HTMLElement} config.element - Root modal element
 * @param {boolean} [config.closeOnEsc=true]
 * @param {boolean} [config.closeOnOverlay=true]
 * @param {boolean} [config.acceptOnEnter=false]
 * @param {HTMLElement|null} [config.initialFocus=null]
 */
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

/**
 * Opens a registered modal.
 *
 * Pushes the modal onto the stack and manages focus.
 *
 * @param {string} id - Modal id
 * @param {Object} [options]
 * @param {Function} [options.onAccept]
 * @param {Function} [options.onCancel]
 * @param {HTMLElement|null} [options.initialFocus]
 */
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

/**
 * Closes the currently active modal.
 *
 * Pops it from the stack and restores focus.
 */
export function closeModal() {
  const modal = stack.pop();
  if (!modal) return;

  modal.element.style.display = 'none';

  if (!suppressNextGlobalEnter) { modal.previouslyFocused?.focus?.(); }
}