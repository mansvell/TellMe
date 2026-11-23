import { useEffect, useState } from "react";
import { Copy, Mail, Share2, Trash2 } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import type { SettingsTabContext } from "./AppTabsLayout";
import { t } from "../i18n/runtime";
import { copyText, shareLink } from "../mobile/sharing";
import {
    deleteSecret, elapsedTime, funError, getSecret, getSecretLink, getSecrets, readSecret, type Secret,
} from "../services/fun";
import FunDialog from "./FunDialog";
import QuestionLibrary from "./QuestionLibrary";
import SecretCardEditor from "./SecretCardEditor";

export default function SecretsSection() {
    const { secretsUnread } = useOutletContext<SettingsTabContext>();
    const [link, setLink] = useState("");
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [selected, setSelected] = useState<Secret | null>(null);
    const [replying, setReplying] = useState(false);
    const [questions, setQuestions] = useState(false);
    const [question, setQuestion] = useState<string | null>(null);
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [dialogError, setDialogError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
    const [params, setParams] = useSearchParams();
    const target = params.get("secret");

    useEffect(() => {
        let active = true;
        void Promise.all([getSecretLink(), getSecrets(undefined, filter)]).then(([personalLink, result]) => {
            if (active) { setLink(personalLink); setSecrets(result.rows); setHasMore(result.hasMore); setError(""); }
        }).catch(failure => { if (active) setError(funError(failure)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [attempt, filter]);

    useEffect(() => {
        const changed = () => setAttempt(value => value + 1);
        window.addEventListener("tellme-secret-received", changed);
        const focus = () => { if (document.visibilityState === "visible") changed(); };
        window.addEventListener("focus", focus);
        return () => { window.removeEventListener("tellme-secret-received", changed); window.removeEventListener("focus", focus); };
    }, []);

    useEffect(() => {
        if (!target || !/^[0-9a-f-]{36}$/i.test(target)) return;
        let active = true;
        void getSecret(target).then(secret => {
            if (!active) return;
            if (secret) { setSelected(secret); setDialogError(""); }
            else setError(t("Ce Secret est indisponible."));
        }).catch(failure => { if (active) setError(funError(failure)); });
        return () => { active = false; };
    }, [target]);

    useEffect(() => {
        if (!selected || selected.read_at) return;
        let active = true;
        const id = selected.id;
        void readSecret(id).then(read_at => {
            if (!active) return;
            setSecrets(current => current.map(secret => secret.id === id ? { ...secret, read_at } : secret));
            setSelected(current => current?.id === id ? { ...current, read_at } : current);
            window.dispatchEvent(new Event("tellme-secrets-changed"));
        }).catch(failure => { if (active) setDialogError(funError(failure)); });
        return () => { active = false; };
    }, [selected]);

    async function more() {
        if (loading || !secrets.length) return;
        setLoading(true); setError("");
        try {
            const result = await getSecrets(secrets.at(-1), filter);
            setSecrets(current => [...current, ...result.rows.filter(row => !current.some(existing => existing.id === row.id))]);
            setHasMore(result.hasMore);
        } catch (failure) { setError(funError(failure)); }
        finally { setLoading(false); }
    }

    function close() {
        setSelected(null); setReplying(false); setConfirmDelete(false);
        if (target) { const next = new URLSearchParams(params); next.delete("secret"); setParams(next, { replace: true }); }
    }

    async function remove() {
        if (!selected) return;
        setBusy(true); setDialogError("");
        try {
            await deleteSecret(selected.id);
            setSecrets(current => current.filter(secret => secret.id !== selected.id));
            close();
            window.dispatchEvent(new Event("tellme-secrets-changed"));
        } catch (failure) { setDialogError(funError(failure)); }
        finally { setBusy(false); }
    }

    async function copy() {
        try { await copyText(link); setNotice(t("Lien copié.")); }
        catch { setError(t("Impossible de copier le lien.")); }
    }

    async function share() {
        try {
            const result = await shareLink("TellMe", t("Envoie-moi un message anonyme."), link);
            if (result === "copied") setNotice(t("Lien copié."));
        } catch { setError(t("Impossible de partager le lien.")); }
    }

    const visible = secrets.filter(secret => filter === "all" || (filter === "unread" ? !secret.read_at : secret.read_at));
    return (
        <section aria-labelledby="secrets-heading" className="mt-9">
            <h2 id="secrets-heading" className="flex items-center gap-2 text-lg font-bold">Secrets
                {secretsUnread > 0 && <span className="rounded-full bg-sky-700 px-2 py-0.5 text-xs text-white">{secretsUnread}</span>}
            </h2>
            <div className="mt-4 rounded-2xl bg-blue-50 px-5 py-5 dark:bg-slate-800">
                <h3 className="font-semibold">{t("Reçois des messages anonymes")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("Partage ton lien. Même les personnes sans TellMe peuvent t’écrire.")}</p>
                {link && <p className="mt-3 select-all break-all rounded-lg bg-white/70 px-3 py-2 text-xs text-sky-800 dark:bg-slate-900 dark:text-sky-200">{link}</p>}
                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" disabled={!link} onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Copy size={17} />{t("Copier le lien")}</button>
                    <button type="button" disabled={!link} onClick={() => void share()} className="inline-flex items-center gap-2 rounded-lg bg-violet-100 px-3 py-2.5 text-sm font-semibold text-violet-800 dark:bg-slate-700 dark:text-violet-200 disabled:opacity-50"><Share2 size={17} />{t("Partager")}</button>
                </div>
                {notice && <p role="status" className="mt-3 text-sm text-sky-700 dark:text-sky-300">{notice}</p>}
            </div>
            <button type="button" disabled={!link} onClick={() => setQuestions(true)}
                className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300 disabled:opacity-50">{t("Trouver une question")}</button>

            <div className="mt-5 flex gap-2" role="group" aria-label={t("Filtrer les Secrets")}>
                {(["all", "unread", "read"] as const).map(value => (
                    <button type="button" key={value} aria-pressed={filter === value} disabled={loading} onClick={() => { if (filter !== value) { setLoading(true); setFilter(value); } }}
                        className={`rounded-lg px-3 py-2 text-sm ${filter === value ? "bg-sky-100 font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "text-slate-500 dark:text-slate-300"}`}>
                        {t(value === "all" ? "Tous" : value === "unread" ? "Non lus" : "Lus")}
                    </button>
                ))}
            </div>
            {loading && <p role="status" className="mt-4 text-sm text-slate-500 dark:text-slate-300">{t("Chargement...")}</p>}
            {error && <div role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300"><p>{error}</p>
                <button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="mt-2 underline">{t("Réessayer")}</button></div>}
            {!loading && !error && !visible.length && <p className="py-7 text-center text-sm text-slate-500 dark:text-slate-300">{t("Aucun Secret à afficher.")}</p>}
            <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">
                {visible.map(secret => <li key={secret.id}>
                    <button type="button" onClick={() => { setSelected(secret); setReplying(false); setConfirmDelete(false); setDialogError(""); }}
                        className="flex w-full items-center gap-3 py-4 text-left">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${secret.read_at ? "bg-slate-200 text-slate-500 dark:bg-slate-800" : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"}`}><Mail size={19} /></span>
                        <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${!secret.read_at ? "font-semibold" : ""}`}>{t(secret.read_at ? "Message anonyme" : "Nouveau message anonyme reçu")}</span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">{elapsedTime(secret.created_at)}{secret.replied_at ? ` · ${t("Réponse préparée")}` : ""}</span>
                        </span>
                        {!secret.read_at && <span aria-label={t("Non lu")} className="h-2 w-2 shrink-0 rounded-full bg-sky-600" />}
                    </button>
                </li>)}
            </ul>
            {hasMore && <button type="button" disabled={loading} onClick={() => void more()} className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300 disabled:opacity-50">{t("Voir plus")}</button>}

            {selected && !replying && <FunDialog title={t("Message anonyme")} onClose={close} busy={busy}>
                <p className="text-xs text-slate-500 dark:text-slate-300">{elapsedTime(selected.created_at)} · {t(selected.read_at ? "Lu" : "Non lu")}</p>
                <p className="my-5 whitespace-pre-wrap break-words text-lg leading-8 [overflow-wrap:anywhere]">{selected.content}</p>
                {selected.reply && <div className="mb-4 rounded-xl bg-slate-200 p-4 dark:bg-slate-800"><p className="text-xs font-semibold">{t("Ma réponse")}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{selected.reply}</p></div>}
                {dialogError && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-300">{dialogError}</p>}
                <div className="flex flex-wrap gap-3">
                    <button type="button" disabled={!link} onClick={() => setReplying(true)} className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white">{t("Répondre")}</button>
                    <button type="button" disabled={!link} onClick={() => setReplying(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2.5 text-sm dark:bg-slate-700"><Share2 size={17} />{t("Partager")}</button>
                    <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-300"><Trash2 size={17} />{t("Supprimer")}</button>
                </div>
                {confirmDelete && <div className="mt-4 rounded-xl bg-red-50 p-4 dark:bg-red-950/30">
                    <p className="text-sm">{t("Supprimer ce Secret et sa réponse ?")}</p>
                    <button type="button" disabled={busy} onClick={() => void remove()} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-sm text-white">{t("Confirmer la suppression")}</button>
                </div>}
            </FunDialog>}
            {selected && replying && <SecretCardEditor secret={selected} link={link} onClose={close} onSaved={updated => {
                setSelected(updated);
                setSecrets(current => current.map(secret => secret.id === updated.id ? updated : secret));
            }} />}
            {questions && <FunDialog title={t("Trouver une question")} onClose={() => setQuestions(false)}>
                <QuestionLibrary onSelect={value => { setQuestion(value); setQuestions(false); }} />
            </FunDialog>}
            {question && <SecretCardEditor question={question} link={link} onClose={() => setQuestion(null)} />}
        </section>
    );
}
