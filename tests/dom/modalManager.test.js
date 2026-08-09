import { beforeEach, describe, expect, test, vi } from 'vitest';

let modalManager;
let sequence = 0;

beforeEach(async () => {
  globalThis.requestAnimationFrame = callback => callback();
  globalThis.chrome ||= {
    runtime: { getManifest: () => ({ version: '0.1.1' }) }
  };
  modalManager ||= await import('../../js/ui/modalManager.js');
  document.body.replaceChildren();
});

describe('modal manager accessibility', () => {
  test('labels dialogs, traps focus and restores the opening control', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-card">
        <h2>Dialog title</h2>
        <button id="first">First</button>
        <button id="last">Last</button>
      </div>
    `;
    document.body.append(opener, modal);
    opener.focus();

    const id = `test-modal-${++sequence}`;
    modalManager.registerModal({ id, element: modal });
    modalManager.openModal(id, { initialFocus: modal.querySelector('#first') });

    expect(modal.hidden).toBe(false);
    expect(modal.classList.contains('is-open')).toBe(true);
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement.id).toBe('first');

    modal.querySelector('#last').focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe('first');

    modalManager.closeModal();
    expect(modal.hidden).toBe(true);
    expect(document.activeElement).toBe(opener);
  });
});
