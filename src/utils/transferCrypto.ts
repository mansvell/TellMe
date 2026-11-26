const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const encoder = new TextEncoder();
const purpose = "TellMe account transfer v1";
export type TransferEnvelope = { v: 1; salt: string; iv: string; ciphertext: string };
export type TransferredSession = { access_token: string; refresh_token: string; user_id: string };

export function normalizeTransferCode(value: string): string {
    const code = value.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
    if (code.length !== 20 || [...code].some(character => !alphabet.includes(character))) throw new Error("INVALID_TRANSFER_CODE");
    return code;
}
export function generateTransferCode(): string {
    // 20 caractères à 5 bits = 100 bits ; aucune dépendance à un code numérique court.
    return [...crypto.getRandomValues(new Uint8Array(20))].map(byte => alphabet[byte & 31]).join("").match(/.{4}/g)!.join("-");
}
export async function transferHash(value: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
export function transferLookup(code: string) { return transferHash(`${purpose}:${normalizeTransferCode(code)}`); }
function encode(value: Uint8Array): string {
    return btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decode(value: string): Uint8Array<ArrayBuffer> {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("INVALID_TRANSFER_ENVELOPE");
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}
async function key(code: string, salt: Uint8Array<ArrayBuffer>) {
    const material = await crypto.subtle.importKey("raw", encoder.encode(normalizeTransferCode(code)), "HKDF", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(purpose) }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function binding(owner: string, lookup: string) { return encoder.encode(`${purpose}:${owner}:${lookup}`); }
export async function encryptTransfer(code: string, session: TransferredSession): Promise<TransferEnvelope> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const lookup = await transferLookup(code);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: binding(session.user_id, lookup) }, await key(code, salt), encoder.encode(JSON.stringify(session)));
    return { v: 1, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}
export async function decryptTransfer(code: string, owner: string, envelope: TransferEnvelope): Promise<TransferredSession> {
    if (envelope?.v !== 1 || envelope.iv?.length !== 16 || envelope.salt?.length !== 43 || !envelope.ciphertext || envelope.ciphertext.length > 12000) throw new Error("INVALID_TRANSFER_ENVELOPE");
    const lookup = await transferLookup(code);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(envelope.iv), additionalData: binding(owner, lookup) }, await key(code, decode(envelope.salt)), decode(envelope.ciphertext));
    const session = JSON.parse(new TextDecoder().decode(plain)) as TransferredSession;
    if (session.user_id !== owner || typeof session.access_token !== "string" || typeof session.refresh_token !== "string" || !session.access_token || !session.refresh_token) throw new Error("INVALID_TRANSFER_SESSION");
    return session;
}
