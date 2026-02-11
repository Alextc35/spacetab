export function applyGlobalTheme(settings) {
  const root = document.documentElement;

  root.style.setProperty(
    '--color-bg-main',
    settings.theme.backgroundColor
  );

  if (settings.theme.backgroundImageUrl) {
    root.style.setProperty(
      '--image-bg-main',
      `url("${settings.theme.backgroundImageUrl}")`
    );
  } else {
    root.style.setProperty('--image-bg-main', 'none');
  }
}