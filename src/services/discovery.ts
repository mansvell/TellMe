import { supabase } from "../lib/supabase";

export type DiscoveredUser = {
    id: string; display_name: string; color: string;
    invitation_status: "sent" | "received" | null;
};
export async function findUsers(search: string, offset = 0): Promise<DiscoveredUser[]> {
    const { data, error } = await supabase.rpc("find_tellme_users", {
        search_text: search.trim(), page_offset: offset,
    });
    if (error) throw error;
    return (data ?? []) as DiscoveredUser[];
}
export async function inviteUser(userId: string, name: string): Promise<void> {
    const { error } = await supabase.rpc("send_directory_invitation", {
        target_user_id: userId, target_conversation_name: name.trim(),
    });
    if (error) throw error;
}
