import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, Laugh, Reply, Send, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from "../i18n/runtime";
import { STORY_BACKGROUNDS, STORY_TOPICS } from "../data/storytimes";
import { addStoryComment, deleteStoryComment, elapsedTime, funError, getStoryCommentNode, getStoryComments, getStoryReplies, reactToStoryComment, readStorytime, type Cursor, type StoryComment, type StoryReaction, type Storytime } from "../services/fun";
import { profileAvatarStyle } from "../utils/profileColors";
import StoryCommentQuote from "./StoryCommentQuote";
import { mergeCommentThreads, updateCommentThread, removeCommentThread } from "../utils/commentThreads";

const reactions = [
    { key: "like", icon: ThumbsUp, label: "J’aime" },
    { key: "dislike", icon: ThumbsDown, label: "Je n’aime pas" },
    { key: "laugh", icon: Laugh, label: "Ça me fait rire" },
] as const;

async function loadRoots(storyId: string, target: number) {
    let result = await getStoryComments(storyId);
    let rows = result.rows;
    while (rows.length < target && result.hasMore && result.rows.length) {
        result = await getStoryComments(storyId, rows[0]);
        const known = new Set(rows.map(row => row.id));
        const added = result.rows.filter(row => !known.has(row.id));
        if (!added.length) break;
        rows = [...added, ...rows];
    }
    return { ...result, rows };
}

export default function StoryComments({ story, onClose, onRead, onCount }: { story: Storytime; onClose: () => void; onRead: (id: string) => void; onCount: (id: string, count: number) => void }) {
    const section = useRef<HTMLElement>(null), list = useRef<HTMLDivElement>(null), composer = useRef<HTMLTextAreaElement>(null);
    const [comments, setComments] = useState<StoryComment[]>([]);
    const [hasMore, setHasMore] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
    const [error, setError] = useState(""), [text, setText] = useState("");
    const [reply, setReply] = useState<StoryComment | null>(null);
    const [total, setTotal] = useState<number | undefined>(story.comment_count);
    const [quote, setQuote] = useState(story.comment_quote ?? null);
    const [expired, setExpired] = useState(() => Date.parse(story.expires_at) <= Date.now());
    const [scrollState, setScrollState] = useState({ overflow: false, bottom: true });
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const mounted = useRef(false), mutation = useRef(false), revision = useRef(0), windowSize = useRef(20);
    const currentComments = useRef<StoryComment[]>([]);
    useLayoutEffect(() => { currentComments.current = comments; }, [comments]);
    const replyCursors = useRef(new Map<string, Cursor | undefined>());
    const draftRequest = useRef<{ text: string; parent: string | null; id: string } | null>(null);
    const scrollIntent = useRef<"bottom" | { height: number; top: number } | { comment: string } | null>(null);
    const palette = STORY_BACKGROUNDS[story.theme];

    const measure = useCallback(() => {
        const node = list.current;
        if (node) setScrollState({ overflow: node.scrollHeight > node.clientHeight + 4, bottom: node.scrollHeight - node.scrollTop - node.clientHeight < 32 });
    }, []);
    const refresh = useCallback(async () => {
        const current = ++revision.current;
        try {
            const result = await loadRoots(story.id, windowSize.current);
            if (!mounted.current || current !== revision.current) return;
            setTotal(result.total); onCount(story.id, result.total); setQuote(result.quote);
            const old = new Map<string, StoryComment>();
            const index = (rows: StoryComment[]) => { for (const row of rows) { old.set(row.id, row); index(row.replies ?? []); } };
            index(currentComments.current);
            const cursors = (rows: StoryComment[]) => { for (const row of rows) {
                if (!replyCursors.current.has(row.id) || Number(row.reply_count ?? 0) < Number(old.get(row.id)?.reply_count ?? 0)) replyCursors.current.set(row.id, row.replies?.at(-1));
                cursors(row.replies ?? []);
            } };
            cursors(result.rows);
            setComments(previous => mergeCommentThreads(previous, result.rows, true));
            setHasMore(result.hasMore); setError("");
        } catch (failure) { if (mounted.current && current === revision.current) setError(funError(failure)); }
        finally { if (mounted.current && current === revision.current) setLoading(false); }
    }, [story.id, onCount]);

    useEffect(() => {
        mounted.current = true; let active = true;
        section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        queueMicrotask(() => { if (active) void refresh(); });
        void readStorytime(story.id).then(() => { if (mounted.current) onRead(story.id); }).catch(() => {});
        const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(story.expires_at) - Date.now()));
        const poll = () => { if (!document.hidden && !mutation.current) void refresh(); };
        const interval = setInterval(poll, 15_000); window.addEventListener("focus", poll);
        return () => { active = false; mounted.current = false; clearTimeout(timer); clearInterval(interval); window.removeEventListener("focus", poll); };
    }, [story.id, story.expires_at, onRead, refresh]);
    useLayoutEffect(() => {
        const node = list.current, intent = scrollIntent.current;
        if (node && intent) {
            if (intent === "bottom") node.scrollTop = node.scrollHeight;
            else if ("comment" in intent) node.querySelector<HTMLElement>(`[id="comment-${intent.comment}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            else node.scrollTop = intent.top + node.scrollHeight - intent.height;
        }
        scrollIntent.current = null; measure();
    }, [comments, collapsed, measure]);

    async function older() {
        if (loading || mutation.current) return;
        const node = list.current;
        if (node) scrollIntent.current = { height: node.scrollHeight, top: node.scrollTop };
        windowSize.current += 20; setLoading(true); await refresh();
    }
    async function moreReplies(comment: StoryComment) {
        if (collapsed.has(comment.id)) { setCollapsed(value => { const next = new Set(value); next.delete(comment.id); return next; }); return; }
        if (mutation.current || expired) return;
        mutation.current = true; revision.current++; setBusy(true); setError("");
        try {
            if (!replyCursors.current.has(comment.id)) replyCursors.current.set(comment.id, comment.replies?.at(-1));
            const [result, parent] = await Promise.all([getStoryReplies(story.id, comment.id, replyCursors.current.get(comment.id)), getStoryCommentNode(story.id, comment.id)]);
            if (!mounted.current) return;
            const last = result.rows.at(-1);
            if (last) replyCursors.current.set(comment.id, last);
            setComments(rows => updateCommentThread(rows, comment.id, row => ({ ...row, reply_count: parent.reply_count, replies: mergeCommentThreads(row.replies ?? [], result.rows) })));
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { mutation.current = false; if (mounted.current) setBusy(false); }
    }
    async function send(event: React.SubmitEvent) {
        event.preventDefault(); const content = text.trim();
        if (!content || mutation.current || expired) return;
        mutation.current = true; revision.current++; setLoading(false); setBusy(true); setError("");
        const parent = reply?.id ?? null;
        if (draftRequest.current?.text !== content || draftRequest.current.parent !== parent) draftRequest.current = { text: content, parent, id: crypto.randomUUID() };
        try {
            const id = await addStoryComment(story.id, content, draftRequest.current.id, parent);
            const [created, parentNode] = parent ? await Promise.all([getStoryCommentNode(story.id, id), getStoryCommentNode(story.id, parent).catch(() => null)]) : [null, null];
            if (!mounted.current) return;
            setText(""); setReply(null); draftRequest.current = null;
            await refresh();
            if (!mounted.current) return;
            if (parent && created && parentNode) {
                setCollapsed(value => { const next = new Set(value); next.delete(parent); return next; });
                scrollIntent.current = { comment: id };
                setComments(rows => updateCommentThread(rows, parent, row => ({ ...row, reply_count: parentNode.reply_count, replies: mergeCommentThreads(row.replies ?? [], [created]) })));
            } else { scrollIntent.current = "bottom"; setComments(rows => [...rows]); }
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { mutation.current = false; if (mounted.current) setBusy(false); }
    }
    async function react(comment: StoryComment, value: StoryReaction) {
        if (mutation.current || expired) return;
        const next = comment.my_reaction === value ? null : value;
        mutation.current = true; revision.current++; setLoading(false); setBusy(true); setError("");
        try {
            await reactToStoryComment(comment.id, next);
            if (mounted.current) setComments(rows => updateCommentThread(rows, comment.id, row => ({ ...row, my_reaction: next,
                like_count: Number(row.like_count) + Number(next === "like") - Number(row.my_reaction === "like"),
                dislike_count: Number(row.dislike_count) + Number(next === "dislike") - Number(row.my_reaction === "dislike"),
                laugh_count: Number(row.laugh_count) + Number(next === "laugh") - Number(row.my_reaction === "laugh"),
            })));
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { mutation.current = false; if (mounted.current) setBusy(false); }
    }
    async function remove(id: string) {
        if (mutation.current) return;
        mutation.current = true; revision.current++; setLoading(false); setBusy(true); setError("");
        try {
            await deleteStoryComment(id);
            if (mounted.current) {
                setComments(rows => removeCommentThread(rows, id)); replyCursors.current.clear();
                if (reply?.id === id) setReply(null);
                await refresh();
            }
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { mutation.current = false; if (mounted.current) setBusy(false); }
    }
    function chooseReply(comment: StoryComment) {
        setReply(comment); composer.current?.focus({ preventScroll: true }); composer.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    function renderComment(comment: StoryComment, depth = 0): React.ReactNode {
        const style = profileAvatarStyle(comment.color);
        const loaded = comment.replies ?? [], children = collapsed.has(comment.id) ? loaded.slice(0, 2) : loaded;
        const hidden = Math.max(0, Number(comment.reply_count ?? 0) - children.length);
        return <li key={comment.id} id={`comment-${comment.id}`} className="py-3">
            <div className="flex gap-2.5">
                <span aria-label={comment.display_prefix} style={style} className={`flex shrink-0 items-center justify-center rounded-full text-xs font-bold ${depth ? "h-7 w-7" : "h-8 w-8"}`}>{comment.display_prefix}</span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-200">{comment.display_prefix}</span><span>{elapsedTime(comment.created_at)}</span>{comment.own && <span>{t("Toi")}</span>}</div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{comment.content}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-0.5">
                        <button type="button" disabled={busy || expired} onClick={() => chooseReply(comment)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950"><Reply size={14} />{t("Répondre")}</button>
                        <Link to={`/fun/story/new?comment=${comment.id}`} aria-label={t("Répondre en Story")} className="inline-flex h-9 w-8 items-center justify-center rounded-full text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950"><BookOpen size={15} /></Link>
                        <span className="inline-flex items-center">{reactions.map(({ key, icon: Icon, label }) => <button key={key} type="button" aria-label={t(label)} aria-pressed={comment.my_reaction === key} disabled={busy || expired} onClick={() => void react(comment, key)} className={`inline-flex min-h-9 items-center gap-1 rounded-full px-1.5 text-xs disabled:opacity-50 ${comment.my_reaction === key ? "bg-sky-100 font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"}`}><Icon size={14} /><span>{Number(comment[`${key}_count`])}</span></button>)}</span>
                        {comment.own && <button type="button" disabled={busy} onClick={() => void remove(comment.id)} aria-label={t("Supprimer mon commentaire")} className="ml-auto flex h-9 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 size={14} /></button>}
                    </div>
                </div>
            </div>
            <div className={depth < 2 ? "ml-5 pl-3" : "pl-1"}>
                {!!children.length && <ul aria-label={t("Réponses à {name}", { name: comment.display_prefix })}>{children.map(child => renderComment(child, depth + 1))}</ul>}
                {hidden > 0 && <button type="button" disabled={busy || expired} onClick={() => void moreReplies(comment)} className="flex min-h-10 items-center gap-2 py-1 text-xs font-semibold text-sky-700 disabled:opacity-50 dark:text-sky-300"><span aria-hidden="true" className="h-px w-5 bg-sky-300 dark:bg-sky-700" />{hidden === 1 ? t("Voir l’autre commentaire") : t("Voir les {count} autres commentaires", { count: hidden })}</button>}
                {children.length > 2 && <button type="button" onClick={() => setCollapsed(value => new Set(value).add(comment.id))} className="min-h-9 text-xs font-semibold text-slate-500 dark:text-slate-400">{t("Réduire les réponses")}</button>}
            </div>
        </li>;
    }
    return <section ref={section} aria-labelledby="comments-heading" className="mt-4 scroll-mt-2">
        <hr className="border-0 border-t-[3px] border-sky-200 dark:border-sky-800" />
        <div className="relative flex min-h-12 items-center justify-center px-12">
            <h2 id="comments-heading" className="tellme-section-title text-center">{t("Commentaires")} : {total !== undefined && <span className="text-base font-medium text-slate-500 dark:text-slate-400">{total}</span>}</h2>
            <button type="button" onClick={onClose} aria-label={t("Fermer les commentaires")} className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><X size={20} /></button>
        </div>
        <article aria-label={t("Storytime commentée")} style={{ background: palette.background, color: palette.color }} className="flex min-h-44 max-h-96 flex-col overflow-y-auto rounded-2xl px-6 py-6 sm:px-10">
            <p className="mb-4 text-xs font-semibold opacity-70">{t(STORY_TOPICS[story.theme].label)} · {elapsedTime(story.created_at)}</p>
            {!expired && quote && <div className="mb-4"><StoryCommentQuote quote={quote} compact /></div>}
            <p className="my-auto whitespace-pre-wrap break-words text-center text-xl font-medium leading-relaxed [overflow-wrap:anywhere] sm:text-2xl">{expired ? t("Cette Storytime a expiré.") : story.content}</p>
        </article>
        {!expired && <div className="relative mx-auto mt-4 w-[calc(100%-0.5rem)] max-w-xl rounded-2xl bg-white px-2 py-3 dark:bg-slate-800 sm:px-4">
            <form onSubmit={event => void send(event)} className="mb-2">
                {reply && <div className="mb-2 flex items-center justify-between border-l-2 border-sky-500 bg-sky-50 pl-3 text-sm dark:bg-sky-950/50"><p className="font-semibold text-sky-700 dark:text-sky-300">{t("Réponse à {name}", { name: reply.display_prefix })}</p><button type="button" disabled={busy} aria-label={t("Annuler la réponse")} onClick={() => setReply(null)} className="flex h-10 w-10 items-center justify-center"><X size={16} /></button></div>}
                <div className="flex items-end gap-2 rounded-2xl bg-slate-100 p-2 dark:bg-slate-900">
                    <textarea ref={composer} aria-label={t("Ton commentaire")} placeholder={t(reply ? "Ta réponse…" : "Ajoute ton commentaire…")} value={text} onChange={event => setText(event.target.value)} maxLength={600} rows={2} readOnly={busy} className="min-h-11 max-h-36 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-base leading-6 outline-none" />
                    <button type="submit" disabled={busy || !text.trim()} aria-label={t("Envoyer le commentaire")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700"><Send size={17} /></button>
                </div><p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{text.length}/600</p>
            </form>
            {hasMore && <button type="button" disabled={loading || busy} onClick={() => void older()} className="mx-auto mb-2 block min-h-10 px-3 text-sm font-semibold text-sky-700 disabled:opacity-50 dark:text-sky-300">{t("Commentaires précédents")}</button>}
            <div ref={list} onScroll={measure} role="log" aria-label={t("Commentaires de la Storytime")} aria-live="polite" className="story-comments-scroll max-h-[30rem] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                {!loading && !comments.length && !error && <p className="px-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t("Le premier mot est pour toi.")}</p>}
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">{comments.map(comment => renderComment(comment))}</ul>
            </div>
            {loading && <p role="status" className="py-3 text-center text-sm text-slate-500">{t("Chargement...")}</p>}
            {scrollState.overflow && <div className="flex justify-end py-2"><button type="button" onClick={() => list.current?.scrollTo({ top: scrollState.bottom ? 0 : list.current.scrollHeight, behavior: "smooth" })} aria-label={t(scrollState.bottom ? "Remonter les commentaires" : "Aller aux derniers commentaires")} className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">{scrollState.bottom ? <ArrowUp size={19} /> : <ArrowDown size={19} />}</button></div>}
            {error && <p role="alert" className="my-3 text-sm text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => void refresh()} className="ml-2 underline">{t("Réessayer")}</button></p>}
        </div>}
    </section>;
}
