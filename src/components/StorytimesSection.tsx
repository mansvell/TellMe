import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Info, MessageCircle, MoreHorizontal, Plus } from "lucide-react";
import { t } from "../i18n/runtime";
import { elapsedTime, funError, getMyStorytimes, getStorytimeGroups, type StoryGroup, type Storytime } from "../services/fun";
import { STORY_BACKGROUNDS, STORY_TOPICS } from "../data/storytimes";
import FunDialog from "./FunDialog";
import StorytimeInfo from "./StorytimeInfo";
import StorytimeViewer from "./StorytimeViewer";
import StoryComments from "./StoryComments";

const noMore = async () => [];
const firstUnread = (stories: Storytime[]) => stories.find(story => !story.seen) ?? stories[0];

export default function StorytimesSection() {
    const [groups, setGroups] = useState<StoryGroup[]>([]);
    const [ownStories, setOwnStories] = useState<Storytime[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [selected, setSelected] = useState<{ id: string; own: boolean } | null>(null);
    const [commentedStory, setCommentedStory] = useState<Storytime | null>(null);
    const [info, setInfo] = useState(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        const interval = setInterval(() => setNow(Date.now()), 15_000);
        return () => { mounted.current = false; clearInterval(interval); };
    }, []);
    useEffect(() => {
        let active = true;
        void Promise.all([getStorytimeGroups(), getMyStorytimes()]).then(([result, mine]) => {
            if (active) {
                setGroups(result.rows);
                setOwnStories(mine.map(story => ({ ...story, group_key: "own" })).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)));
                setHasMore(result.hasMore); setError("");
            }
        }).catch(failure => { if (active) setError(funError(failure)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [attempt]);
    const more = useCallback(async () => {
        if (loading || !hasMore || !groups.length) return [];
        setLoading(true); setError("");
        try {
            const result = await getStorytimeGroups(groups.at(-1));
            if (!mounted.current) return [];
            setGroups(current => [...current, ...result.rows.filter(group => !current.some(existing => existing.author_key === group.author_key))]);
            setHasMore(result.hasMore);
            return result.rows.flatMap(group => group.stories);
        } catch (failure) {
            if (mounted.current) setError(funError(failure));
            throw failure;
        } finally { if (mounted.current) setLoading(false); }
    }, [loading, hasMore, groups]);
    const read = useCallback((id: string) => setGroups(current => current.map(group => ({ ...group, stories: group.stories.map(story => story.id === id ? { ...story, seen: true } : story) }))), []);
    const close = useCallback(() => setSelected(null), []);
    const comment = useCallback((story: Storytime) => { setSelected(null); setCommentedStory(story); }, []);
    const mine = ownStories.filter(story => Date.parse(story.expires_at) > now);
    const visibleGroups = groups.map(group => ({ ...group, stories: group.stories.filter(story => Date.parse(story.expires_at) > now) })).filter(group => group.stories.length);
    const others = visibleGroups.flatMap(group => group.stories);

    return <section aria-labelledby="storytimes-heading">
        <div className="flex items-center justify-between gap-3">
            <h1 id="storytimes-heading" className="tellme-section-title">Storytimes</h1>
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => setInfo(true)} aria-label={t("Informations sur les Storytimes")} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><Info size={20} /></button>
                <Link to="/fun/stories" aria-label={t("Mes Storytimes")} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><MoreHorizontal size={23} /></Link>
            </div>
        </div>
        <ul aria-label={t("Tes Storys")} className="mt-5 flex items-start gap-5">
            <li className="w-20 shrink-0 text-center">
                <Link to="/fun/story/new" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 sm:h-16 sm:w-16" aria-label={t("Publier une Storytime")}><Plus size={26} /></Link>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{t("Publier")}</p>
            </li>
            {!!mine.length && <StoryCircle stories={mine} own now={now} onOpen={() => setSelected({ id: firstUnread(mine).id, own: true })} onComment={() => comment(firstUnread(mine))} />}
        </ul>
        <hr className="my-5 border-0 border-t-[3px] border-sky-200 dark:border-sky-800" />
        <ul aria-label={t("Les Storys des autres utilisateurs")} className="grid grid-cols-4 items-start justify-items-center gap-x-2 gap-y-5">
            {visibleGroups.map(group => <StoryCircle key={group.author_key} stories={group.stories} now={now} onOpen={() => setSelected({ id: firstUnread(group.stories).id, own: false })} onComment={() => comment(firstUnread(group.stories))} />)}
        </ul>
        {!loading && !error && !others.length && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("Aucune Storytime pour le moment.")}</p>}
        {loading && <p role="status" className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="ml-2 underline">{t("Réessayer")}</button></p>}
        {hasMore && <button type="button" disabled={loading} onClick={() => void more().catch(() => {})} className="mx-auto mt-5 block rounded-xl bg-sky-100 px-5 py-2.5 text-sm font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200 disabled:opacity-50">{t("Voir plus")}</button>}
        {commentedStory && <StoryComments key={commentedStory.id} story={commentedStory} onClose={() => setCommentedStory(null)} onRead={read} />}
        {info && <FunDialog title={t("Informations sur les Storytimes")} onClose={() => setInfo(false)}><StorytimeInfo /></FunDialog>}
        {selected && <StorytimeViewer key={selected.id} stories={selected.own ? mine : others} initialId={selected.id} onRead={read} onMore={selected.own ? noMore : more} onClose={close} onComment={comment} />}
    </section>;
}

function StoryCircle({ stories, own = false, now, onOpen, onComment }: { stories: Storytime[]; own?: boolean; now: number; onOpen: () => void; onComment: () => void }) {
    const cover = firstUnread(stories);
    const size = 360 / stories.length;
    const ring = stories.map((story, index) => `${story.seen ? "#94A3B8" : STORY_TOPICS[story.theme].ring} ${index * size + 3}deg ${(index + 1) * size - 3}deg, transparent ${(index + 1) * size - 3}deg ${(index + 1) * size + 3}deg`).join(",");
    return <li className={own ? "w-20 shrink-0 text-center" : "w-full min-w-0 text-center"}>
        <button type="button" aria-label={own ? t("Lire tes {count} Storys", { count: stories.length }) : t("Lire {count} Storys publiées {time}", { count: stories.length, time: elapsedTime(stories.at(-1)!.created_at, now) })} onClick={onOpen}
            style={{ background: `conic-gradient(${ring})` }} className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full p-[3px] sm:h-16 sm:w-16">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-50 p-[3px] dark:bg-slate-900">
                <span style={{ background: STORY_BACKGROUNDS[cover.theme].background, color: STORY_BACKGROUNDS[cover.theme].color }} className="flex h-full w-full items-center justify-center rounded-full"><BookOpen size={22} /></span>
            </span>
            <span className="absolute -bottom-0.5 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white ring-2 ring-slate-50 dark:bg-slate-200 dark:text-slate-900 dark:ring-slate-900">{stories.length}</span>
        </button>
        <p className="mt-2 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-300">{own ? t("Tes Storys") : elapsedTime(stories.at(-1)!.created_at, now)}</p>
        <button type="button" onClick={onComment} aria-label={own ? t("Commenter tes Storys") : t("Commenter ces Storys")} className="mt-1 flex min-h-9 w-full min-w-0 items-center justify-center gap-0.5 font-medium text-sky-700 dark:text-sky-300"><MessageCircle size={13} aria-hidden="true" /><span className="hidden text-[10px] leading-4 min-[380px]:inline sm:text-xs">{t("Commentaires")}</span></button>
    </li>;
}
