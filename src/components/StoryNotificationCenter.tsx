import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { t } from "../i18n/runtime";
import { getStoryNotifications, readStoryNotification, storyNotificationText, type StoryNotification } from "../services/fun";
import { playNotificationSound, prepareNotificationSound } from "../services/notificationSound";

export default function StoryNotificationCenter() {
    const [userId, setUserId] = useState<string>();
    const [received, setReceived] = useState<StoryNotification | null>(null);
    useEffect(() => {
        const cleanup = prepareNotificationSound();
        window.addEventListener("tellme-secret-received", playNotificationSound);
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUserId(session?.user.id); setReceived(null); });
        return () => { cleanup(); subscription.unsubscribe(); window.removeEventListener("tellme-secret-received", playNotificationSound); };
    }, []);
    useEffect(() => {
        if (!userId) return;
        let active = true, working = false;
        let initialized = false;
        const known = new Set<string>();
        const startedAt = Date.now();
        const refresh = async () => {
            if (working) return;
            working = true;
            try {
                const rows = await getStoryNotifications();
                if (!active) return;
                const incoming = rows.filter(row => !known.has(row.id) && !row.read_at && Date.parse(row.created_at) >= startedAt);
                rows.forEach(row => known.add(row.id));
                if ((initialized || incoming.length) && incoming.length && !document.hidden) {
                    setReceived(incoming.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]);
                    playNotificationSound();
                }
                initialized = true;
                window.dispatchEvent(new Event("tellme-story-notifications-changed"));
            } catch { /* La navigation reste utilisable avant l'activation du SQL. */ }
            finally { working = false; }
        };
        void refresh();
        const channel = supabase.channel(`story-notifications-${userId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "story_notifications", filter: `recipient_id=eq.${userId}` }, () => { void refresh(); })
            .subscribe();
        const visible = () => { if (!document.hidden) void refresh(); };
        const pushed = (event: MessageEvent) => { if (event.data?.type === "tellme-story-push") void refresh(); };
        const timer = setInterval(visible, 20_000);
        window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
        navigator.serviceWorker?.addEventListener("message", pushed);
        return () => { active = false; clearInterval(timer); void supabase.removeChannel(channel); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); navigator.serviceWorker?.removeEventListener("message", pushed); };
    }, [userId]);
    useEffect(() => {
        if (!received) return;
        const timer = setTimeout(() => setReceived(null), 8000);
        return () => clearTimeout(timer);
    }, [received]);
    if (!received || !userId) return null;
    return <div role="status" className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl bg-white p-4 text-slate-900 shadow-lg dark:bg-slate-700 dark:text-white md:left-auto md:right-3">
        <Link to={`/storys?story=${received.story_id}&comment=${received.comment_id}`} onClick={() => { void readStoryNotification(received.id).then(() => window.dispatchEvent(new Event("tellme-story-notifications-changed"))).catch(() => {}); setReceived(null); }} className="text-sm font-medium">{storyNotificationText(received.kind, received.actor_name)}</Link>
        <button type="button" onClick={() => setReceived(null)} aria-label={t("Fermer")} className="flex h-9 w-9 items-center justify-center"><X size={18} /></button>
    </div>;
}
