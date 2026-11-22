import { t } from "../i18n/runtime";
import { supabase } from "../lib/supabase";

export type ProfileSettings = {
    id: string;
    displayName: string;
    profileColor: string;
    createdAt: string;
    usernameUpdatedAt: string | null;
    invitationsEnabled: boolean;
};

export async function getSettingsProfile(userId: string): Promise<ProfileSettings | null> {
    const { data, error } = await supabase.from("profiles")
        .select("id,display_name,default_color,created_at,username_updated_at,invitations_enabled")
        .eq("id", userId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
        id: data.id,
        displayName: data.display_name ?? t("Utilisateur"),
        profileColor: data.default_color ?? "#0EA5E9",
        createdAt: data.created_at,
        usernameUpdatedAt: data.username_updated_at,
        invitationsEnabled: data.invitations_enabled ?? true,
    };
}
