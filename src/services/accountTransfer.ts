import { supabase } from "../lib/supabase";
import { authSessionId, clearTransferClaim, clearTransferMarker, completeSourceTransfer, getTransferMarker, readTransferState, recipientForTransfer, saveTransferMarker, transferPublicRpc, TRANSFER_DISPLAY_KEY, type TransferMarker } from "../lib/transferStorage";
import { decryptTransfer, encryptTransfer, generateTransferCode, transferHash, transferLookup, type TransferEnvelope } from "../utils/transferCrypto";
import { setDevicePreference } from "../mobile/storage";
import { t } from "../i18n/runtime";

export type DisplayedTransfer = TransferMarker & { code: string };
export async function cancelAccountTransfer(): Promise<boolean> {
    const marker = await getTransferMarker();
    if (!marker) return true;
    const { data, error } = await supabase.rpc("cancel_account_transfer", { p_lookup: marker.lookup });
    if (error) throw error;
    if (!data) {
        const state = await readTransferState(marker.lookup);
        if (state === "claimed") { await completeSourceTransfer(marker); return false; }
        if (state !== "expired" && state !== "cancelled") throw new Error("TRANSFER_STATUS_UNAVAILABLE");
    }
    await clearTransferMarker(marker.lookup);
    return true;
}

export async function createAccountTransfer(): Promise<DisplayedTransfer> {
    // Empêche deux onglets de publier des marqueurs contradictoires.
    if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request("tellme-create-transfer", createTransfer);
    return createTransfer();
}
async function createTransfer(): Promise<DisplayedTransfer> {
    if (!await cancelAccountTransfer()) throw new Error(t("Ce compte a déjà été transféré."));
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error(t("Ce compte est introuvable."));
    // Renouvelle AVANT l'export : aucune rotation ne sera nécessaire pendant les
    // cinq minutes du code. Le stockage source contrôle ensuite sa consommation.
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError) throw sessionError;
    if (!session || session.user.id !== user.id || (session.expires_at ?? 0) * 1000 < Date.now() + 7 * 60_000) throw new Error(t("La session est trop courte pour créer un transfert. Réessaie plus tard."));
    const code = generateTransferCode();
    const lookup = await transferLookup(code);
    const payload = await encryptTransfer(code, { user_id: user.id, access_token: session.access_token, refresh_token: session.refresh_token });
    const { data, error } = await supabase.rpc("create_account_transfer", { p_lookup: lookup, p_payload: payload });
    if (error) throw new Error(t(error.message.includes("TRANSFER_RATE_LIMIT") ? "Tu as déjà généré 5 codes en 10 minutes. Patiente avant de réessayer." : "Impossible de créer le code. Vérifie ta connexion et que la mise à jour du transfert est activée."));
    if (typeof data !== "string" || !Number.isFinite(Date.parse(data))) throw new Error("INVALID_TRANSFER_RESPONSE");
    const result = { code, lookup, ownerId: user.id, sessionId: authSessionId(session.access_token), expiresAt: data };
    try {
        await saveTransferMarker({ lookup, ownerId: user.id, sessionId: result.sessionId, expiresAt: data });
        // Le code reste dans l'onglet qui l'affiche ; le marqueur durable ne contient ni code ni jeton.
        sessionStorage.setItem(TRANSFER_DISPLAY_KEY, JSON.stringify(result));
    } catch (cause) {
        await supabase.rpc("cancel_account_transfer", { p_lookup: lookup });
        await clearTransferMarker(lookup);
        throw cause;
    }
    return result;
}

export async function importAccountTransfer(code: string): Promise<void> {
    const lookup = await transferLookup(code);
    const source = await getTransferMarker();
    if (source) {
        const state = await readTransferState(source.lookup);
        if (state === "pending" || state === "claimed") throw new Error(t("Ouvre l’autre version de TellMe pour saisir ce code. Annule d’abord le transfert en cours si tu veux utiliser un autre compte ici."));
        await clearTransferMarker(source.lookup);
    }
    const recipientHash = await recipientForTransfer(lookup, () => transferHash(`${crypto.randomUUID()}${crypto.randomUUID()}`));
    let data: unknown;
    try { data = await transferPublicRpc("claim_account_transfer", { p_lookup: lookup, p_recipient_hash: recipientHash }); }
    catch { throw new Error(t("Code invalide, expiré ou déjà utilisé, ou connexion indisponible. Réessaie avec le même code sur cet appareil.")); }
    const result = data as { owner_id?: string; payload?: TransferEnvelope } | null;
    if (!result?.owner_id || !result.payload) throw new Error(t("Ce code est invalide, expiré ou déjà utilisé."));
    const session = await decryptTransfer(code, result.owner_id, result.payload);
    const { data: restored, error: authError } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (authError) throw authError;
    if (restored.user?.id !== result.owner_id) throw new Error("INVALID_TRANSFER_ACCOUNT");
    setDevicePreference("tellme-known-account", result.owner_id);
    // La restauration est déjà durable. Une erreur d'effacement du chiffré ne
    // doit pas annoncer un échec : seul ce destinataire peut réessayer 10 minutes.
    try { await transferPublicRpc("finish_account_transfer", { p_lookup: lookup, p_recipient_hash: recipientHash }); } catch { /* Enveloppe effacée à son expiration. */ }
    await clearTransferClaim().catch(() => {});
}
