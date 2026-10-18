export type Theme = "dark" | "light";

const STORAGE_KEY = "monkii.theme";

export function getTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#FFF8EE" : "#1A0F05");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode: not remembered
  }
}
