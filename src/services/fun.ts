import { supabase } from "../lib/supabase";
import { publicLink } from "../mobile/links";
import { getLocale, t } from "../i18n/runtime";

export const CARD_THEMES = ["blue", "violet", "pink", "night", "gradient", "slate"] as const;
export type CardTheme = typeof CARD_THEMES[number];
export type Storytime = { id: string; content: string; theme: CardTheme; created_at: string; expires_at: string; seen: boolean };
export type StorytimeViewer = { display_name: string; color: string; viewed_at: string };
export type Secret = { id: string; content: string; created_at: string; read_at: string | null; reply: string | null; card_theme: CardTheme; replied_at: string | null };
export type Cursor = { created_at: string; id: string };
type RpcArgs = Record<string, string | null>;

async function rpc<T>(name: string, args: RpcArgs = {}): Promise<T> {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw error;
    return data as T;
}

export function funError(error: unknown): string {
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
    if (/PGRST202|could not find|does not exist/i.test(message)) return t("Fun sera disponible après l’activation de la mise à jour sur le serveur.");
    if (/FUN_RATE_LIMIT|STORY_LIMIT/.test(message)) return t("La limite d’envoi est atteinte. Réessaie plus tard.");
    if (/SECRET_LINK_UNAVAILABLE/.test(message)) return t("Ce lien Secrets est indisponible.");
    if (/EXPIRED_CHALLENGE|INVALID_PROOF/.test(message)) return t("La vérification a expiré. Réessaie l’envoi.");
    return t("L’opération n’a pas abouti. Réessaie.");
}

export function elapsedTime(value: string, now = Date.now()): string {
    const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60_000));
    if (minutes < 1) return t("À l’instant");
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return t("Il y a {count} min", { count: minutes });
    if (hours < 24) return t("Il y a {count} h", { count: hours });
    const days = Math.floor(hours / 24);
    return days === 1 ? t("Il y a 1 jour") : t("Il y a {count} jours", { count: days });
}

export function expiryTime(value: string, now = Date.now()): string {
    const minutes = Math.max(0, Math.ceil((Date.parse(value) - now) / 60_000));
    return t("Expire dans {time}", { time: minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min` });
}

function cursorArgs(cursor?: Cursor): RpcArgs {
    return { before_time: cursor?.created_at ?? null, before_id: cursor?.id ?? null };
}

export async function getStorytimes(cursor?: Cursor) {
    const rows = await rpc<Storytime[]>("get_storytimes", cursorArgs(cursor));
    return { rows: rows.slice(0, 10), hasMore: rows.length > 10 };
}
export const getMyStorytimes = () => rpc<Storytime[]>("get_my_storytimes");
export const getMyStorytimeViewCounts = () => rpc<{ story_id: string; view_count: number }[]>("get_my_storytime_view_counts");
export async function getStorytimeViewers(id: string, offset = 0) {
    const { data, error } = await supabase.rpc("get_storytime_viewers", { target_id: id, page_offset: offset });
    if (error) throw error;
    const rows = data as StorytimeViewer[];
    return { rows: rows.slice(0, 50), hasMore: rows.length > 50 };
}
export const createStorytime = (content: string, theme: CardTheme) => rpc<string>("create_storytime", { story_text: content.trim(), target_theme: theme });
export const readStorytime = (id: string) => rpc<void>("read_storytime", { target_id: id });
export const deleteStorytime = (id: string) => rpc<void>("delete_storytime", { target_id: id });
export const reportStorytime = (id: string, reason: string) => rpc<void>("report_storytime", { target_id: id, report_reason: reason });

export async function getSecretLink(): Promise<string> {
    const rows = await rpc<{ public_token: string }[]>("get_secret_box");
    if (!rows[0]) throw Error("SECRET_LINK_UNAVAILABLE");
    return publicLink(`/s/${rows[0].public_token}`);
}
export async function getSecrets(cursor?: Cursor, filter: "all" | "unread" | "read" = "all") {
    const rows = await rpc<Secret[]>("get_my_secrets", { ...cursorArgs(cursor), read_filter: filter });
    return { rows: rows.slice(0, 20), hasMore: rows.length > 20 };
}
export async function getSecret(id: string): Promise<Secret | null> {
    return (await rpc<Secret[]>("get_my_secret", { target_id: id }))[0] ?? null;
}
export const readSecret = (id: string) => rpc<string>("read_secret", { target_id: id });
export const deleteSecret = (id: string) => rpc<void>("delete_secret", { target_id: id });
export const saveSecretReply = (id: string, reply: string, theme: CardTheme) => rpc<void>("save_secret_reply", { target_id: id, reply_text: reply.trim(), target_theme: theme });
export const getSecretUnreadCount = () => rpc<number>("get_secrets_unread_count");
export const getSecretRecipient = (token: string) => rpc<{ display_name: string }[]>("get_secret_recipient", { target_token: token });

export async function sendPublicSecret(token: string, content: string, requestId: string, website: string, signal: AbortSignal): Promise<void> {
    const rows = await rpc<{ challenge_id: string; salt: string }[]>("create_secret_challenge", { target_token: token, target_request_id: requestId });
    if (!rows[0] || signal.aborted) throw Error("EXPIRED_CHALLENGE");
    const challenge = rows[0];
    const nonce = await new Promise<string>((resolve, reject) => {
        const worker = new Worker(new URL("../workers/secretProof.ts", import.meta.url), { type: "module" });
        const finish = () => { worker.terminate(); signal.removeEventListener("abort", abort); };
        const abort = () => { finish(); reject(new DOMException("Aborted", "AbortError")); };
        worker.onmessage = event => {
            finish();
            if (typeof event.data.nonce === "string") resolve(event.data.nonce);
            else reject(Error("INVALID_PROOF"));
        };
        worker.onerror = () => { finish(); reject(Error("INVALID_PROOF")); };
        signal.addEventListener("abort", abort, { once: true });
        worker.postMessage({ salt: challenge.salt });
    });
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    await rpc<void>("send_secret", { target_challenge_id: challenge.challenge_id, proof_nonce: nonce, message_text: content, website });
}

export function publicationDate(value: string) {
    return new Date(value).toLocaleString(getLocale(), { dateStyle: "medium", timeStyle: "short" });
}
