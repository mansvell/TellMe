import { Capacitor } from "@capacitor/core";

export const DEFAULT_PUBLIC_ORIGIN = "https://tellmeall.vercel.app";

export function getPublicOrigin(): string {
    if (!Capacitor.isNativePlatform()) return window.location.origin;
    const configured = new URL(import.meta.env.VITE_PUBLIC_SITE_URL || DEFAULT_PUBLIC_ORIGIN);
    if (configured.protocol !== "https:") throw new Error("The public app URL must use HTTPS.");
    return configured.origin;
}

export function publicLink(path: string): string {
    return new URL(path, getPublicOrigin()).href;
}

// Seuls nos liens de groupe/Buzz sont acceptés ; aucune URL externe arbitraire.
export function appPathFromUrl(input: string): string | null {
    try {
        if (/\/(?:\.|%2e){1,2}(?:\/|$)/i.test(input)) return null;
        const url = new URL(input);
        const nativeScheme = url.protocol === "tellme:";
        if (!nativeScheme && (url.protocol !== "https:" || url.origin !== getPublicOrigin())) return null;
        const path = nativeScheme ? `/${url.hostname}${url.pathname}` : url.pathname;
        if (!/^\/(join|b)\/[a-zA-Z0-9_-]{1,160}$/.test(path)) return null;
        return path;
    } catch { return null; }
}
