import { catalog } from "./catalog";
export type Language = "fr" | "en" | "de";
const KEY = "tellme-language";
const listeners = new Set<() => void>();
export function getLanguage(): Language {
    const value = localStorage.getItem(KEY);
    return value === "en" || value === "de" ? value : "fr";
}
export function setLanguage(language: Language) {
    localStorage.setItem(KEY, language);
    document.documentElement.lang = language;
    listeners.forEach(listener => listener());
}
export function subscribeLanguage(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function getLocale() {
    return { fr: "fr-FR", en: "en-GB", de: "de-DE" }[getLanguage()];
}
export function t(source: string, values: Record<string, string | number> = {}): string {
    const language = getLanguage();
    const entry = catalog[source] ?? catalog[source.trim()];
    const text = language === "fr" ? source : entry?.[language] ?? source;
    return text.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
