import { useEffect, useState } from "react";
import { t } from "../i18n/runtime";
import { funError, getStorytimeViewers, publicationDate, type StorytimeViewer } from "../services/fun";
import FunDialog from "./FunDialog";

export default function StorytimeViewers({ storyId, onClose }: { storyId: string; onClose: () => void }) {
    const [viewers, setViewers] = useState<StorytimeViewer[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        void getStorytimeViewers(storyId).then(result => {
            if (active) { setViewers(result.rows); setHasMore(result.hasMore); setError(""); }
        }).catch(failure => { if (active) setError(funError(failure)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [storyId, attempt]);
    async function more() {
        if (loading) return;
        setLoading(true); setError("");
        try {
            const result = await getStorytimeViewers(storyId, viewers.length);
            setViewers(current => [...current, ...result.rows]); setHasMore(result.hasMore);
        } catch (failure) { setError(funError(failure)); }
        finally { setLoading(false); }
    }
    return <FunDialog title={t("Vues de la Storytime")} onClose={onClose}>
        <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{t("Une seule vue par personne. Tes propres lectures ne sont pas comptées.")}</p>
        {loading && <p role="status" className="py-3 text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>}
        {error && <div role="alert" className="py-3 text-sm text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }} className="ml-2 underline">{t("Réessayer")}</button></div>}
        {!loading && !error && !viewers.length && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{t("Personne n’a encore vu cette Storytime.")}</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {viewers.map((viewer, index) => <li key={index} className="flex items-center gap-3 py-3">
                <span aria-hidden="true" style={{ backgroundColor: viewer.color }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-white">{Array.from(viewer.display_name)[0]?.toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{viewer.display_name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{publicationDate(viewer.viewed_at)}</p></div>
            </li>)}
        </ul>
        {hasMore && <button type="button" disabled={loading} onClick={() => void more()} className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300 disabled:opacity-50">{t("Voir plus")}</button>}
    </FunDialog>;
}
