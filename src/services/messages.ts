import { supabase } from "../lib/supabase";

// =========================================================
// TYPES UTILISÉS PAR LE CHAT
// =========================================================

export type ChatAttachment = {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number | null;
    storagePath: string;
    signedUrl: string;
};

export type MessageReply = {
    id: string;
    name: string;
    text: string;
    color: string;
};
export type ChatBuzzOption = {
    id: string;
    label: string;
    position: number;
};

export type ChatBuzz = {
    id: string;
    question: string;
    vote_type: "single" | "multiple";
    is_active: boolean;
    options: ChatBuzzOption[];
};

export type ChatMessage = {
    id: string;
    group_id: string;
    sender_membership_id: string| null ;
    content: string;
    reply_to_id: string | null;
    created_at: string;

    me: boolean;
    name: string;
    color: string;
    time: string;
    date: string | null;
    replyTo: MessageReply | null;
    attachments: ChatAttachment[];
    // Nombre d'autres membres ayant lu ce message.
    readCount: number;
    buzz_id: string | null;
    buzz: ChatBuzz | null;
    message_type: "text" | "buzz" | "question";
    question: string | null;
};

type MessageDatabaseRow = {
    id: string;
    group_id: string;
    sender_membership_id: string| null ;
    content: string;
    reply_to_id: string | null;
    created_at: string;
    buzz_id: string | null;
    message_type: "text" | "buzz" | "question";
    sender_name: string | null;
    sender_color: string | null;
};

type MembershipRow = {
    id: string;
    user_id: string;
    local_color: string;
    profiles:
        | {
        display_name: string;
    }
        | {
        display_name: string;
    }[]
        | null;
};

type AttachmentRow = {
    id: string;
    message_id: string;
    storage_path: string;
    file_name: string;
    file_type: string;
    file_size: number | null;
};

// RÉCUPÈRE L'UTILISATEUR CONNECTÉ
async function getCurrentUserId(): Promise<string> {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
        throw new Error("Utilisateur introuvable.");
    }

    return user.id;
}

// RÉCUPÈRE LA MEMBERSHIP DU USER DANS LE GROUPE
async function getMyMembershipId(
    groupId: string,
): Promise<string> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

    if (error) throw error;

    return data.id;
}

// ENVOIE UN MESSAGE, UNE RÉPONSE ET ÉVENTUELLEMENT UN FICHIER
export async function sendMessage(
    groupId: string,
    content: string,
    replyToId: string | null = null,
    file: File | null = null,
): Promise<ChatMessage> {
    const cleanContent = content.trim();

    if (!cleanContent && !file) {
        throw new Error("Le message est vide.");
    }

    const userId = await getCurrentUserId();
    const membershipId = await getMyMembershipId(groupId);

    // La colonne content ne peut pas être vide.
    const savedContent =
        cleanContent || `📎 ${file?.name ?? "Fichier"}`;

    const {
        data: senderMembership,
        error: senderError,
    } = await supabase
        .from("group_members")
        .select(`
            local_color,
            profiles!group_members_user_id_fkey (
                display_name
            )
        `)
        .eq("id", membershipId)
        .single();

    if (senderError) {
        throw senderError;
    }

    // NOUVEAU : récupère proprement le profil.
    const senderProfile =
        getProfile(
            senderMembership.profiles,
        );

    // Création du message.
    const {
        data: insertedMessage,
        error: messageError,
    } = await supabase
        .from("messages")
        .insert({
            group_id: groupId,
            sender_membership_id:
            membershipId,

            // NOUVEAU : copie permanente du pseudo.
            sender_name:
                senderProfile?.display_name ??
                "Utilisateur",

            // NOUVEAU : copie permanente de la couleur.
            sender_color:
                senderMembership.local_color ??
                "#0EA5E9",

            content: savedContent,
            reply_to_id: replyToId,
            message_type: "text",
        })
        .select(`
            id,
            group_id,
            sender_membership_id,
            sender_name,
            sender_color,
            content,
            reply_to_id,
            buzz_id,
            message_type,
            created_at
        `)
        .single();

    if (messageError) {
        throw messageError;
    }

    // Upload facultatif d'une pièce jointe.
    if (file) {
        const safeName =
            file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                "_",
            );

        const storagePath =
            `${groupId}/${userId}/${crypto.randomUUID()}-${safeName}`;

        const {
            error: uploadError,
        } = await supabase.storage
            .from("chat-media")
            .upload(
                storagePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType:
                        file.type ||
                        undefined,
                },
            );

        if (uploadError) {
            throw uploadError;
        }

        const {
            error: attachmentError,
        } = await supabase
            .from("attachments")
            .insert({
                message_id:
                insertedMessage.id,
                storage_path:
                storagePath,
                file_name:
                file.name,
                file_type:
                    file.type ||
                    "application/octet-stream",
                file_size:
                file.size,
            });

        if (attachmentError) {
            throw attachmentError;
        }
    }

    return getMessageById(
        insertedMessage.id,
    );
}


// CHARGE TOUS LES MESSAGES DU GROUPE
export async function getMessages(
    groupId: string,
): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from("messages")
        .select(`
            id,
            group_id,
            sender_membership_id,
            sender_name,
            sender_color,
            content,
            reply_to_id,
            buzz_id,
            message_type,
            created_at
        `)
        .eq("group_id", groupId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

    if (error) throw error;

    return hydrateMessages(
        (data ?? []) as MessageDatabaseRow[],
    );
}


// CHARGE UN MESSAGE PRÉCIS
// Utilisé par Realtime après un nouvel INSERT.
export async function getMessageById(
    messageId: string,
): Promise<ChatMessage> {
    const { data, error } = await supabase
        .from("messages")
        .select(`
            id,
            group_id,
            sender_membership_id,
            content,
            reply_to_id,
            buzz_id,
            message_type,
            created_at
        `)
        .eq("id", messageId)
        .is("deleted_at", null)
        .single();

    if (error) throw error;

    const messages = await hydrateMessages([
        data as MessageDatabaseRow,
    ]);

    if (!messages[0]) {
        throw new Error("Message introuvable.");
    }

    return messages[0];
}


// TRANSFORME LES DONNÉES SUPABASE POUR LE FRONTEND
// Pas de jointure récursive messages → messages.
async function hydrateMessages(
    rows: MessageDatabaseRow[],
): Promise<ChatMessage[]> {
    if (rows.length === 0) return [];

    const currentUserId = await getCurrentUserId();
    const buzzIds = Array.from(
        new Set(
            rows
                .map((row) => row.buzz_id)
                .filter((id): id is string => Boolean(id)),
        ),
    );

    const buzzMap = new Map<string, ChatBuzz>();

    if (buzzIds.length > 0) {
        const { data: buzzData, error: buzzError } = await supabase
            .from("buzzes")
            .select(`
            id,
            question,
            vote_type,
            is_active,
            buzz_options (
                id,
                label,
                position
            )
        `)
            .in("id", buzzIds);

        if (buzzError) throw buzzError;

        for (const buzz of buzzData ?? []) {
            buzzMap.set(buzz.id, {
                id: buzz.id,
                question: buzz.question,
                vote_type: buzz.vote_type,
                is_active: buzz.is_active,
                options: [...(buzz.buzz_options ?? [])].sort(
                    (a, b) => a.position - b.position,
                ),
            });
        }
    }

    const replyIds = rows
        .map((row) => row.reply_to_id)
        .filter((id): id is string => Boolean(id));

    // Récupère les messages auxquels on répond.
    let replyRows: MessageDatabaseRow[] = [];

    if (replyIds.length > 0) {
        const { data, error } = await supabase
            .from("messages")
            .select(`
                id,
                group_id,
                sender_membership_id,
                sender_name,
                sender_color,
                content,
                reply_to_id,
                buzz_id,
                message_type,
                created_at
            `)
            .in("id", replyIds);

        if (error) throw error;

        replyRows = (data ?? []) as MessageDatabaseRow[];
    }

    // NOUVEAU : ignore les memberships supprimés/null.
    const membershipIds = Array.from(
        new Set([
            ...rows
                .map(
                    (row) =>
                        row.sender_membership_id,
                )
                .filter(
                    (id): id is string =>
                        Boolean(id),
                ),

            ...replyRows
                .map(
                    (row) =>
                        row.sender_membership_id,
                )
                .filter(
                    (id): id is string =>
                        Boolean(id),
                ),
        ]),
    );

    // NOUVEAU : les anciens messages peuvent appartenir
// à quelqu'un qui a déjà quitté le groupe.
    let memberships: MembershipRow[] = [];

    if (membershipIds.length > 0) {
        const {
            data: membershipsData,
            error: membershipsError,
        } = await supabase
            .from("group_members")
            .select(`
            id,
            user_id,
            local_color,
            profiles!group_members_user_id_fkey (
                display_name
            )
        `)
            .in(
                "id",
                membershipIds,
            );

        if (membershipsError) {
            throw membershipsError;
        }

        memberships =
            (membershipsData ?? []) as unknown as MembershipRow[];
    }

    const membershipMap = new Map(
        memberships.map(
            (membership) => [
                membership.id,
                membership,
            ],
        ),
    );

    const replyMap = new Map(
        replyRows.map((reply) => [reply.id, reply]),
    );

    // Pièces jointes des messages principaux.
    const messageIds = rows.map((row) => row.id);

    const { data: attachmentData, error: attachmentError } =
        await supabase
            .from("attachments")
            .select(`
                id,
                message_id,
                storage_path,
                file_name,
                file_type,
                file_size
            `)
            .in("message_id", messageIds);

    if (attachmentError) throw attachmentError;

    const attachments =
        (attachmentData ?? []) as AttachmentRow[];

    const attachmentsWithUrls = await Promise.all(
        attachments.map(async (attachment) => {
            // Le bucket reste privé : URL temporaire.
            const { data, error } = await supabase.storage
                .from("chat-media")
                .createSignedUrl(
                    attachment.storage_path,
                    60 * 60,
                );

            if (error) throw error;

            return {
                id: attachment.id,
                messageId: attachment.message_id,
                fileName: attachment.file_name,
                fileType: attachment.file_type,
                fileSize: attachment.file_size,
                storagePath: attachment.storage_path,
                signedUrl: data.signedUrl,
            };
        }),
    );

    const attachmentMap = new Map<
        string,
        ChatAttachment[]
    >();

    for (const attachment of attachmentsWithUrls) {
        const list =
            attachmentMap.get(attachment.messageId) ?? [];

        list.push({
            id: attachment.id,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            storagePath: attachment.storagePath,
            signedUrl: attachment.signedUrl,
        });

        attachmentMap.set(attachment.messageId, list);
    }

// Nombre de lecteurs par message.
    const readCountMap = new Map<string, number>();

    if (messageIds.length > 0) {

        const {
            data: readData,
            error: readError,
        } = await supabase
            .from("message_reads")
            .select("message_id")
            .in("message_id", messageIds);

        if (readError) {
            throw readError;
        }

        for (const read of readData ?? []) {

            const current =
                readCountMap.get(read.message_id) ?? 0;

            readCountMap.set(
                read.message_id,
                current + 1,
            );
        }
    }

    return rows.map((row, index) => {
        const membership =
            row.sender_membership_id
                ? membershipMap.get(
                    row.sender_membership_id,
                )
                : undefined;

        const createdAt = new Date(row.created_at);

        const previousRow = rows[index - 1];
        const previousDate = previousRow
            ? new Date(previousRow.created_at).toDateString()
            : null;

        const profile = getProfile(membership?.profiles);

        const replyRow = row.reply_to_id
            ? replyMap.get(row.reply_to_id)
            : undefined;

        const replyMembership =
            replyRow?.sender_membership_id
                ? membershipMap.get(
                    replyRow.sender_membership_id,
                )
                : undefined;

        const replyProfile = getProfile(
            replyMembership?.profiles,
        );

        return {
            id: row.id,
            group_id: row.group_id,
            sender_membership_id: row.sender_membership_id,
            content: row.content,
            reply_to_id: row.reply_to_id,
            created_at: row.created_at,
            buzz_id: row.buzz_id,
            buzz: row.buzz_id ? buzzMap.get(row.buzz_id) ?? null : null,
            message_type: row.message_type,
            question: row.message_type === "question" ? row.content : null,
            me: membership?.user_id === currentUserId,

            name:
                profile?.display_name ??
                row.sender_name ??
                "Utilisateur",

            color:
                membership?.local_color ??
                row.sender_color ??
                "#0EA5E9",

            time: createdAt.toLocaleTimeString(
                "fr-FR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                },
            ),

            date:
                createdAt.toDateString() !== previousDate
                    ? formatMessageDate(createdAt)
                    : null,

            // NOUVEAU : une réponse continue aussi d'afficher
            // l'ancien auteur s'il a quitté le groupe.
            replyTo:
                replyRow
                    ? {
                        id: replyRow.id,

                        name: replyProfile?.display_name ??
                            replyRow.sender_name ??
                            "Utilisateur",

                        text:
                        replyRow.content,

                        color: replyMembership?.local_color ??
                            replyRow.sender_color ??
                            "#0EA5E9",
                    }
                    : null,

            attachments: attachmentMap.get(row.id) ?? [],

            // Nombre de membres ayant lu ce message.
            readCount: readCountMap.get(row.id) ?? 0,
        };
    });
}


// NORMALISE LA RELATION profiles RETOURNÉE PAR SUPABASE
function getProfile(
    profile: MembershipRow["profiles"] | undefined,
): { display_name: string } | null {
    if (!profile) return null;

    return Array.isArray(profile)
        ? profile[0] ?? null
        : profile;
}


// RÉCUPÈRE LES IDs DES MESSAGES NON LUS
type UnreadMessageRow = {
    message_id: string;
};

export async function getUnreadMessageIds(
    groupId: string,
): Promise<string[]> {

    const { data, error } = await supabase.rpc(
        "get_unread_message_ids",
        {
            target_group_id: groupId,
        },
    );

    if (error) {
        throw error;
    }

    return (
        (data ?? []) as UnreadMessageRow[]
    ).map((row) => row.message_id);
}


// MARQUE TOUS LES MESSAGES DU GROUPE COMME LUS

export async function markGroupMessagesAsRead(
    groupId: string,
): Promise<void> {

    const { error } = await supabase.rpc(
        "mark_group_messages_read",
        {
            target_group_id: groupId,
        },
    );

    if (error) {
        throw error;
    }
}

// MARQUE UN NOUVEAU MESSAGE COMME LU
// lorsqu'il arrive pendant que le chat est déjà ouvert
export async function markMessageAsRead(
    groupId: string,
    messageId: string,
): Promise<void> {

    const membershipId =
        await getMyMembershipId(groupId);

    const { error } = await supabase
        .from("message_reads")
        .upsert(
            {
                message_id: messageId,
                membership_id: membershipId,
            },
            {
                onConflict:
                    "message_id,membership_id",
                ignoreDuplicates: true,
            },
        );

    if (error) {
        throw error;
    }
}

// FORMAT DES SÉPARATEURS DE DATE
export function formatMessageDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if (
        date.toDateString() === today.toDateString()
    ) {
        return "Aujourd’hui";
    }

    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {
        return "Hier";
    }

    return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
export async function sendQuestionToGroup(
    groupId: string,
    question: string,
): Promise<ChatMessage> {
    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
        throw new Error("La question est vide.");
    }

    const membershipId = await getMyMembershipId(groupId);

    const {
        data,
        error,
    } = await supabase
        .from("messages")
        .insert({
            group_id: groupId,
            sender_membership_id: membershipId,
            content: cleanQuestion,
            reply_to_id: null,
            buzz_id: null,
            message_type: "question",
        })
        .select(`
            id,
            group_id,
            sender_membership_id,
            content,
            reply_to_id,
            buzz_id,
            message_type,
            created_at
        `)
        .single();

    if (error) {
        throw error;
    }

    return getMessageById(data.id);
}