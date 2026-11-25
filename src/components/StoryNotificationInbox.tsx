import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from "../i18n/runtime";
import { elapsedTime, funError, getStoryNotifications, readStoryNotification, storyNotificationText, type StoryNotification } from "../services/fun";
import FunDialog from "./FunDialog";

export default function StoryNotificationInbox() {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<StoryNotification[]>([]);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true, revision = 0;
        const refresh = () => {
            const current = ++revision;
            void getStoryNotifications().then(data => { if (active && current === revision) { setRows(data); setError(""); } }).catch(failure => { if (active && current === revision) setError(funError(failure)); });
        };
        refresh(); const timer = setInterval(() => { if (!document.hidden) refresh(); }, 20_000);
        window.addEventListener("tellme-story-notifications-changed", refresh);
        return () => { active = false; clearInterval(timer); window.removeEventListener("tellme-story-notifications-changed", refresh); };
    }, [open, attempt]);
    const unread = rows.filter(row => !row.read_at).length;
    async function read(id: string) {
        try { await readStoryNotification(id); window.dispatchEvent(new Event("tellme-story-notifications-changed")); }
        catch { /* L'accès à la Story reste disponible ; la notification sera conservée. */ }
    }
    return <>
        <button type="button" onClick={() => setOpen(true)} aria-label={t("Notifications des Storys")} className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"><Bell size={20} />{unread > 0 && <span className="absolute right-0 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sky-700 px-1 text-xs font-semibold text-white">{unread >= 50 ? "50+" : unread}</span>}</button>
        {open && <FunDialog title={t("Notifications des Storys")} onClose={() => setOpen(false)}>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}<button type="button" className="ml-2 underline" onClick={() => setAttempt(value => value + 1)}>{t("Réessayer")}</button></p>}
            {!error && !rows.length && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t("Aucune notification pour le moment.")}</p>}
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map(row => <li key={row.id}><Link to={`/storys?story=${row.story_id}&comment=${row.comment_id}`} onClick={() => { setOpen(false); void read(row.id); }} className={`block rounded-xl px-3 py-4 text-sm hover:bg-sky-50 dark:hover:bg-sky-950 ${!row.read_at ? "font-semibold text-sky-800 dark:text-sky-200" : "text-slate-600 dark:text-slate-300"}`}>
                    <p>{storyNotificationText(row.kind, row.actor_name)}</p><p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">{elapsedTime(row.created_at)}</p>
                </Link></li>)}
            </ul>
        </FunDialog>}
    </>;
}
