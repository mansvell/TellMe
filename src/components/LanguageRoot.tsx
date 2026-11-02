import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { getLanguage, setLanguage, subscribeLanguage } from "../i18n/runtime";
import { supabase } from "../lib/supabase";

export default function LanguageRoot({ children }: { children: ReactNode }) {
    const language = useSyncExternalStore(subscribeLanguage, getLanguage);
    useEffect(() => { document.documentElement.lang = language; }, [language]);
    useEffect(() => {
        let active = true;
        // La préférence locale explicite prime sur celle du profil.
        if (!localStorage.getItem("tellme-language")) {
            void supabase.auth.getUser().then(async ({ data: { user } }) => {
                if (!user) return;
                const { data } = await supabase.from("profiles").select("language").eq("id", user.id).maybeSingle();
                if (active && !localStorage.getItem("tellme-language") && data && ["fr", "en", "de"].includes(data.language)) {
                    setLanguage(data.language);
                }
            }).catch(() => { /* La langue locale reste utilisable hors connexion. */ });
        }
        return () => { active = false; };
    }, []);
    // Remonte les pages pour actualiser aussi les dates et les messages calculés.
    return <Fragment key={language}>{children}</Fragment>;
}
