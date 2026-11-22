import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { deliverPendingMessages } from "../services/receipts";

// La réception concerne l'app connectée ; la lecture reste liée aux bulles visibles du chat.
export default function DeliveryTracker() {
    const { pathname } = useLocation();
    useEffect(() => {
        let active = true;
        let busy = false;
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let debounce: ReturnType<typeof setTimeout> | undefined;
        async function flush() {
            if (!active || busy) return;
            busy = true;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!active || !session) return;
                if (!channel) {
                    channel = supabase.channel("app-delivery")
                        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
                            clearTimeout(debounce); debounce = setTimeout(() => { void flush(); }, 200);
                        }).subscribe();
                }
                // Borne le travail par reprise ; les messages restants seront pris au passage suivant.
                for (let page = 0; active && page < 10; page++) {
                    if (await deliverPendingMessages() < 200) break;
                }
            } catch { /* Aucun reçu n'est fabriqué en cas de panne ou avant la migration. */ }
            finally { busy = false; }
        }
        const focus = () => { if (document.visibilityState === "visible") void flush(); };
        void flush();
        window.addEventListener("focus", focus);
        document.addEventListener("visibilitychange", focus);
        const interval = setInterval(focus, 20_000);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            clearTimeout(debounce); debounce = setTimeout(() => { void flush(); }, 0);
        });
        return () => {
            active = false; clearInterval(interval); clearTimeout(debounce);
            window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus);
            subscription.unsubscribe(); if (channel) void supabase.removeChannel(channel);
        };
    }, [pathname]);
    return null;
}
