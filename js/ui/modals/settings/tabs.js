export function initTabs({
  rootSelector,
  tabButtonSelector,
  tabContentSelector,
  activeClass = 'active',
  hiddenClass = 'is-hidden'
}) {

  const root = document.querySelector(rootSelector);
  if (!root) return;

  const buttons = root.querySelectorAll(tabButtonSelector);
  const contents = root.querySelectorAll(tabContentSelector);

  function activate(tabId) {

    buttons.forEach(btn => btn.classList.remove(activeClass));

    contents.forEach(tab => {
      tab.classList.add(hiddenClass);
    });

    const btn = root.querySelector(
      `${tabButtonSelector}[data-tab="${tabId}"]`
    );

    if (btn) {
      btn.classList.add(activeClass);
    }

    const content = root.querySelector(`#${tabId}`);

    if (content) {
      content.classList.remove(hiddenClass);

      requestAnimationFrame(() => {
        content.scrollTop = 0;
      });
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      activate(btn.dataset.tab);
    });
  });

  return { activate };

}