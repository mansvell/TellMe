import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getSecretUnreadCount } from "../services/fun";

export default function useSecretNotifications(userId?: string) {
    const [unread, setUnread] = useState(0);
    const [received, setReceived] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        let active = true;
        let revision = 0;
        let timer: number | undefined;
        const refresh = () => {
            const current = ++revision;
            void getSecretUnreadCount().then(count => {
                if (active && revision === current) setUnread(Number(count));
            }).catch(() => { /* La navigation reste disponible avant l'application du SQL. */ });
        };
        const changed = () => { clearTimeout(timer); timer = window.setTimeout(refresh, 100); };
        const channel = supabase.channel("secret-notifications")
            .on("postgres_changes", { event: "*", schema: "public", table: "secrets", filter: `recipient_id=eq.${userId}` }, event => {
                if (!active) return;
                if (event.eventType === "INSERT") {
                    setReceived(String(event.new.id));
                    window.dispatchEvent(new Event("tellme-secret-received"));
                }
                changed();
            }).subscribe(status => { if (status === "SUBSCRIBED") changed(); });
        const visible = () => { if (document.visibilityState === "visible") refresh(); };
        refresh();
        const interval = setInterval(visible, 20_000);
        window.addEventListener("focus", visible);
        document.addEventListener("visibilitychange", visible);
        window.addEventListener("tellme-secrets-changed", changed);
        return () => {
            active = false; clearTimeout(timer); clearInterval(interval);
            window.removeEventListener("focus", visible);
            document.removeEventListener("visibilitychange", visible);
            window.removeEventListener("tellme-secrets-changed", changed);
            void supabase.removeChannel(channel);
        };
    }, [userId]);

    useEffect(() => {
        if (!received) return;
        const timer = setTimeout(() => setReceived(null), 8000);
        return () => clearTimeout(timer);
    }, [received]);

    return { unread, received, dismiss: () => setReceived(null) };
}
