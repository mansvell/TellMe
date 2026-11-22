import { supabase } from "../lib/supabase";

export type DiscoveredUser = {
    id: string; display_name: string; color: string;
    invitation_status: "sent" | "received" | null;
};
const USERS_PER_PAGE = 8;

export async function findUsers(search: string, page: number) {
    const { data, error } = await supabase.rpc("find_tellme_users", {
        search_text: search.trim(), page_offset: page * USERS_PER_PAGE,
    }).limit(USERS_PER_PAGE + 1);
    if (error) throw error;
    const rows = (data ?? []) as DiscoveredUser[];
    return { users: rows.slice(0, USERS_PER_PAGE), hasMore: rows.length > USERS_PER_PAGE };
}
export async function inviteUser(userId: string, name: string): Promise<void> {
    const { error } = await supabase.rpc("send_directory_invitation", {
        target_user_id: userId, target_conversation_name: name.trim(),
    });
    if (error) throw error;
}
