import { flashSuccess } from "../../flash.js";

/**
 * Creates a lockable input controller.
 * Manages lock/unlock, clear and copy behavior for an input element.
 *
 * @param {Object} config
 * @param {HTMLInputElement} config.input
 * @param {HTMLElement} config.toggleBtn
 * @param {HTMLElement} [config.clearBtn]
 * @param {HTMLElement} [config.copyBtn]
 * @param {boolean} [config.initialLocked=false]
 * @param {Function} [config.onChange]
 * @returns {{ isLocked: () => boolean, setLocked: (v: boolean) => void }}
 */
export function createLockableInputController({
  input,
  toggleBtn,
  clearBtn,
  copyBtn,
  initialLocked = false,
  onChange = () => {}
}) {
  let locked = initialLocked;

  function updateUI() {
    const hasValue = input.value.trim() !== '';

    input.readOnly = locked;
    input.classList.toggle('input-locked', locked);

    toggleBtn.textContent = locked ? '🔒' : '🔓';
    toggleBtn.classList.toggle('is-locked', locked);

    toggleBtn.style.display = hasValue ? '' : 'none';

    if (clearBtn) {
      clearBtn.style.display =
      hasValue && !locked ? '' : 'none';
    }

    if (copyBtn) {
      copyBtn.style.display =
      hasValue ? '' : 'none';
    }
  }

  function setLocked(value) {
    locked = Boolean(value);
    updateUI();
    onChange();
  }

  function isLocked() {
    return locked;
  }

  // Events
  toggleBtn.addEventListener('click', () => {
    setLocked(!locked);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (locked) return;
      input.value = '';
      updateUI();
      onChange();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!input.value) return;
      await navigator.clipboard.writeText(input.value);
      flashSuccess('flash.settings.copied');
    });
  }

  input.addEventListener('input', () => {
    updateUI();
    onChange();
  });

  updateUI();

  return {
    isLocked,
    setLocked
  };
}