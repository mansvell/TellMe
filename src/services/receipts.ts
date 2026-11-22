import { supabase } from "../lib/supabase";

export type ReceiptSummary = { messageId: string; expected: number | null; delivered: number; read: number };
export type MessageRecipient = { id: string; name: string; color: string; deliveredAt: string | null; isRead: boolean; readAt: string | null };
const missingFunction = (error: { code?: string } | null) => error && ["PGRST202", "42883"].includes(error.code ?? "");

export async function getReceiptSummaries(ids: string[]): Promise<ReceiptSummary[]> {
    const summaries: ReceiptSummary[] = [];
    for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.rpc("get_message_receipt_summaries", { target_message_ids: ids.slice(i, i + 200) });
        if (missingFunction(error)) return []; // Le chat reste utilisable avant la migration.
        if (error) throw error;
        summaries.push(...(data ?? []).map((row: { message_id: string; expected_count: number | null; delivered_count: number; read_count: number }) => ({
            messageId: row.message_id, expected: row.expected_count, delivered: Number(row.delivered_count), read: Number(row.read_count),
        })));
    }
    return summaries;
}

export async function acknowledgeDelivery(groupId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += 200) {
        const { error } = await supabase.rpc("acknowledge_message_delivery", { target_group_id: groupId, target_message_ids: ids.slice(i, i + 200) });
        if (missingFunction(error)) return;
        if (error) throw error;
    }
}

export async function getMessageRecipients(messageId: string): Promise<MessageRecipient[]> {
    const { data, error } = await supabase.rpc("get_message_receipt_details", { target_message_id: messageId });
    if (!error) return (data ?? []).map((row: { receipt_id: string; display_name: string; color: string; delivered_at: string | null; is_read: boolean; read_at: string | null }) => ({
        id: row.receipt_id, name: row.display_name, color: row.color, deliveredAt: row.delivered_at, isRead: row.is_read, readAt: row.read_at,
    }));
    if (!missingFunction(error)) throw error;
    // Repli : les lecteurs déjà enregistrés restent accessibles sans inventer de réception.
    const { data: reads, error: readError } = await supabase.from("message_reads").select("*").eq("message_id", messageId);
    if (readError) throw readError;
    const ids = [...new Set((reads ?? []).map(row => row.membership_id as string))];
    if (!ids.length) return [];
    const { data: members, error: memberError } = await supabase.from("group_members")
        .select("id,local_color,profiles!group_members_user_id_fkey(display_name)").in("id", ids);
    if (memberError) throw memberError;
    return (members ?? []).map(member => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        const read = reads?.find(row => row.membership_id === member.id);
        return { id: member.id, name: profile?.display_name ?? "Utilisateur", color: member.local_color ?? "#0EA5E9", isRead: true,
            readAt: read?.read_at ?? read?.created_at ?? null, deliveredAt: null };
    });
}

export async function deliverPendingMessages(): Promise<number> {
    const { data, error } = await supabase.rpc("get_pending_message_deliveries");
    if (missingFunction(error)) return 0;
    if (error) throw error;
    const groups = new Map<string, string[]>();
    for (const row of (data ?? []) as { message_id: string; group_id: string; content: string }[]) {
        const ids = groups.get(row.group_id) ?? [];
        ids.push(row.message_id); groups.set(row.group_id, ids);
    }
    for (const [groupId, ids] of groups) await acknowledgeDelivery(groupId, ids);
    return (data ?? []).length;
}
