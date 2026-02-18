export function applyGlobalTheme(settings) {
  const root = document.documentElement;

  root.style.setProperty(
    '--color-bg-body',
    settings.theme.backgroundColor
  );

  if (settings.theme.backgroundImageUrl) {
    root.style.setProperty(
      '--image-bg-body',
      `url("${settings.theme.backgroundImageUrl}")`
    );
  } else {
    root.style.setProperty('--image-bg-body', 'none');
  }
}