import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Flag, Plus, Trash2 } from "lucide-react";
import { t } from "../i18n/runtime";
import {
    createStorytime, deleteStorytime, elapsedTime, expiryTime, funError,
    getMyStorytimes, getStorytimes, publicationDate, readStorytime, reportStorytime,
    type CardTheme, type Storytime,
} from "../services/fun";
import { FUN_BACKGROUNDS } from "../services/funCards";
import FunDialog from "./FunDialog";
import FunThemePicker from "./FunThemePicker";

export default function StorytimesSection() {
    const [stories, setStories] = useState<Storytime[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [selected, setSelected] = useState<Storytime | null>(null);
    const [editor, setEditor] = useState(false);
    const [mine, setMine] = useState<Storytime[] | null>(null);
    const [mineLoading, setMineLoading] = useState(false);
    const [text, setText] = useState("");
    const [theme, setTheme] = useState<CardTheme>("blue");
    const [busy, setBusy] = useState(false);
    const [dialogError, setDialogError] = useState("");
    const [report, setReport] = useState(false);
    const [reason, setReason] = useState("abuse");
    const [reported, setReported] = useState(false);
    const rail = useRef<HTMLUListElement>(null);
    const touch = useRef<{ x: number; y: number } | null>(null);
    const reader = useRef<HTMLDivElement>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        const interval = setInterval(() => setNow(Date.now()), 15_000);
        return () => { mounted.current = false; clearInterval(interval); };
    }, []);

    useEffect(() => {
        let active = true;
        void getStorytimes().then(result => {
            if (active) { setStories(result.rows); setHasMore(result.hasMore); setError(""); }
        }).catch(failure => { if (active) setError(funError(failure)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [attempt]);

    async function more() {
        if (loading || !stories.length) return;
        setLoading(true); setError("");
        try {
            const result = await getStorytimes(stories.at(-1));
            if (!mounted.current) return;
            setStories(current => [...current, ...result.rows.filter(story => !current.some(existing => existing.id === story.id))]);
            setHasMore(result.hasMore);
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { if (mounted.current) setLoading(false); }
    }

    async function open(story: Storytime) {
        if (Date.parse(story.expires_at) <= now) return;
        setSelected(story); setReport(false); setReported(false); setDialogError("");
        try {
            await readStorytime(story.id);
            setStories(current => current.map(row => row.id === story.id ? { ...row, seen: true } : row));
        } catch (failure) { setDialogError(funError(failure)); }
    }

    async function publish() {
        if (!text.trim() || busy) return;
        setBusy(true); setDialogError("");
        try {
            await createStorytime(text, theme);
            setEditor(false); setText(""); setLoading(true); setAttempt(value => value + 1);
        } catch (failure) { setDialogError(funError(failure)); }
        finally { setBusy(false); }
    }

    async function openMine() {
        setMine([]); setMineLoading(true); setDialogError("");
        try {
            const result = await getMyStorytimes();
            setMine(current => current === null ? null : result);
        }
        catch (failure) { setDialogError(funError(failure)); }
        finally { setMineLoading(false); }
    }

    async function remove(id: string) {
        setBusy(true); setDialogError("");
        try {
            await deleteStorytime(id);
            setMine(current => current?.filter(story => story.id !== id) ?? null);
            setStories(current => current.filter(story => story.id !== id));
        } catch (failure) { setDialogError(funError(failure)); }
        finally { setBusy(false); }
    }

    async function sendReport() {
        if (!selected) return;
        setBusy(true); setDialogError("");
        try { await reportStorytime(selected.id, reason); setReport(false); setReported(true); }
        catch (failure) { setDialogError(funError(failure)); }
        finally { setBusy(false); }
    }

    const visible = stories.filter(story => Date.parse(story.expires_at) > now);
    return (
        <section aria-labelledby="storytimes-heading">
            <div className="flex items-center justify-between gap-3">
                <h2 id="storytimes-heading" className="text-lg font-bold">Storytimes</h2>
                <button type="button" disabled={mineLoading} onClick={() => void openMine()} className="text-sm font-semibold text-sky-700 dark:text-sky-300">{t("Mes Storytimes")}</button>
            </div>
            <div className="relative mt-4">
                <ul ref={rail} className="flex snap-x gap-4 overflow-x-auto overscroll-x-contain pb-3 pr-1 [scrollbar-width:thin]">
                    <li className="w-20 shrink-0 snap-start text-center">
                        <button type="button" onClick={() => { setText(""); setDialogError(""); setEditor(true); }}
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                            aria-label={t("Publier une Storytime")}><Plus size={26} /></button>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{t("Publier")}</p>
                    </li>
                    {visible.map(story => (
                        <li key={story.id} className="w-20 shrink-0 snap-start text-center">
                            <button type="button" aria-label={t("Lire la Storytime publiée {time}", { time: elapsedTime(story.created_at, now) })}
                                onClick={() => void open(story)}
                                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] p-1 ${story.seen ? "border-slate-300 dark:border-slate-600" : "border-violet-400"}`}>
                                <span style={{ background: FUN_BACKGROUNDS[story.theme].background, color: FUN_BACKGROUNDS[story.theme].color }}
                                    className="flex h-full w-full items-center justify-center rounded-full"><BookOpen size={22} /></span>
                            </button>
                            <p className="mt-2 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-300">{elapsedTime(story.created_at, now)}</p>
                        </li>
                    ))}
                </ul>
                <div className="mt-1 hidden justify-end gap-2 md:flex">
                    <button type="button" onClick={() => rail.current?.scrollBy({ left: -320, behavior: "smooth" })} aria-label={t("Stories précédentes")}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"><ChevronLeft size={18} /></button>
                    <button type="button" onClick={() => rail.current?.scrollBy({ left: 320, behavior: "smooth" })} aria-label={t("Stories suivantes")}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"><ChevronRight size={18} /></button>
                </div>
            </div>
            {!loading && !error && !visible.length && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Aucune Storytime pour le moment.")}</p>}
            {loading && <p role="status" className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>}
            {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{error}
                <button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="ml-2 underline">{t("Réessayer")}</button>
            </p>}
            {hasMore && <button type="button" disabled={loading} onClick={() => void more()} className="mt-2 rounded-lg px-3 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300 disabled:opacity-50">{t("Voir plus")}</button>}

            {editor && <FunDialog title={t("Publier une Storytime")} busy={busy} onClose={() => setEditor(false)}>
                <label className="block text-sm font-medium">{t("Ton histoire")}
                    <textarea value={text} onChange={event => setText(event.target.value)} maxLength={2000} rows={5}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-transparent p-3 font-normal dark:border-slate-700" />
                </label>
                <p className="text-right text-xs text-slate-500 dark:text-slate-400">{text.length}/2000</p>
                <FunThemePicker value={theme} onChange={setTheme} />
                <div style={{ background: FUN_BACKGROUNDS[theme].background, color: FUN_BACKGROUNDS[theme].color }}
                    className="mt-5 flex min-h-40 max-h-72 items-start justify-center overflow-y-auto rounded-xl p-6">
                    <p className="whitespace-pre-wrap break-words text-center leading-7 [overflow-wrap:anywhere]">{text || t("Aperçu de ton histoire")}</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-300">{t("Visible anonymement pendant 24 h par les utilisateurs de TellMe. Jusqu’à 5 Storytimes actives.")}</p>
                {dialogError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{dialogError}</p>}
                <button type="button" disabled={busy || !text.trim()} onClick={() => void publish()}
                    className="mt-4 w-full rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? t("Publication...") : t("Publier")}</button>
            </FunDialog>}

            {selected && <FunDialog title="Storytime" busy={busy} onClose={() => setSelected(null)}>
                {Date.parse(selected.expires_at) <= now ? <p>{t("Cette Storytime a expiré.")}</p> : (
                    <div ref={reader}
                        onTouchStart={event => { touch.current = reader.current?.scrollTop === 0 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
                        onTouchEnd={event => {
                            const start = touch.current, end = event.changedTouches[0];
                            if (start && end.clientY - start.y > 100 && Math.abs(end.clientX - start.x) < 70 && reader.current?.scrollTop === 0) setSelected(null);
                            touch.current = null;
                        }}
                        style={{ background: FUN_BACKGROUNDS[selected.theme].background, color: FUN_BACKGROUNDS[selected.theme].color }}
                        className="max-h-[65dvh] min-h-80 overflow-y-auto rounded-xl px-6 py-5">
                        <p className="text-center text-xs opacity-75">{elapsedTime(selected.created_at, now)}</p>
                        <div className="flex min-h-60 items-center justify-center py-7">
                            <p className="whitespace-pre-wrap break-words text-center text-lg leading-8 [overflow-wrap:anywhere]">{selected.content}</p>
                        </div>
                    </div>
                )}
                {reported ? <p role="status" className="mt-3 text-sm text-sky-700 dark:text-sky-300">{t("Signalement envoyé.")}</p> : <button type="button" onClick={() => setReport(value => !value)}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300"><Flag size={16} />{t("Signaler")}</button>}
                {report && <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select aria-label={t("Motif du signalement")} value={reason} onChange={event => setReason(event.target.value)} className="rounded-lg bg-slate-200 px-3 py-2 text-sm dark:bg-slate-700">
                        <option value="abuse">{t("Contenu inapproprié")}</option><option value="spam">{t("Spam")}</option><option value="other">{t("Autre")}</option>
                    </select>
                    <button type="button" disabled={busy} onClick={() => void sendReport()} className="rounded-lg bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50">{t("Envoyer le signalement")}</button>
                </div>}
                {dialogError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{dialogError}</p>}
            </FunDialog>}

            {mine !== null && <FunDialog title={t("Mes Storytimes")} busy={busy} onClose={() => setMine(null)}>
                {mineLoading && <p role="status">{t("Chargement...")}</p>}
                {!mineLoading && !mine.filter(story => Date.parse(story.expires_at) > now).length && <p className="text-sm text-slate-500 dark:text-slate-300">{t("Aucune Storytime active.")}</p>}
                <ul className="space-y-3">
                    {mine.filter(story => Date.parse(story.expires_at) > now).map(story => <li key={story.id} className="rounded-xl bg-white p-4 dark:bg-slate-800">
                        <p className="line-clamp-3 break-words text-sm">{story.content}</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{publicationDate(story.created_at)}</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-500 dark:text-slate-300">{expiryTime(story.expires_at, now)}</span>
                            <button type="button" disabled={busy} onClick={() => void remove(story.id)} className="inline-flex items-center gap-1 rounded-lg p-2 text-sm text-red-600 dark:text-red-300"><Trash2 size={16} />{t("Supprimer")}</button>
                        </div>
                    </li>)}
                </ul>
                {dialogError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{dialogError}</p>}
            </FunDialog>}
        </section>
    );
}
