export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "fileflow-theme";

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && prefersDark));
  document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme;
}
