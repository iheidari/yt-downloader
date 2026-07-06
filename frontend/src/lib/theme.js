// Dark/light theme, persisted in localStorage and applied as a class on <html>.
// The initial class is set by the no-FOUC inline script in index.html; this
// module keeps runtime toggles in sync with that same storage key.
const STORAGE_KEY = 'tubekeepTheme'

export function getTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const dark = theme === 'dark'
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch (_e) {
    // storage may be unavailable (private mode) — the class still applies
  }
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
