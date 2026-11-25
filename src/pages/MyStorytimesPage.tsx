import { useEffect, useState } from "react";
import { Eye, MessageCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from "../i18n/runtime";
import { deleteStorytime, expiryTime, funError, getMyStorytimes, getMyStorytimeViewCounts, publicationDate, type Storytime } from "../services/fun";
import { STORY_BACKGROUNDS } from "../data/storytimes";
import StorytimePageLayout from "../components/StorytimePageLayout";
import StorytimeViewers from "../components/StorytimeViewers";
import StoryCommentQuote from "../components/StoryCommentQuote";

export default function MyStorytimesPage() {
    const [stories, setStories] = useState<Storytime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [viewCounts, setViewCounts] = useState<Record<string, number> | null>(null);
    const [viewsError, setViewsError] = useState("");
    const [selected, setSelected] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        void getMyStorytimes().then(rows => { if (active) { setStories(rows); setError(""); } })
            .catch(failure => { if (active) setError(funError(failure)); }).finally(() => { if (active) setLoading(false); });
        let revision = 0;
        const refreshViews = () => {
            if (document.hidden) return;
            const current = ++revision;
            void Promise.all([getMyStorytimeViewCounts(), getMyStorytimes()]).then(([rows, mine]) => {
                if (active && current === revision) { setStories(mine); setViewCounts(Object.fromEntries(rows.map(row => [row.story_id, Number(row.view_count)]))); setViewsError(""); }
            }).catch(() => { if (active && current === revision) setViewsError(t("Impossible de charger les vues. Réessaie.")); });
        };
        refreshViews();
        const timer = setInterval(() => { setNow(Date.now()); refreshViews(); }, 15_000);
        window.addEventListener("focus", refreshViews);
        document.addEventListener("visibilitychange", refreshViews);
        return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refreshViews); document.removeEventListener("visibilitychange", refreshViews); };
    }, [attempt]);
    async function remove(id: string) {
        setBusy(id); setError("");
        try { await deleteStorytime(id); setStories(rows => rows.filter(row => row.id !== id)); }
        catch (failure) { setError(funError(failure)); }
        finally { setBusy(null); }
    }
    const visible = stories.filter(story => Date.parse(story.expires_at) > now);
    return <StorytimePageLayout title={t("Mes Storytimes")} busy={!!busy}>
        {loading && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>}
        {error && <div role="alert" className="mb-4 text-sm text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="ml-3 underline">{t("Réessayer")}</button></div>}
        {viewsError && <p role="status" className="mb-4 text-sm text-slate-500 dark:text-slate-400">{viewsError}<button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-2 underline">{t("Réessayer")}</button></p>}
        {!loading && !error && !visible.length && <p className="text-sm text-slate-500 dark:text-slate-400">{t("Aucune Storytime active.")}</p>}
        <ul className="space-y-4">
            {visible.map(story => <li key={story.id} style={{ background: STORY_BACKGROUNDS[story.theme].background, color: STORY_BACKGROUNDS[story.theme].color }} className="rounded-xl p-5">
                {story.comment_quote && <div className="mb-4"><StoryCommentQuote quote={story.comment_quote} compact /></div>}
                <p className="whitespace-pre-wrap break-words text-base leading-7 [overflow-wrap:anywhere]">{story.content}</p>
                <p className="mt-4 text-xs opacity-75">{publicationDate(story.created_at)}</p>
                <p className="mt-1 text-xs opacity-75">{expiryTime(story.expires_at, now)}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Link to={`/storys?story=${story.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-sm font-medium"><MessageCircle size={17} />{t("Commentaires")} {story.comment_count ?? 0}</Link>
                    <button type="button" disabled={viewCounts?.[story.id] === undefined} onClick={() => setSelected(story.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-sm font-medium disabled:opacity-50">
                        <Eye size={17} />{viewCounts?.[story.id] === undefined ? t("Vues") : viewCounts[story.id] === 1 ? t("1 vue") : t("{count} vues", { count: viewCounts[story.id] })}
                    </button>
                    <button type="button" disabled={!!busy} onClick={() => void remove(story.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-sm font-medium disabled:opacity-50"><Trash2 size={16} />{t("Supprimer")}</button>
                </div>
            </li>)}
        </ul>
        {selected && <StorytimeViewers key={selected} storyId={selected} onClose={() => setSelected(null)} />}
    </StorytimePageLayout>;
}
