import { supabase } from "../lib/supabase";

export type ChatMessage = {
    id: string;
    group_id: string;
    sender_membership_id: string;
    content: string;
    reply_to_id: string | null;
    created_at: string;
    //informations nécessaires pour l'affichage
    me: boolean;
    name: string;
    color: string;
    time: string;
    date: string | null;

    replyTo: {
        id: string;
        name: string;
        text: string;
    } | null;
};

type MessageRow = {
    id: string;
    group_id: string;
    sender_membership_id: string;
    content: string;
    reply_to_id: string | null;
    created_at: string;

    group_members: {
        user_id: string;
        local_color: string;
        profiles: {
            display_name: string;
        } | null;
    } | null;

    reply_message: {
        id: string;
        content: string;
        group_members: {
            profiles: {
                display_name: string;
            } | null;
        } | null;
    } | null;
};

// Envoie un message dans un groupe.
export async function sendMessage(
    groupId: string,
    content: string,
    replyToId: string | null = null,
) {

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Utilisateur introuvable.");
    }

    // Recherche l'appartenance de l'utilisateur dans ce groupe.
    const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

    if (membershipError) throw membershipError;

    // Insère le message.
    const { error } = await supabase
        .from("messages")
        .insert({
            group_id: groupId,
            sender_membership_id: membership.id,
            content: content.trim(),
            reply_to_id: replyToId,
        });

    if (error) throw error;
}

// Charge tous les messages d'un groupe.
export async function getMessages(
    groupId: string,
): Promise<ChatMessage[]> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Utilisateur introuvable.");

    const { data, error } = await supabase
        .from("messages")
        .select(`
            id,
            group_id,
            sender_membership_id,
            content,
            reply_to_id,
            created_at,

            group_members!messages_sender_membership_id_fkey (
                user_id,
                local_color,
                profiles (
                    display_name
                )
            )

        `)
        .eq("group_id", groupId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as unknown as MessageRow[];

    console.log(data); //debug

    return rows.map((row, index) => {
        const createdAt = new Date(row.created_at);
        const previous = rows[index - 1];

        const currentDate = createdAt.toDateString();
        const previousDate = previous
            ? new Date(previous.created_at).toDateString()
            : null;

        return {
            id: row.id,
            group_id: row.group_id,
            sender_membership_id: row.sender_membership_id,
            content: row.content,
            reply_to_id: row.reply_to_id,
            created_at: row.created_at,

            //indique si le message appartient au user connecté
            me: row.group_members?.user_id === user.id,

            name:
                row.group_members?.profiles?.display_name ??
                "Utilisateur",

            color:
                row.group_members?.local_color ??
                "#0EA5E9",

            time: createdAt.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
            }),

            //affiche la date seulement au changement de journée
            date:
                currentDate !== previousDate
                    ? formatMessageDate(createdAt)
                    : null,

            replyTo: null,
        };
    });
}

function formatMessageDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Aujourd’hui";
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return "Hier";
    }

    return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}