// Theme management for Floework
// Supports dynamic theme switching (e.g. Atlas Blue to Pulse Green)
// Synchronizes with document element data-theme and localStorage

export type ThemeName = 'blue' | 'green' | 'purple' | 'red';

export function getTheme(): ThemeName {
  if (typeof window === 'undefined') return 'blue';
  try {
    const saved = localStorage.getItem('floework_theme') as ThemeName;
    if (saved && ['blue', 'green', 'purple', 'red'].includes(saved)) {
      return saved;
    }
  } catch {}
  return 'blue';
}

export function setTheme(theme: ThemeName): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('floework_theme', theme);
  } catch {}
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('floework:themechange', { detail: { theme } }));
}

export function initTheme(): void {
  if (typeof window === 'undefined') return;
  const current = getTheme();
  document.documentElement.setAttribute('data-theme', current);
}
