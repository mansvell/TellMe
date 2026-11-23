import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Send } from "lucide-react";
import logo from "../assets/icon.png";
import LanguageSelector from "../components/LanguageSelector";
import { t } from "../i18n/runtime";
import { funError, isSecretLinkAvailable, sendPublicSecret } from "../services/fun";

export default function SecretLandingPage() {
    const { token } = useParams<{ token: string }>();
    return <SecretForm key={token} token={token} />;
}

function SecretForm({ token }: { token: string | undefined }) {
    const [available, setAvailable] = useState(false);
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
        void isSecretLinkAvailable(token).then(valid => {
            if (active) { setAvailable(valid); setError(""); }
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

    return <main className="relative min-h-dvh overflow-hidden bg-slate-50 px-5 pb-12 text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 dark:from-sky-950 dark:via-sky-900 dark:to-slate-900" />
        <div className="pointer-events-none absolute inset-x-0 top-[260px] h-[220px] bg-gradient-to-b from-transparent via-slate-50/80 to-slate-50 dark:via-slate-950/80 dark:to-slate-950" />
        <header className="relative z-10 mx-auto flex max-w-xl items-center justify-between gap-2 pt-6 sm:gap-3">
            <Link to="/welcome" className="flex min-w-0 items-center gap-2 sm:gap-3">
                <img src={logo} alt="" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
                <span className="text-xl font-black text-white sm:text-2xl">TellMe</span>
            </Link>
            <LanguageSelector compact onBrand />
        </header>
        <section className="relative z-10 mx-auto mt-10 max-w-xl">
            {loading ? <p role="status" className="py-12 text-center font-semibold text-white">{t("Chargement...")}</p> : sent ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"><Check size={30} /></span>
                    <h1 className="mt-4 text-2xl font-black">{t("Ton message a été envoyé.")}</h1>
                </div>
            ) : available ? (
                <form onSubmit={event => void send(event)} className="overflow-hidden rounded-[2rem] border border-white/30 bg-white shadow-2xl shadow-sky-900/15 dark:border-slate-700 dark:bg-slate-900">
                    <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400 p-6 text-white">
                        <h1 className="text-2xl font-black leading-snug">{t("Envoyez votre message en anonyme")}</h1>
                    </div>
                    <div className="p-5">
                        <label className="block"><span className="sr-only">{t("Ton message")}</span>
                            <textarea required maxLength={800} rows={7} value={message} disabled={sending} placeholder={t("Ton message")}
                                onChange={event => { setMessage(event.target.value); requestId.current = crypto.randomUUID(); }}
                                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 text-slate-700 outline-sky-500 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                        </label>
                        <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{message.length}/800</p>
                        <div className="absolute -left-[10000px]" aria-hidden="true">
                            <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
                        </div>
                        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
                        <button type="submit" disabled={sending || !message.trim()} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:opacity-40">
                            <Send size={18} />{sending ? t("Envoi en cours...") : t("Envoyer anonymement")}
                        </button>
                    </div>
                </form>
            ) : <div role="alert" className="rounded-[2rem] bg-white p-7 text-center shadow-xl dark:bg-slate-900">
                <h1 className="text-xl font-bold">{error || t("Ce lien Secrets est indisponible.")}</h1>
                {error && <button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="mt-3 font-semibold text-sky-700 dark:text-sky-300">{t("Réessayer")}</button>}
            </div>}
        </section>
    </main>;
}
