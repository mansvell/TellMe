import { Capacitor } from "@capacitor/core";
import { nativeAuthStorage } from "../mobile/storage";

export const AUTH_STORAGE_KEY = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
const MARKER_KEY = "tellme-account-transfer";
export const TRANSFER_DISPLAY_KEY = "tellme-transfer-display";
export type TransferMarker = { lookup: string; ownerId: string; sessionId: string; expiresAt: string };
export type TransferState = "pending" | "claimed" | "cancelled" | "expired" | "unavailable";
const baseStorage = Capacitor.isNativePlatform() ? nativeAuthStorage : {
    getItem: async (key: string) => localStorage.getItem(key),
    setItem: async (key: string, value: string) => { localStorage.setItem(key, value); },
    removeItem: async (key: string) => { localStorage.removeItem(key); },
};

// Appel public sans session : l'ancien jeton ne doit jamais être rafraîchi pour
// savoir si son transfert a déjà été consommé depuis l'icône.
export async function transferPublicRpc(name: "account_transfer_state" | "claim_account_transfer" | "finish_account_transfer", parameters: Record<string, string>): Promise<unknown> {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: "POST", headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(parameters), cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("TRANSFER_STATUS_UNAVAILABLE");
    return response.json();
}
export async function readTransferState(lookup: string): Promise<TransferState> {
    const state = await transferPublicRpc("account_transfer_state", { p_lookup: lookup });
    if (!["pending", "claimed", "cancelled", "expired", "unavailable"].includes(String(state))) throw new Error("TRANSFER_STATUS_UNAVAILABLE");
    return state as TransferState;
}
export async function getTransferMarker(): Promise<TransferMarker | null> {
    const raw = await baseStorage.getItem(MARKER_KEY);
    if (!raw) return null;
    const marker = JSON.parse(raw) as TransferMarker;
    if (!/^[a-f0-9]{64}$/.test(marker.lookup) || typeof marker.ownerId !== "string") throw new Error("INVALID_TRANSFER_MARKER");
    return marker;
}
export async function saveTransferMarker(marker: TransferMarker) {
    await baseStorage.setItem(MARKER_KEY, JSON.stringify(marker));
}
export async function clearTransferMarker(expectedLookup: string) {
    const current = await getTransferMarker();
    if (current?.lookup !== expectedLookup) return;
    await baseStorage.removeItem(MARKER_KEY);
    const display = sessionStorage.getItem(TRANSFER_DISPLAY_KEY);
    if (display && (JSON.parse(display) as { lookup?: string }).lookup === expectedLookup) sessionStorage.removeItem(TRANSFER_DISPLAY_KEY);
}
export function authSessionId(accessToken: string): string {
    const part = accessToken.split(".")[1];
    const value: unknown = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))).session_id;
    if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) throw new Error("INVALID_TRANSFER_SESSION");
    return value;
}
function matchesSession(raw: string, marker: TransferMarker): boolean {
    const session = JSON.parse(raw) as { user?: { id?: string }; access_token?: string };
    return session.user?.id === marker.ownerId && Boolean(session.access_token) && authSessionId(session.access_token!) === marker.sessionId;
}
const CLAIM_KEY = "tellme-transfer-claim";
export async function recipientForTransfer(lookup: string, create: () => Promise<string>): Promise<string> {
    const select = () => selectRecipient(lookup, create);
    if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request("tellme-transfer-recipient", select);
    return select();
}
async function selectRecipient(lookup: string, create: () => Promise<string>): Promise<string> {
    const raw = await baseStorage.getItem(CLAIM_KEY);
    if (raw) {
        const claim = JSON.parse(raw) as { lookup?: string; recipientHash?: string };
        if (claim.lookup === lookup && /^[a-f0-9]{64}$/.test(claim.recipientHash ?? "")) return claim.recipientHash!;
    }
    const recipientHash = await create();
    await baseStorage.setItem(CLAIM_KEY, JSON.stringify({ lookup, recipientHash }));
    return recipientHash;
}
export async function clearTransferClaim() { await baseStorage.removeItem(CLAIM_KEY); }
export async function completeSourceTransfer(marker: TransferMarker): Promise<void> {
    const raw = await baseStorage.getItem(AUTH_STORAGE_KEY);
    // Ne déconnecte jamais un autre compte ouvert entre-temps dans ce navigateur.
    if (raw && !matchesSession(raw, marker)) {
        await clearTransferMarker(marker.lookup); return;
    }
    localStorage.setItem(MOVED_KEY, JSON.stringify(marker));
    await baseStorage.removeItem(AUTH_STORAGE_KEY);
    await baseStorage.removeItem("tellme-known-account");
    localStorage.removeItem("tellme-known-account");
    await clearTransferMarker(marker.lookup);
    // Pas de signOut serveur : cela révoquerait aussi la session déplacée.
    window.location.replace("/transfer?done=1");
}

export const transferAuthStorage = {
    async getItem(key: string): Promise<string | null> {
        const raw = await baseStorage.getItem(key);
        if (key !== AUTH_STORAGE_KEY || !raw) return raw;
        const marker = await getTransferMarker();
        if (!marker) return raw;
        if (!matchesSession(raw, marker)) {
            await clearTransferMarker(marker.lookup); return raw;
        }
        const state = await readTransferState(marker.lookup);
        if (state === "claimed") { await completeSourceTransfer(marker); return null; }
        if (state === "expired" || state === "cancelled") await clearTransferMarker(marker.lookup);
        if (state === "unavailable") throw Object.assign(new Error("TRANSFER_STATUS_UNAVAILABLE"), { code: "account_transfer_missing" });
        return raw;
    },
    setItem: baseStorage.setItem,
    removeItem: baseStorage.removeItem,
};

// Les autres onglets ne doivent pas garder une conversation en mémoire après le
// déplacement de leur session. Le reçu ne contient aucune information de connexion.
const MOVED_KEY = "tellme-transfer-moved";
export function watchTransferredSession(): () => void {
    const onStorage = (event: StorageEvent) => {
        if (event.key !== AUTH_STORAGE_KEY || event.newValue !== null || !event.oldValue) return;
        try {
            const receipt = localStorage.getItem(MOVED_KEY);
            if (!receipt) return;
            const marker = JSON.parse(receipt) as TransferMarker;
            if (matchesSession(event.oldValue, marker)) window.location.replace("/transfer?done=1");
        } catch { /* Le contrôle de session normal reste actif. */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
}
