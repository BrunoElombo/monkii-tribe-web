import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import fr from "./fr.json";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "monkii.language";

function storedLanguage(): LanguageCode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: storedLanguage(), // English by default, French on demand
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes
});

export function setLanguage(code: LanguageCode) {
  void i18n.changeLanguage(code);
  document.documentElement.lang = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode: the choice simply is not remembered
  }
}

document.documentElement.lang = i18n.language;

export default i18n;
