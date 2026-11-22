import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getSettingsProfile, type ProfileSettings } from "../services/settings";
import AppNavigation from "./AppNavigation";

type ProfileChanges = Partial<Pick<ProfileSettings, "displayName" | "usernameUpdatedAt" | "invitationsEnabled">>;

export type SettingsTabContext = {
    profile: ProfileSettings | null | undefined;
    updateProfile: (changes: ProfileChanges) => void;
    retryProfile: () => void;
};

export default function AppTabsLayout() {
    const { pathname } = useLocation();
    const content = useRef<HTMLDivElement>(null);
    const [userId, setUserId] = useState<string>();
    const [settings, setSettings] = useState<{ userId: string; profile: ProfileSettings | null }>();
    const [profileAttempt, setProfileAttempt] = useState(0);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user.id);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!userId) return;
        let active = true;

        void getSettingsProfile(userId).then(profile => {
            if (active) setSettings({ userId, profile });
        }).catch(error => {
            console.error("Settings profile could not load", error);
            if (active) setSettings({ userId, profile: null });
        });

        return () => { active = false; };
    }, [userId, profileAttempt]);

    useLayoutEffect(() => {
        if (content.current) content.current.scrollTop = 0;
    }, [pathname]);

    const settingsContext: SettingsTabContext = {
        profile: settings?.userId === userId ? settings?.profile : undefined,
        updateProfile: changes => setSettings(current => current?.profile && current.userId === userId
            ? { ...current, profile: { ...current.profile, ...changes } }
            : current),
        retryProfile: () => {
            setSettings(undefined);
            setProfileAttempt(attempt => attempt + 1);
        },
    };

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
            <AppNavigation />
            <div ref={content} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain md:[scrollbar-gutter:stable]">
                <Outlet context={settingsContext} />
            </div>
        </div>
    );
}
