import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { t } from "../i18n/runtime";
import { deleteStorytime, expiryTime, funError, getMyStorytimes, publicationDate, type Storytime } from "../services/fun";
import { FUN_BACKGROUNDS } from "../services/funCards";
import StorytimePageLayout from "../components/StorytimePageLayout";

export default function MyStorytimesPage() {
    const [stories, setStories] = useState<Storytime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        let active = true;
        void getMyStorytimes().then(rows => { if (active) { setStories(rows); setError(""); } })
            .catch(failure => { if (active) setError(funError(failure)); }).finally(() => { if (active) setLoading(false); });
        const timer = setInterval(() => setNow(Date.now()), 15_000);
        return () => { active = false; clearInterval(timer); };
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
        {!loading && !error && !visible.length && <p className="text-sm text-slate-500 dark:text-slate-400">{t("Aucune Storytime active.")}</p>}
        <ul className="space-y-4">
            {visible.map(story => <li key={story.id} style={{ background: FUN_BACKGROUNDS[story.theme].background, color: FUN_BACKGROUNDS[story.theme].color }} className="rounded-xl p-5">
                <p className="whitespace-pre-wrap break-words text-base leading-7 [overflow-wrap:anywhere]">{story.content}</p>
                <p className="mt-4 text-xs opacity-75">{publicationDate(story.created_at)}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs opacity-75">{expiryTime(story.expires_at, now)}</span>
                    <button type="button" disabled={!!busy} onClick={() => void remove(story.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-sm font-medium disabled:opacity-50"><Trash2 size={16} />{t("Supprimer")}</button>
                </div>
            </li>)}
        </ul>
    </StorytimePageLayout>;
}
