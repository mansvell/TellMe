import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Send } from "lucide-react";
import logo from "../assets/icon.png";
import LanguageSelector from "../components/LanguageSelector";
import { t } from "../i18n/runtime";
import { funError, getSecretRecipient, sendPublicSecret } from "../services/fun";

export default function SecretLandingPage() {
    const { token } = useParams<{ token: string }>();
    return <SecretForm key={token} token={token} />;
}

function SecretForm({ token }: { token: string | undefined }) {
    const [recipient, setRecipient] = useState<string | null>(null);
    const [loading, setLoading] = useState(() => !!token && /^[0-9a-f-]{36}$/i.test(token));
    const [message, setMessage] = useState("");
    const [website, setWebsite] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const requestId = useRef(crypto.randomUUID());
    const request = useRef<AbortController | null>(null);

    useEffect(() => {
        let active = true;
        if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return;
        void getSecretRecipient(token).then(rows => {
            if (active) { setRecipient(rows[0]?.display_name ?? null); setError(""); }
        }).catch(failure => { if (active) setError(funError(failure)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; request.current?.abort(); };
    }, [token, attempt]);

    async function send(event: React.FormEvent) {
        event.preventDefault();
        if (!token || !message.trim() || sending) return;
        const controller = new AbortController();
        request.current = controller;
        setSending(true); setError("");
        try {
            await sendPublicSecret(token, message, requestId.current, website, controller.signal);
            if (!controller.signal.aborted) { setSent(true); setMessage(""); }
        } catch (failure) {
            if (!controller.signal.aborted) setError(funError(failure));
        } finally { if (!controller.signal.aborted) setSending(false); }
    }

    return (
        <main className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
                <Link to="/welcome" className="flex items-center gap-2 font-semibold"><img src={logo} alt="" className="h-11 w-11 object-contain" />TellMe</Link>
                <LanguageSelector compact />
            </header>
            <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-8">
                {loading ? <p role="status">{t("Chargement...")}</p> : sent ? (
                    <div className="rounded-2xl bg-white p-7 text-center dark:bg-slate-900">
                        <Check size={30} className="mx-auto text-sky-600" />
                        <h1 className="mt-4 text-xl font-bold">{t("Ton message a été envoyé.")}</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">{t("Tu peux retrouver une éventuelle réponse dans le Statut/Story de la personne qui a partagé ce lien.")}</p>
                    </div>
                ) : recipient ? (
                    <form onSubmit={event => void send(event)} className="rounded-2xl bg-white p-6 dark:bg-slate-900">
                        <h1 className="text-2xl font-bold">{t("Un Secret pour {name}", { name: recipient })}</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">{t("Écris librement. Ton nom ne sera pas affiché.")}</p>
                        <label className="mt-5 block text-sm font-medium">{t("Ton message")}
                            <textarea required maxLength={800} rows={6} value={message} disabled={sending}
                                onChange={event => { setMessage(event.target.value); requestId.current = crypto.randomUUID(); }}
                                className="mt-2 w-full rounded-lg border border-slate-200 bg-transparent p-3 font-normal dark:border-slate-700" />
                        </label>
                        <p className="text-right text-xs text-slate-500 dark:text-slate-400">{message.length}/800</p>
                        <div className="absolute -left-[10000px]" aria-hidden="true">
                            <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
                        </div>
                        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
                        <button type="submit" disabled={sending || !message.trim()} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white disabled:opacity-50">
                            <Send size={18} />{sending ? t("Envoi en cours...") : t("Envoyer anonymement")}
                        </button>
                    </form>
                ) : <div role="alert">
                    <h1 className="text-xl font-bold">{error || t("Ce lien Secrets est indisponible.")}</h1>
                    {error && <button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="mt-3 font-semibold text-sky-700 dark:text-sky-300">{t("Réessayer")}</button>}
                </div>}
            </section>
        </main>
    );
}
