import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Info, MoreHorizontal, Plus } from "lucide-react";
import { t } from "../i18n/runtime";
import { elapsedTime, funError, getMyStorytimes, getStorytimes, type Storytime } from "../services/fun";
import { STORY_BACKGROUNDS, STORY_TOPICS } from "../data/storytimes";
import FunDialog from "./FunDialog";
import StorytimeInfo from "./StorytimeInfo";
import StorytimeViewer from "./StorytimeViewer";

const noMore = async () => [];

export default function StorytimesSection() {
    const [stories, setStories] = useState<Storytime[]>([]);
    const [ownStories, setOwnStories] = useState<Storytime[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [selected, setSelected] = useState<{ id: string; own: boolean } | null>(null);
    const [info, setInfo] = useState(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        const interval = setInterval(() => setNow(Date.now()), 15_000);
        return () => { mounted.current = false; clearInterval(interval); };
    }, []);
    useEffect(() => {
        let active = true;
        void Promise.all([getStorytimes(), getMyStorytimes()]).then(([result, mine]) => {
            if (active) {
                setStories(result.rows);
                setOwnStories(mine);
                setHasMore(result.hasMore);
                setError("");
            }
        }).catch(failure => { if (active) setError(funError(failure)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [attempt]);

    const more = useCallback(async () => {
        if (loading || !hasMore || !stories.length) return [];
        setLoading(true); setError("");
        try {
            // The cursor includes our stories, so filtering cannot skip a page.
            const result = await getStorytimes(stories.at(-1));
            if (!mounted.current) return [];
            setStories(current => [...current, ...result.rows.filter(story => !current.some(existing => existing.id === story.id))]);
            setHasMore(result.hasMore);
            return result.rows.filter(story => !ownStories.some(own => own.id === story.id));
        } catch (failure) {
            if (mounted.current) setError(funError(failure));
            throw failure;
        } finally { if (mounted.current) setLoading(false); }
    }, [loading, hasMore, stories, ownStories]);
    const read = useCallback((id: string) => setStories(current => current.map(story => story.id === id && !story.seen ? { ...story, seen: true } : story)), []);
    const close = useCallback(() => setSelected(null), []);
    const mine = ownStories.filter(story => Date.parse(story.expires_at) > now);
    const others = stories.filter(story => Date.parse(story.expires_at) > now && !ownStories.some(own => own.id === story.id));

    return <section aria-labelledby="storytimes-heading">
        <div className="flex items-center justify-between gap-3">
            <h1 id="storytimes-heading" className="text-lg font-bold">Storytimes</h1>
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => setInfo(true)} aria-label={t("Informations sur les Storytimes")} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><Info size={20} /></button>
                <Link to="/fun/stories" aria-label={t("Mes Storytimes")} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><MoreHorizontal size={23} /></Link>
            </div>
        </div>
        <ul aria-label={t("Tes Storys")} className="mt-3 flex snap-x gap-4 overflow-x-auto overscroll-x-contain pb-3 pr-1 [scrollbar-width:thin]">
            <li className="w-20 shrink-0 snap-start text-center">
                <Link to="/fun/story/new" className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" aria-label={t("Publier une Storytime")}><Plus size={26} /></Link>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{t("Publier")}</p>
            </li>
            {mine.map(story => <StoryButton key={story.id} story={story} now={now} onOpen={() => setSelected({ id: story.id, own: true })} />)}
        </ul>
        <hr className="my-5 border-0 border-t-[3px] border-sky-200 dark:border-sky-800" />
        <ul aria-label={t("Les Storys des autres utilisateurs")} className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-x-3 gap-y-5">
            {others.map(story => <StoryButton key={story.id} story={story} now={now} onOpen={() => setSelected({ id: story.id, own: false })} />)}
        </ul>
        {!loading && !error && !others.length && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Aucune Storytime pour le moment.")}</p>}
        {loading && <p role="status" className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="ml-2 underline">{t("Réessayer")}</button></p>}
        {hasMore && <button type="button" disabled={loading} onClick={() => void more().catch(() => {})} className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300 disabled:opacity-50">{t("Voir plus")}</button>}
        {info && <FunDialog title={t("Informations sur les Storytimes")} onClose={() => setInfo(false)}><StorytimeInfo /></FunDialog>}
        {selected && <StorytimeViewer key={selected.id} stories={selected.own ? mine : others} initialId={selected.id} onRead={read} onMore={selected.own ? noMore : more} onClose={close} />}
    </section>;
}

function StoryButton({ story, now, onOpen }: { story: Storytime; now: number; onOpen: () => void }) {
    return <li className="w-20 shrink-0 snap-start text-center">
        <button type="button" aria-label={t("Lire la Storytime publiée {time}", { time: elapsedTime(story.created_at, now) })} onClick={onOpen}
            style={story.seen ? undefined : { borderColor: STORY_TOPICS[story.theme].ring }}
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] p-1 ${story.seen ? "border-slate-300 dark:border-slate-600" : ""}`}>
            <span style={{ background: STORY_BACKGROUNDS[story.theme].background, color: STORY_BACKGROUNDS[story.theme].color }} className="flex h-full w-full items-center justify-center rounded-full"><BookOpen size={22} /></span>
        </button>
        <p className="mt-2 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-300">{elapsedTime(story.created_at, now)}</p>
    </li>;
}
