import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Info, MoreHorizontal, Plus } from "lucide-react";
import { t } from "../i18n/runtime";
import { elapsedTime, funError, getMyStorytimes, getStorytimeGroups, type StoryGroup, type Storytime } from "../services/fun";
import { STORY_BACKGROUNDS, STORY_TOPICS } from "../data/storytimes";
import FunDialog from "./FunDialog";
import StorytimeInfo from "./StorytimeInfo";
import StorytimeViewer from "./StorytimeViewer";
import StoryComments from "./StoryComments";

const noMore = async () => [];
const firstUnread = (stories: Storytime[]) => stories.find(story => !story.seen) ?? stories[0];
const uniqueStories = (stories: Storytime[]) => [...new Map(stories.map(story => [story.id, story])).values()];
const wideGrid = () => window.matchMedia("(min-width: 768px)").matches;
function subscribeGrid(changed: () => void) {
    const query = window.matchMedia("(min-width: 768px)");
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
}
async function loadWindow(target: number, initial: StoryGroup[] = [], canLoad = true) {
    const rows = [...initial];
    let hasMore = canLoad;
    while (rows.length < target && hasMore) {
        const result = await getStorytimeGroups(rows.at(-1));
        const known = new Set(rows.map(group => group.author_key));
        const added = result.rows.filter(group => {
            if (known.has(group.author_key)) return false;
            known.add(group.author_key); return true;
        });
        rows.push(...added.map(group => ({ ...group, stories: uniqueStories(group.stories) })));
        hasMore = result.hasMore;
        if (!added.length) { hasMore = false; break; }
    }
    return { rows, hasMore };
}
type ActiveStory = { mode: "viewer"; initialId: string; stories: Storytime[] } | { mode: "comments"; story: Storytime };

export default function StorytimesSection() {
    const wide = useSyncExternalStore(subscribeGrid, wideGrid, () => false);
    const pageSize = wide ? 16 : 8;
    const [pages, setPages] = useState(1);
    const [groups, setGroups] = useState<StoryGroup[]>([]);
    const [ownStories, setOwnStories] = useState<Storytime[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [active, setActive] = useState<ActiveStory | null>(null);
    const [info, setInfo] = useState(false);
    const mounted = useRef(true);
    const fetching = useRef(false);
    useEffect(() => {
        mounted.current = true;
        const interval = setInterval(() => setNow(Date.now()), 15_000);
        return () => { mounted.current = false; clearInterval(interval); };
    }, []);
    useEffect(() => {
        let current = true;
        void Promise.all([loadWindow(pageSize), getMyStorytimes()]).then(([result, mine]) => {
            if (current) {
                setGroups(result.rows);
                setOwnStories(uniqueStories(mine).map(story => ({ ...story, group_key: "own" })).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)));
                setHasMore(result.hasMore); setError("");
            }
        }).catch(failure => { if (current) setError(funError(failure)); })
            .finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [attempt, pageSize]);
    async function more() {
        if (loading || fetching.current) return;
        fetching.current = true; setLoading(true); setError("");
        try {
            const result = await loadWindow((pages + 1) * pageSize, groups, hasMore);
            if (!mounted.current) return;
            setGroups(result.rows); setHasMore(result.hasMore); setPages(value => value + 1);
        } catch (failure) { if (mounted.current) setError(funError(failure)); }
        finally { fetching.current = false; if (mounted.current) setLoading(false); }
    }
    const read = useCallback((id: string) => setGroups(current => {
        let changed = false;
        const next = current.map(group => ({ ...group, stories: group.stories.map(story => {
            if (story.id !== id || story.seen) return story;
            changed = true;
            return { ...story, seen: true };
        }) }));
        return changed ? next : current;
    }), []);
    const close = useCallback(() => setActive(null), []);
    const comment = useCallback((story: Storytime) => setActive({ mode: "comments", story: { ...story } }), []);
    const mine = ownStories.filter(story => Date.parse(story.expires_at) > now);
    const allGroups = groups.map(group => ({ ...group, stories: group.stories.filter(story => Date.parse(story.expires_at) > now) })).filter(group => group.stories.length);
    const visibleGroups = allGroups.slice(0, pages * pageSize);
    const others = uniqueStories(visibleGroups.flatMap(group => group.stories));
    function open(stories: Storytime[], id: string) {
        setActive({ mode: "viewer", initialId: id, stories: uniqueStories(stories).map(story => ({ ...story })) });
    }

    return <section aria-labelledby="storytimes-heading" className="storys-section">
        <div className="flex items-center justify-between gap-3">
            <h1 id="storytimes-heading" className="tellme-section-title">Storytimes</h1>
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => setInfo(true)} aria-label={t("Informations sur les Storytimes")} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><Info size={20} /></button>
                <Link to="/fun/stories" aria-label={t("Mes Storytimes")} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><MoreHorizontal size={23} /></Link>
            </div>
        </div>
        <ul aria-label={t("Tes Storys")} className="mt-3 flex items-start gap-5">
            <li className="w-20 shrink-0 text-center">
                <Link to="/fun/story/new" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 sm:h-16 sm:w-16" aria-label={t("Publier une Storytime")}><Plus size={26} /></Link>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{t("Publier")}</p>
            </li>
            {!!mine.length && <StoryCircle stories={mine} own now={now} onOpen={() => open(mine, firstUnread(mine).id)} />}
        </ul>
        <hr className="mb-2 mt-3 border-0 border-t-[3px] border-sky-200 dark:border-sky-800" />
        <h2 className="tellme-section-title mb-3">TellMe-Storys</h2>
        <ul aria-label={t("Les Storys des autres utilisateurs")} className="grid grid-cols-4 items-start justify-items-center gap-x-2 gap-y-4 md:grid-cols-8">
            {visibleGroups.map(group => <StoryCircle key={group.author_key} stories={group.stories} now={now} onOpen={() => open(others, firstUnread(group.stories).id)} />)}
        </ul>
        {!loading && !error && !others.length && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("Aucune Storytime pour le moment.")}</p>}
        {loading && <p role="status" className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="ml-2 underline">{t("Réessayer")}</button></p>}
        {(hasMore || allGroups.length > visibleGroups.length) && <button type="button" disabled={loading} onClick={() => void more()} className="mx-auto mt-4 block rounded-xl bg-sky-100 px-5 py-2.5 text-sm font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200 disabled:opacity-50">{t("Voir plus")}</button>}
        {active?.mode === "comments" && <StoryComments key={active.story.id} story={active.story} onClose={close} onRead={read} />}
        {info && <FunDialog title={t("Informations sur les Storytimes")} onClose={() => setInfo(false)}><StorytimeInfo /></FunDialog>}
        {active?.mode === "viewer" && <StorytimeViewer key={active.initialId} stories={active.stories} initialId={active.initialId} onRead={read} onMore={noMore} onClose={close} onComment={comment} />}
    </section>;
}

function StoryCircle({ stories, own = false, now, onOpen }: { stories: Storytime[]; own?: boolean; now: number; onOpen: () => void }) {
    const cover = firstUnread(stories);
    const size = 360 / stories.length;
    const ring = stories.map((story, index) => `${story.seen ? "#94A3B8" : STORY_TOPICS[story.theme].ring} ${index * size + 3}deg ${(index + 1) * size - 3}deg, transparent ${(index + 1) * size - 3}deg ${(index + 1) * size + 3}deg`).join(",");
    return <li className={own ? "w-20 shrink-0 text-center" : "w-full min-w-0 text-center"}>
        <button type="button" aria-label={own ? t("Lire tes {count} Storys", { count: stories.length }) : t("Lire {count} Storys publiées {time}", { count: stories.length, time: elapsedTime(stories.at(-1)!.created_at, now) })} onClick={onOpen}
            style={{ background: `conic-gradient(${ring})` }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full p-[3px] sm:h-16 sm:w-16">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-50 p-[3px] dark:bg-slate-900">
                <span style={{ background: STORY_BACKGROUNDS[cover.theme].background, color: STORY_BACKGROUNDS[cover.theme].color }} className="flex h-full w-full items-center justify-center rounded-full"><BookOpen size={22} /></span>
            </span>
        </button>
        {!own && <p className="mt-2 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-300">{elapsedTime(stories.at(-1)!.created_at, now)}</p>}
    </li>;
}
