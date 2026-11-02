import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const DEVICE_KEYS = ["tellme-theme", "tellme-language", "tellme-known-account"];

export async function restoreDevicePreferences(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await Promise.all(DEVICE_KEYS.map(async key => {
        const { value } = await Preferences.get({ key });
        if (value !== null) localStorage.setItem(key, value);
    }));
}

export function setDevicePreference(key: string, value: string): void {
    localStorage.setItem(key, value);
    if (Capacitor.isNativePlatform()) {
        void Preferences.set({ key, value }).catch(() => {
            console.error("Could not persist app preference.");
        });
    }
}

// Supabase accepte un stockage asynchrone. Sur mobile, il ne dépend ainsi
// pas du localStorage que le système peut nettoyer indépendamment de l'app.
export const nativeAuthStorage = {
    getItem: async (key: string) => (await Preferences.get({ key })).value,
    setItem: async (key: string, value: string) => { await Preferences.set({ key, value }); },
    removeItem: async (key: string) => { await Preferences.remove({ key }); },
};
