import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSelector from "../components/LanguageSelector";
import { t } from "../i18n/runtime";
import { supabase } from "../lib/supabase";
import { linkRecoveryEmail, recoveryUser, requestPasswordReset, setRecoveryPassword, signInExistingAccount, verifyRecoveryEmail } from "../services/accountAccess";
import { invitationPath } from "../utils/invitations";

export default function AccountAccessPage({ setup = false }: { setup?: boolean }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [alreadySignedIn, setAlreadySignedIn] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [token, setToken] = useState("");
    const [stage, setStage] = useState<"email" | "verify" | "password" | "done">("email");
    const [ready, setReady] = useState(!setup);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const returnPath = invitationPath(new URLSearchParams(location.search).get("invite") ?? "");

    useEffect(() => {
        let active = true;
        if (!setup) {
            void supabase.auth.getSession().then(({ data: { session } }) => { if (active) setAlreadySignedIn(Boolean(session)); }).catch(() => {});
            return () => { active = false; };
        }
        const refresh = () => { void recoveryUser().then(user => {
            if (!active) return;
            setEmail(user.new_email || user.email || "");
            setStage(current => current === "done" ? current : !user.is_anonymous && user.email_confirmed_at ? "password" : user.new_email ? "verify" : "email");
        }).catch(() => { if (active) setError(t("Impossible de vérifier ton compte.")); })
            .finally(() => { if (active) setReady(true); }); };
        refresh();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            window.setTimeout(() => { if (active) refresh(); }, 0);
        });
        return () => { active = false; subscription.unsubscribe(); };
    }, [setup]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setError(""); setNotice("");
        try {
            if (!setup) {
                await signInExistingAccount(email, password);
                navigate(returnPath ?? "/home", { replace: true });
            } else if (stage === "email") {
                await linkRecoveryEmail(email);
                setStage("verify");
                setNotice(t("Ouvre l’e-mail de confirmation, puis reviens ici pour choisir ton mot de passe. Si un code est fourni, tu peux aussi le saisir ci-dessous."));
            } else if (stage === "verify") {
                const user = token.trim() ? await verifyRecoveryEmail(email, token) : await recoveryUser();
                if (user.is_anonymous || !user.email_confirmed_at) throw new Error(t("Confirme d’abord ton adresse e-mail."));
                setStage("password"); setToken("");
            } else if (stage === "password") {
                if (password !== confirmation) throw new Error(t("Les mots de passe ne correspondent pas."));
                await setRecoveryPassword(password);
                setPassword(""); setConfirmation(""); setStage("done");
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("Une erreur est survenue. Réessaie."));
        } finally { setBusy(false); }
    }

    async function resetPassword() {
        if (busy || !email.trim()) { setError(t("Saisis ton adresse e-mail.")); return; }
        setBusy(true); setError("");
        try {
            await requestPasswordReset(email);
            setNotice(t("Si cette adresse est liée à un compte, un e-mail de réinitialisation sera envoyé."));
        } catch { setError(t("Impossible d’envoyer l’e-mail. Réessaie plus tard.")); }
        finally { setBusy(false); }
    }

    const input = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
    return <main className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
        <header className="mx-auto flex max-w-xl items-center justify-between p-4">
            <Link to={setup ? "/settings" : returnPath ?? "/welcome"} aria-label={t("Retour")} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"><ArrowLeft size={22} /></Link>
            <LanguageSelector compact />
        </header>
        <section className="mx-auto max-w-md px-5 pb-10 pt-5">
            <ShieldCheck size={32} className="text-sky-600 dark:text-sky-400" />
            <h1 className="mt-4 text-2xl font-semibold">{t(setup ? "Sauvegarder mon compte" : "J’ai déjà un compte")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(setup ? "TellMe reste utilisable avec ton pseudo. Si tu le souhaites, associe une adresse e-mail privée pour retrouver ce même compte sur un autre téléphone." : "Connecte-toi avec l’adresse et le mot de passe configurés dans Paramètres → Sauvegarder mon compte.")}</p>
            {!setup && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Pas encore configuré ? Ouvre TellMe là où ton compte existe et sécurise-le d’abord. Ton pseudo seul ne permet pas de récupérer un compte.")}</p>}
            {!setup && alreadySignedIn && <div className="mt-4 rounded-xl bg-sky-100 p-4 text-sm leading-6 dark:bg-sky-950">
                <p>{t("Un compte est déjà ouvert ici. Se connecter à un autre compte ne fusionne pas leurs données.")}</p>
                <Link to={returnPath ?? "/home"} className="mt-2 block font-semibold text-sky-700 dark:text-sky-300">{t("Continuer avec le compte actuel")}</Link>
            </div>}
            {setup && <Link to="/login" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-sky-700 dark:text-sky-300">{t("Utiliser un compte déjà sécurisé")}</Link>}
            {!ready ? <LoaderCircle aria-label={t("Chargement...")} className="mt-8 animate-spin" /> : stage === "done" ? <div role="status" className="mt-6 rounded-2xl bg-sky-100 p-5 text-sm leading-6 dark:bg-sky-950">
                {t("Ton compte est prêt. Depuis l’icône TellMe, choisis « J’ai déjà un compte » et utilise la même adresse et le même mot de passe.")}
                <Link to="/settings" className="mt-4 block font-semibold text-sky-700 dark:text-sky-300">{t("Retour aux paramètres")}</Link>
            </div> : <form className="mt-6 space-y-5" onSubmit={event => void submit(event)}>
                <label className="block text-sm font-medium">{t("Adresse e-mail privée")}
                    <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy || (setup && stage !== "email")} className={input} />
                </label>
                {setup && stage === "verify" ? <>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("Confirme ton adresse avec le lien reçu par e-mail, puis clique sur « J’ai confirmé mon adresse ». Tu peux aussi saisir le code si l’e-mail en contient un.")}</p>
                    <label className="block text-sm font-medium">{t("Code reçu par e-mail (facultatif)")}<input inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={token} onChange={event => setToken(event.target.value)} className={input} disabled={busy} /></label>
                    <button type="button" disabled={busy} onClick={() => { setStage("email"); setError(""); }} className="min-h-11 text-sm font-semibold text-sky-700 dark:text-sky-300">{t("Modifier l’adresse ou renvoyer l’e-mail")}</button>
                </> : (!setup || stage === "password") && <>
                    <label className="block text-sm font-medium">{t("Mot de passe")}<input type="password" autoComplete={setup ? "new-password" : "current-password"} minLength={setup ? 10 : undefined} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className={input} /></label>
                    {setup && <label className="block text-sm font-medium">{t("Confirmer le mot de passe")}<input type="password" autoComplete="new-password" minLength={10} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} className={input} /></label>}
                </>}
                <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
                    {busy && <LoaderCircle size={18} className="animate-spin" />}{t(!setup ? "Me connecter" : stage === "email" ? "Vérifier mon adresse" : stage === "verify" ? "J’ai confirmé mon adresse" : "Enregistrer mon mot de passe")}
                </button>
                {!setup && <button type="button" disabled={busy} onClick={() => void resetPassword()} className="min-h-11 w-full text-sm font-semibold text-sky-700 dark:text-sky-300">{t("Mot de passe oublié ?")}</button>}
            </form>}
            {notice && <p role="status" className="mt-5 text-sm leading-6 text-sky-800 dark:text-sky-200">{notice}</p>}
            {error && <p role="alert" className="mt-5 text-sm leading-6 text-red-600 dark:text-red-300">{error}</p>}
        </section>
    </main>;
}
