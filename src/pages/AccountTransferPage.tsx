import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Copy, LoaderCircle, Smartphone } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import LanguageSelector from "../components/LanguageSelector";
import { supabase } from "../lib/supabase";
import { clearTransferMarker, completeSourceTransfer, getTransferMarker, readTransferState, TRANSFER_DISPLAY_KEY } from "../lib/transferStorage";
import { cancelAccountTransfer, createAccountTransfer, importAccountTransfer, type DisplayedTransfer } from "../services/accountTransfer";
import { t } from "../i18n/runtime";
import { invitationPath } from "../utils/invitations";

export default function AccountTransferPage({ send = false }: { send?: boolean }) {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const returnPath = invitationPath(params.get("invite") ?? "");
    const completed = !send && params.get("done") === "1";
    const [transfer, setTransfer] = useState<DisplayedTransfer | null>(null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasAccount, setHasAccount] = useState(false);
    const [replaceAccount, setReplaceAccount] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        let active = true;
        async function initialize() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (active) setHasAccount(Boolean(session));
                if (send) {
                    const marker = await getTransferMarker();
                    const raw = sessionStorage.getItem(TRANSFER_DISPLAY_KEY);
                    if (marker && raw) {
                        const saved = JSON.parse(raw) as DisplayedTransfer;
                        if (saved.lookup === marker.lookup && saved.ownerId === session?.user.id && active) setTransfer(saved);
                    }
                }
            } catch { if (active) setError(t("Impossible de préparer le transfert. Vérifie ta connexion.")); }
            finally { if (active) setLoading(false); }
        }
        void initialize();
        return () => { active = false; };
    }, [send]);

    useEffect(() => {
        if (!transfer) return;
        let active = true;
        let running = false;
        const clock = () => setSeconds(Math.max(0, Math.ceil((Date.parse(transfer.expiresAt) - Date.now()) / 1000)));
        clock();
        async function poll() {
            if (running || document.visibilityState !== "visible") return;
            running = true;
            try {
                const state = await readTransferState(transfer!.lookup);
                if (!active) return;
                if (state === "claimed") { await completeSourceTransfer(transfer!); return; }
                if (state === "expired" || state === "cancelled") {
                    await clearTransferMarker(transfer!.lookup);
                    if (active) { setTransfer(null); setError(t("Ce code a expiré ou a été annulé. Ton compte reste accessible ici.")); }
                }
            } catch { /* Un réseau indisponible ne réactive jamais un jeton déjà déplacé. */ }
            finally { running = false; }
        }
        void poll();
        const timer = window.setInterval(clock, 1000);
        const polling = window.setInterval(() => void poll(), 2000);
        document.addEventListener("visibilitychange", poll);
        return () => { active = false; window.clearInterval(timer); window.clearInterval(polling); document.removeEventListener("visibilitychange", poll); };
    }, [transfer]);

    async function generate() {
        if (busy) return;
        setBusy(true); setError(""); setCopied(false);
        try { setTransfer(await createAccountTransfer()); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t("Impossible de préparer le transfert. Vérifie ta connexion.")); }
        finally { setBusy(false); }
    }
    async function cancel() {
        if (busy) return;
        setBusy(true); setError("");
        try { if (await cancelAccountTransfer()) setTransfer(null); }
        catch { setError(t("Impossible d’annuler pour le moment. Réessaie avec une connexion.")); }
        finally { setBusy(false); }
    }
    async function receive(event: FormEvent) {
        event.preventDefault();
        if (busy || (hasAccount && !replaceAccount)) return;
        setBusy(true); setError("");
        try { await importAccountTransfer(code); navigate(returnPath ?? "/home", { replace: true }); }
        catch (cause) {
            setError(cause instanceof Error && cause.message === "INVALID_TRANSFER_CODE" ? t("Saisis les 20 caractères du code de transfert.") : cause instanceof Error ? cause.message : t("Transfert impossible. Réessaie avec le même code sur cet appareil."));
        } finally { setBusy(false); }
    }
    async function copy() {
        if (!transfer) return;
        try { await navigator.clipboard.writeText(transfer.code); setCopied(true); }
        catch { setError(t("Sélectionne le code pour le copier manuellement.")); }
    }

    return <main className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
        <header className="mx-auto flex max-w-xl items-center justify-between p-4">
            <Link to={send ? "/settings" : hasAccount ? "/settings" : "/welcome"} aria-label={t("Retour")} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"><ArrowLeft size={22} /></Link>
            <LanguageSelector compact />
        </header>
        <section className="mx-auto max-w-md px-5 pb-10 pt-5">
            <Smartphone size={32} className="text-sky-600 dark:text-sky-400" />
            <h1 className="mt-4 text-2xl font-semibold">{t(completed ? "Compte transféré" : send ? "Transférer mon compte" : "Saisir mon code de transfert")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(completed ? "Ton compte est maintenant ouvert dans l’autre version de TellMe. Cette version a été déconnectée. Aucun nouveau compte n’a été créé." : send ? "Génère un code ici, puis ouvre l’icône TellMe ou ton autre appareil et choisis « Saisir mon code de transfert ». Tu retrouveras ton pseudo, tes groupes et tes points, sans e-mail." : "Ouvre les paramètres de TellMe là où ton compte existe, puis « Transférer mon compte ». Saisis ici le code affiché pour retrouver ce compte, sans e-mail.")}</p>
            {completed ? <Link to="/welcome" className="mt-6 inline-flex min-h-12 items-center font-semibold text-sky-700 dark:text-sky-300">{t("Retour à l’accueil")}</Link> : loading ? <LoaderCircle className="mt-6 animate-spin" aria-label={t("Chargement...")} /> : send ? <>
                <p className="mt-4 rounded-xl bg-sky-100 p-4 text-sm leading-6 text-sky-900 dark:bg-sky-950 dark:text-sky-100">{t("Code à usage unique, valable 5 minutes. Une fois utilisé, cette version sera déconnectée. Si personne ne l’utilise, ton compte reste accessible ici. Garde ce code privé : il donne accès à ton compte.")}</p>
                {transfer ? <div className="mt-6">
                    <p className="text-sm font-medium">{t("Ton code de transfert")}</p>
                    <p className="mt-2 select-all break-words rounded-xl bg-white p-4 font-mono text-xl font-semibold leading-9 tracking-wider dark:bg-slate-800">{transfer.code}</p>
                    <p role="status" className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Expire dans {time}", { time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` })}</p>
                    <button type="button" onClick={() => void copy()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-semibold text-white hover:bg-sky-800">{copied ? <Check size={18} /> : <Copy size={18} />}{t(copied ? "Code copié" : "Copier le code")}</button>
                    <button type="button" disabled={busy} onClick={() => void cancel()} className="mt-3 min-h-11 w-full text-sm font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-300">{t("Annuler ce code")}</button>
                </div> : <button type="button" disabled={busy} onClick={() => void generate()} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{busy && <LoaderCircle size={18} className="animate-spin" />}{t("Générer mon code")}</button>}
            </> : <form onSubmit={event => void receive(event)} className="mt-6 space-y-5">
                <label className="block text-sm font-medium">{t("Code de transfert")}<input type="text" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} required value={code} onChange={event => setCode(event.target.value)} disabled={busy} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-base uppercase tracking-wide outline-none focus:border-sky-600 dark:border-slate-600 dark:bg-slate-800" /></label>
                {hasAccount && <label className="flex items-start gap-3 rounded-xl bg-sky-100 p-4 text-sm leading-6 dark:bg-sky-950"><input type="checkbox" checked={replaceAccount} onChange={event => setReplaceAccount(event.target.checked)} disabled={busy} required className="mt-1 h-5 w-5 shrink-0 accent-sky-700" /><span>{t("Un compte est déjà ouvert ici. Je veux ouvrir le compte du code à sa place. Les comptes et leurs données ne seront pas fusionnés.")}</span></label>}
                <button disabled={busy || (hasAccount && !replaceAccount)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{busy && <LoaderCircle size={18} className="animate-spin" />}{t("Retrouver ce compte")}</button>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{t("Le code est temporaire. Pour récupérer ton compte si tu perds tous tes appareils, tu peux aussi activer la sauvegarde facultative par e-mail dans les paramètres.")}</p>
            </form>}
            {error && <p role="alert" className="mt-5 text-sm leading-6 text-red-600 dark:text-red-300">{error}</p>}
        </section>
    </main>;
}
