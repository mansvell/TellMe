import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Laugh, Send, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { t } from "../i18n/runtime";
import { STORY_BACKGROUNDS, STORY_TOPICS } from "../data/storytimes";
import { addStoryComment, deleteStoryComment, elapsedTime, funError, getStoryComments, reactToStoryComment, readStorytime, type StoryComment, type StoryReaction, type Storytime } from "../services/fun";
import { profileAvatarStyle } from "../utils/profileColors";

function ordered(rows: StoryComment[]) {
    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
const reactions = [
    { key: "like", icon: ThumbsUp, label: "J’aime" },
    { key: "dislike", icon: ThumbsDown, label: "Je n’aime pas" },
    { key: "laugh", icon: Laugh, label: "Ça me fait rire" },
] as const;

export default function StoryComments({ story, onClose, onRead }: { story: Storytime; onClose: () => void; onRead: (id: string) => void }) {
    const section = useRef<HTMLElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const [comments, setComments] = useState<StoryComment[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [text, setText] = useState("");
    const [expired, setExpired] = useState(() => Date.parse(story.expires_at) <= Date.now());
    const [scrollState, setScrollState] = useState({ overflow: false, bottom: true });
    const mounted = useRef(false);
    const mutation = useRef(false);
    const revision = useRef(0);
    const olderLoaded = useRef(false);
    const draftRequest = useRef<{ text: string; id: string } | null>(null);
    const scrollIntent = useRef<"bottom" | { height: number; top: number } | null>("bottom");
    const atBottom = useRef(true);
    const palette = STORY_BACKGROUNDS[story.theme];

    const measure = useCallback(() => {
        const node = list.current;
        if (!node) return;
        const bottom = node.scrollHeight - node.scrollTop - node.clientHeight < 32;
        atBottom.current = bottom;
        setScrollState({ overflow: node.scrollHeight > node.clientHeight + 4, bottom });
    }, []);
    const refresh = useCallback(async () => {
        const current = ++revision.current;
        try {
            const result = await getStoryComments(story.id);
            if (!mounted.current || current !== revision.current) return;
            if (atBottom.current) scrollIntent.current = "bottom";
            setComments(previous => {
                const latest = new Map(result.rows.map(row => [row.id, row]));
                const oldest = result.rows[0];
                const older = result.hasMore && oldest ? previous.filter(row =>
                    row.created_at < oldest.created_at || (row.created_at === oldest.created_at && row.id < oldest.id)) : [];
                return ordered([...older.filter(row => !latest.has(row.id)), ...result.rows]);
            });
            if (!olderLoaded.current) setHasMore(result.hasMore);
            setError("");
        } catch (failure) { if (mounted.current && current === revision.current) setError(funError(failure)); }
        finally { if (mounted.current && current === revision.current) setLoading(false); }
    }, [story.id]);

    useEffect(() => {
        mounted.current = true;
        let active = true;
        section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        queueMicrotask(() => { if (active) void refresh(); });
        void readStorytime(story.id).then(() => { if (mounted.current) onRead(story.id); }).catch(() => {});
        const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(story.expires_at) - Date.now()));
        const poll = () => { if (document.visibilityState === "visible" && !mutation.current) void refresh(); };
        const interval = setInterval(poll, 15_000);
        window.addEventListener("focus", poll);
        return () => { active = false; mounted.current = false; clearTimeout(timer); clearInterval(interval); window.removeEventListener("focus", poll); };
    }, [story.id, story.expires_at, onRead, refresh]);
    useLayoutEffect(() => {
        const node = list.current;
        if (node && scrollIntent.current) {
            if (scrollIntent.current === "bottom") node.scrollTop = node.scrollHeight;
            else node.scrollTop = scrollIntent.current.top + node.scrollHeight - scrollIntent.current.height;
        }
        scrollIntent.current = null;
        measure();
    }, [comments, measure]);

    async function older() {
        if (loading || !comments.length || mutation.current) return;
        const current = ++revision.current;
        setLoading(true);
        try {
            const result = await getStoryComments(story.id, comments[0]);
            if (!mounted.current || current !== revision.current) return;
            const node = list.current;
            if (node) scrollIntent.current = { height: node.scrollHeight, top: node.scrollTop };
            olderLoaded.current = true;
            setComments(previous => ordered([...result.rows.filter(row => !previous.some(known => known.id === row.id)), ...previous]));
            setHasMore(result.hasMore); setError("");
        } catch (failure) { if (mounted.current && current === revision.current) setError(funError(failure)); }
        finally { if (mounted.current && current === revision.current) setLoading(false); }
    }
    async function send(event: React.SubmitEvent) {
        event.preventDefault();
        const content = text.trim();
        if (!content || mutation.current || expired) return;
        mutation.current = true; revision.current++; setLoading(false); setBusy(true); setError("");
        if (draftRequest.current?.text !== content) draftRequest.current = { text: content, id: crypto.randomUUID() };
        try {
            await addStoryComment(story.id, content, draftRequest.current.id);
            if (!mounted.current) return;
            setText(""); draftRequest.current = null;
            scrollIntent.current = "bottom"; atBottom.current = true;
            await refresh();
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { mutation.current = false; if (mounted.current) setBusy(false); }
    }
    async function react(comment: StoryComment, value: StoryReaction) {
        if (mutation.current || expired) return;
        const next = comment.my_reaction === value ? null : value;
        mutation.current = true; revision.current++; setLoading(false); setBusy(true); setError("");
        try {
            await reactToStoryComment(comment.id, next);
            if (!mounted.current) return;
            setComments(rows => rows.map(row => row.id !== comment.id ? row : {
                ...row, my_reaction: next,
                like_count: Number(row.like_count) + Number(next === "like") - Number(row.my_reaction === "like"),
                dislike_count: Number(row.dislike_count) + Number(next === "dislike") - Number(row.my_reaction === "dislike"),
                laugh_count: Number(row.laugh_count) + Number(next === "laugh") - Number(row.my_reaction === "laugh"),
            }));
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { mutation.current = false; if (mounted.current) setBusy(false); }
    }
    async function remove(id: string) {
        if (mutation.current) return;
        mutation.current = true; revision.current++; setLoading(false); setBusy(true); setError("");
        try {
            await deleteStoryComment(id);
            if (mounted.current) setComments(rows => rows.filter(row => row.id !== id));
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { mutation.current = false; if (mounted.current) setBusy(false); }
    }

    return <section ref={section} aria-labelledby="comments-heading" className="mt-4 scroll-mt-2">
        <hr className="border-0 border-t-[3px] border-sky-200 dark:border-sky-800" />
        <div className="relative flex min-h-12 items-center justify-center px-12">
            <h2 id="comments-heading" className="tellme-section-title text-center">{t("Commentaires")}</h2>
            <button type="button" onClick={onClose} aria-label={t("Fermer les commentaires")} className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><X size={20} /></button>
        </div>
        <article aria-label={t("Storytime commentée")} style={{ background: palette.background, color: palette.color }} className="flex min-h-44 max-h-96 flex-col overflow-y-auto rounded-2xl px-6 py-6 sm:px-10">
            <p className="mb-4 text-xs font-semibold opacity-70">{t(STORY_TOPICS[story.theme].label)} · {elapsedTime(story.created_at)}</p>
            <p className="my-auto whitespace-pre-wrap break-words text-center text-xl font-medium leading-relaxed [overflow-wrap:anywhere] sm:text-2xl">{expired ? t("Cette Storytime a expiré.") : story.content}</p>
        </article>
        {!expired && <div className="relative mt-4 rounded-2xl bg-white px-3 py-2 dark:bg-slate-800 sm:px-5">
            <form onSubmit={event => void send(event)} className="mb-3 pb-1">
                <div className="flex items-end gap-2 rounded-2xl bg-slate-100 p-2 dark:bg-slate-900">
                    <textarea aria-label={t("Ton commentaire")} placeholder={t("Ajoute ton commentaire…")} value={text} onChange={event => setText(event.target.value)} maxLength={600} rows={2} readOnly={busy} disabled={expired}
                        className="min-h-11 max-h-36 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-base leading-6 outline-none" />
                    <button type="submit" disabled={busy || expired || !text.trim()} aria-label={t("Envoyer le commentaire")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700"><Send size={18} /></button>
                </div>
                <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{text.length}/600</p>
            </form>
            {hasMore && <button type="button" disabled={loading || busy} onClick={() => void older()} className="mx-auto mb-2 block min-h-10 px-3 text-sm font-semibold text-sky-700 disabled:opacity-50 dark:text-sky-300">{t("Commentaires précédents")}</button>}
            <div ref={list} onScroll={measure} role="log" aria-label={t("Commentaires de la Storytime")} aria-live="polite" className="story-comments-scroll max-h-[28rem] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                {!loading && !comments.length && !error && <p className="px-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t("Le premier mot est pour toi.")}</p>}
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {comments.map(comment => {
                        const style = profileAvatarStyle(comment.color);
                        return <li key={comment.id} className="flex gap-3 px-1 py-4">
                            <span aria-label={comment.display_prefix} style={{ color: style.backgroundColor, background: style.color === "#000000" ? "#0F172A" : "#F1F5F9" }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold">{comment.display_prefix}</span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{elapsedTime(comment.created_at)}</span>{comment.own && <span className="font-semibold">{t("Toi")}</span>}</div>
                                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{comment.content}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-1">
                                    {reactions.map(({ key, icon: Icon, label }) => <button key={key} type="button" aria-label={t(label)} aria-pressed={comment.my_reaction === key} disabled={busy || expired} onClick={() => void react(comment, key)}
                                        className={`inline-flex min-h-9 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-xs transition-colors disabled:opacity-50 ${comment.my_reaction === key ? "bg-sky-100 font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
                                        <Icon size={15} /><span>{Number(comment[`${key}_count`])}</span>
                                    </button>)}
                                    {comment.own && <button type="button" disabled={busy} onClick={() => void remove(comment.id)} aria-label={t("Supprimer mon commentaire")} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 size={15} /></button>}
                                </div>
                            </div>
                        </li>;
                    })}
                </ul>
            </div>
            {loading && <p role="status" className="py-3 text-center text-sm text-slate-500">{t("Chargement...")}</p>}
            {scrollState.overflow && <div className="flex justify-end py-2"><button type="button" onClick={() => list.current?.scrollTo({ top: scrollState.bottom ? 0 : list.current.scrollHeight, behavior: "smooth" })} aria-label={t(scrollState.bottom ? "Remonter les commentaires" : "Aller aux derniers commentaires")} className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">{scrollState.bottom ? <ArrowUp size={19} /> : <ArrowDown size={19} />}</button></div>}
            {error && <p role="alert" className="my-3 text-sm text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => void refresh()} className="ml-2 underline">{t("Réessayer")}</button></p>}

        </div>}
    </section>;
}
