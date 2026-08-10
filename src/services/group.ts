import { supabase } from "../lib/supabase";

export type GroupLifetime =
    | 5
    | 30
    | 60
    | 120
    | 1440
    | 4320
    | 10080
    | null;

export type Group = {
    id: string;
    name: string;
    color: string;
    dominus_id: string;
    invite_code: string;
    lifetime_minutes: GroupLifetime;
    expires_at: string | null;
    created_at: string;
    members_count: number;
    unread_count: number;
};

type DatabaseGroup = {
    id: string;
    name: string;
    color: string;
    dominus_id: string;
    invite_code: string;
    lifetime_minutes: GroupLifetime;
    expires_at: string | null;
    created_at: string;
    group_members: { count: number }[];
};

type MembershipWithGroup = {
    group_id: string;
    groups: DatabaseGroup | DatabaseGroup[] | null;
};

export type GroupDetails = {
    id: string;
    name: string;
    color: string;
    membersCount: number;
    messageCount: number;
    createdAt: string;
    createdAtLabel: string;
    lifetimeMinutes: GroupLifetime;
    expiresAt: string | null;
    expiresLabel: string;
    inviteCode: string;
    inviteLink: string;
    isDominus: boolean;
};

export type GroupMember = {
    id: string;
    userId: string;
    name: string;
    color: string;
    joinedAt: string;
    lastSeenAt: string;
};

type GroupMemberDatabaseRow = {
    id: string;
    user_id: string;
    local_color: string;
    joined_at: string;
    last_seen_at: string;
    profiles:
        | {
        display_name: string;
    }
        | {
        display_name: string;
    }[]
        | null;
};

export type GroupMediaKind =
    | "image"
    | "video"
    | "file";

export type GroupMediaItem = {
    id: string;
    messageId: string;
    fileName: string;
    fileType: string;
    fileSize: number | null;
    storagePath: string;
    signedUrl: string;
    createdAt: string;
    kind: GroupMediaKind;
};

type AttachmentDatabaseRow = {
    id: string;
    message_id: string;
    storage_path: string;
    file_name: string;
    file_type: string;
    file_size: number | null;
    created_at: string;
};

export type GroupInvitePreview = {
    id: string;
    name: string;
    color: string;
    membersCount: number;
    createdAt: string;
};

type InvitePreviewRow = {
    id: string;
    name: string;
    color: string;
    members_count: number;
    created_at: string;
};


// ============================================================
// CRÉATION DU GROUPE
// ============================================================

export async function createGroup(
    name: string,
    color: string,
    lifetimeMinutes: GroupLifetime,
): Promise<string> {

    const { data, error } = await supabase.rpc(
        "create_group",
        {
            group_name: name.trim(),
            group_color: color,
            group_lifetime_minutes: lifetimeMinutes,
        },
    );

    if (error) throw error;

    if (!data) {
        throw new Error("Le groupe n’a pas été créé.");
    }

    return data as string;
}


// ============================================================
// CHARGE LES GROUPES DU USER
// Un groupe n'apparaît que si le user est membre actif.
// ============================================================

export async function getMyGroups(): Promise<Group[]> {

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error("Utilisateur introuvable.");
    }

    const { data, error } = await supabase
        .from("group_members")
        .select(`
            group_id,
            groups (
                id,
                name,
                color,
                dominus_id,
                invite_code,
                lifetime_minutes,
                expires_at,
                created_at,
                group_members(count)
            )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("joined_at", {
            ascending: false,
        });

    if (error) throw error;

    return (
        (data ?? []) as unknown as MembershipWithGroup[]
    ).flatMap((membership) => {

        if (!membership.groups) return [];

        const group = Array.isArray(
            membership.groups,
        )
            ? membership.groups[0]
            : membership.groups;

        if (!group) return [];

        return [{
            id: group.id,
            name: group.name,
            color: group.color,
            dominus_id: group.dominus_id,
            invite_code: group.invite_code,
            lifetime_minutes:
            group.lifetime_minutes,
            expires_at: group.expires_at,
            created_at: group.created_at,

            members_count:
                group.group_members?.[0]?.count ?? 0,

            // Réservé pour la prochaine étape : messages non lus.
            unread_count: 0,
        }];
    });
}


// ============================================================
// INFORMATIONS COMPLÈTES DU GROUPE
// ============================================================

export async function getGroupDetails(
    groupId: string,
): Promise<GroupDetails> {

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error("Utilisateur introuvable.");
    }

    const { data, error } = await supabase
        .from("groups")
        .select(`
            id,
            name,
            color,
            dominus_id,
            invite_code,
            lifetime_minutes,
            expires_at,
            created_at,
            group_members(count),
            messages(count)
        `)
        .eq("id", groupId)
        .single();

    if (error) throw error;

    const created = new Date(data.created_at);

    return {
        id: data.id,
        name: data.name,
        color: data.color,

        membersCount:
            data.group_members?.[0]?.count ?? 0,

        messageCount:
            data.messages?.[0]?.count ?? 0,

        createdAt: created.toLocaleDateString(
            "fr-FR",
        ),

        createdAtLabel:
            formatRelativeDate(created),

        lifetimeMinutes:
            data.lifetime_minutes as GroupLifetime,

        expiresAt:
            data.expires_at ?? null,

        expiresLabel:
            formatExpiration(data.expires_at),

        inviteCode:
        data.invite_code,

        // Le lien peut être copié et ouvert sur un autre appareil.
        inviteLink:
            `${window.location.origin}/join/${data.invite_code}`,

        isDominus:
            data.dominus_id === user.id,
    };
}


// ============================================================
// MODIFIE LA DURÉE DU GROUPE
// RPC sécurisé : seul le Dominus peut le faire.
// ============================================================

export async function updateGroupLifetime(
    groupId: string,
    lifetime: GroupLifetime,
): Promise<string | null> {

    const { data, error } = await supabase.rpc(
        "update_group_lifetime",
        {
            target_group_id: groupId,
            new_lifetime_minutes: lifetime,
        },
    );

    if (error) throw error;

    return data as string | null;
}


// ============================================================
// CHARGE LES MEMBRES DU GROUPE
// Aucun rôle/admin n'est retourné au frontend.
// ============================================================

export async function getGroupMembers(
    groupId: string,
): Promise<GroupMember[]> {

    const { data, error } = await supabase
        .from("group_members")
        .select(`
            id,
            user_id,
            local_color,
            joined_at,
            last_seen_at,
            profiles!group_members_user_id_fkey (
                display_name
            )
        `)
        .eq("group_id", groupId)
        .eq("status", "active")
        .order("joined_at", {
            ascending: true,
        });

    if (error) throw error;

    const rows =
        (data ?? []) as unknown as GroupMemberDatabaseRow[];

    return rows.map((row) => {

        const profile =
            Array.isArray(row.profiles)
                ? row.profiles[0]
                : row.profiles;

        return {
            id: row.id,
            userId: row.user_id,

            name:
                profile?.display_name
                ?? "Utilisateur",

            color:
                row.local_color
                ?? "#0EA5E9",

            joinedAt:
            row.joined_at,

            lastSeenAt:
            row.last_seen_at,
        };
    });
}


// ============================================================
// CHARGE TOUS LES MÉDIAS / FICHIERS DU GROUPE
// Deux requêtes évitent les jointures PostgREST fragiles.
// ============================================================

export async function getGroupMedia(
    groupId: string,
): Promise<GroupMediaItem[]> {

    const { data: messageData, error: messageError } =
        await supabase
            .from("messages")
            .select("id")
            .eq("group_id", groupId)
            .is("deleted_at", null);

    if (messageError) throw messageError;

    const messageIds =
        (messageData ?? []).map(
            (message) => message.id,
        );

    if (messageIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from("attachments")
        .select(`
            id,
            message_id,
            storage_path,
            file_name,
            file_type,
            file_size,
            created_at
        `)
        .in("message_id", messageIds)
        .order("created_at", {
            ascending: false,
        });

    if (error) throw error;

    const rows =
        (data ?? []) as AttachmentDatabaseRow[];

    return Promise.all(
        rows.map(async (row) => {

            const {
                data: signedData,
                error: signedError,
            } = await supabase.storage
                .from("chat-media")
                .createSignedUrl(
                    row.storage_path,
                    60 * 60,
                );

            if (signedError) {
                throw signedError;
            }

            return {
                id: row.id,
                messageId: row.message_id,
                fileName: row.file_name,
                fileType: row.file_type,
                fileSize: row.file_size,
                storagePath: row.storage_path,
                signedUrl: signedData.signedUrl,
                createdAt: row.created_at,
                kind:
                    getMediaKind(row.file_type),
            };
        }),
    );
}


// ============================================================
// RÉCUPÈRE LA COULEUR PERSONNELLE DU USER DANS CE GROUPE
// ============================================================

export async function getMyMessageColor(
    groupId: string,
): Promise<string> {

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error("Utilisateur introuvable.");
    }

    const { data, error } = await supabase
        .from("group_members")
        .select("local_color")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

    if (error) throw error;

    return data.local_color;
}


// ============================================================
// MODIFIE UNIQUEMENT LA COULEUR DES MESSAGES DU USER
// ============================================================

export async function updateMyMessageColor(
    groupId: string,
    color: string,
): Promise<void> {

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
        throw new Error("Utilisateur introuvable.");
    }

    const { error } = await supabase
        .from("group_members")
        .update({
            local_color: color,
        })
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .eq("status", "active");

    if (error) throw error;
}


// ============================================================
// QUITTER LE GROUPE
// ============================================================

export async function leaveGroup(
    groupId: string,
): Promise<void> {

    const { error } = await supabase.rpc(
        "leave_group",
        {
            target_group_id: groupId,
        },
    );

    if (error) throw error;
}


// ============================================================
// SUPPRIME MANUELLEMENT UN GROUPE
// 1. supprime les fichiers Storage
// 2. supprime le groupe SQL
// Les cascades nettoient membres/messages/attachments.
// ============================================================

export async function deleteGroup(
    groupId: string,
): Promise<void> {

    const media =
        await getGroupMedia(groupId);

    const paths =
        media.map(
            (item) => item.storagePath,
        );

    // Storage API accepte au maximum 1000 paths par remove.
    for (
        let start = 0;
        start < paths.length;
        start += 1000
    ) {

        const batch =
            paths.slice(
                start,
                start + 1000,
            );

        const { error } = await supabase.storage
            .from("chat-media")
            .remove(batch);

        if (error) throw error;
    }

    const { error } = await supabase.rpc(
        "delete_group",
        {
            target_group_id: groupId,
        },
    );

    if (error) throw error;
}


// ============================================================
// PREVIEW D'INVITATION
// ============================================================

export async function getGroupPreviewByInviteCode(
    inviteCode: string,
): Promise<GroupInvitePreview> {

    const { data, error } = await supabase.rpc(
        "get_group_preview_by_invite_code",
        {
            target_invite_code: inviteCode,
        },
    );

    if (error) throw error;

    const rows =
        (data ?? []) as InvitePreviewRow[];

    const row = rows[0];

    if (!row) {
        throw new Error(
            "Ce lien est invalide ou a expiré.",
        );
    }

    return {
        id: row.id,
        name: row.name,
        color: row.color,
        membersCount:
            Number(row.members_count),
        createdAt:
        row.created_at,
    };
}


// ============================================================
// REJOINDRE LE GROUPE AVEC LE LIEN
// ============================================================

export async function joinGroupByInviteCode(
    inviteCode: string,
): Promise<string> {

    const { data, error } = await supabase.rpc(
        "join_group_by_invite_code",
        {
            target_invite_code: inviteCode,
        },
    );

    if (error) throw error;

    if (!data) {
        throw new Error(
            "Impossible de rejoindre le groupe.",
        );
    }

    return data as string;
}


// ============================================================
// HELPERS
// ============================================================

function getMediaKind(
    fileType: string,
): GroupMediaKind {

    if (
        fileType.startsWith("image/")
    ) {
        return "image";
    }

    if (
        fileType.startsWith("video/")
    ) {
        return "video";
    }

    return "file";
}


// Affichage : "Créé aujourd'hui", "Créé il y a 3 jours", etc.
function formatRelativeDate(
    date: Date,
): string {

    const now = new Date();

    const difference =
        now.getTime()
        - date.getTime();

    const days =
        Math.floor(
            difference
            / (1000 * 60 * 60 * 24),
        );

    if (days <= 0) {
        return "Créé aujourd’hui";
    }

    if (days === 1) {
        return "Créé hier";
    }

    if (days < 30) {
        return `Créé il y a ${days} jours`;
    }

    return `Créé le ${date.toLocaleDateString(
        "fr-FR",
    )}`;
}


// Affichage de l'expiration.
function formatExpiration(
    expiresAt: string | null,
): string {

    if (!expiresAt) {
        return "Aucune expiration";
    }

    return new Date(
        expiresAt,
    ).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}