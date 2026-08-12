import { supabase } from "../lib/supabase";


// ============================================================
// TYPES
// ============================================================

export type InvitationStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "blocked";


export type InvitationDirection =
    | "sent"
    | "received";


export type ChatInvitation = {

    id: string;

    direction: InvitationDirection;

    conversationName: string;

    counterpartName: string;

    status: InvitationStatus;

    statusReason: string | null;

    createdGroupId: string | null;

    createdAt: string;

    respondedAt: string | null;
};


type InvitationDatabaseRow = {

    id: string;

    direction: InvitationDirection;

    conversation_name: string;

    counterpart_name: string;

    status: InvitationStatus;

    status_reason: string | null;

    created_group_id: string | null;

    created_at: string;

    responded_at: string | null;
};


// ============================================================
// ENVOIE UNE INVITATION
//
// receiverMembershipId =
// sender_membership_id du message sur lequel
// l'utilisateur a fait "Inviter".
// ============================================================

export async function sendChatInvitation(
    receiverMembershipId: string,
    conversationName: string,
): Promise<string> {

    const cleanName =
        conversationName.trim();


    if (!cleanName) {

        throw new Error(
            "Le nom de la conversation est obligatoire.",
        );
    }


    const { data, error } =
        await supabase.rpc(
            "send_chat_invitation",
            {
                target_membership_id:
                receiverMembershipId,

                target_conversation_name:
                cleanName,
            },
        );


    if (error) {

        throw error;
    }


    if (!data) {

        throw new Error(
            "Impossible d’envoyer l’invitation.",
        );
    }


    return data as string;
}


// ============================================================
// CHARGE TOUTES LES INVITATIONS DU USER
// reçues + envoyées.
// ============================================================

export async function getMyChatInvitations():
    Promise<ChatInvitation[]> {

    const { data, error } =
        await supabase.rpc(
            "get_my_chat_invitations",
        );


    if (error) {

        throw error;
    }


    const rows =
        (data ?? []) as InvitationDatabaseRow[];


    return rows.map(
        mapInvitation,
    );
}


// ============================================================
// ACCEPTE UNE INVITATION
//
// Retourne l'id du nouveau groupe.
// ============================================================

export async function acceptChatInvitation(
    invitationId: string,
): Promise<string> {

    const { data, error } =
        await supabase.rpc(
            "accept_chat_invitation",
            {
                target_invitation_id:
                invitationId,
            },
        );


    if (error) {

        throw error;
    }


    if (!data) {

        throw new Error(
            "Impossible de créer la conversation.",
        );
    }


    return data as string;
}


// ============================================================
// REFUSE UNE INVITATION
// ============================================================

export async function rejectChatInvitation(
    invitationId: string,
): Promise<void> {

    const { error } =
        await supabase.rpc(
            "reject_chat_invitation",
            {
                target_invitation_id:
                invitationId,
            },
        );


    if (error) {

        throw error;
    }
}


// ============================================================
// PARAMÈTRE :
// AUTORISER / BLOQUER LES INVITATIONS
// ============================================================

export async function updateInvitationsEnabled(
    enabled: boolean,
): Promise<void> {

    const {
        data: { user },
        error: userError,
    } =
        await supabase.auth.getUser();


    if (userError) {

        throw userError;
    }


    if (!user) {

        throw new Error(
            "Utilisateur introuvable.",
        );
    }


    const { error } =
        await supabase
            .from("profiles")
            .update({
                invitations_enabled:
                enabled,
            })
            .eq(
                "id",
                user.id,
            );


    if (error) {

        throw error;
    }
}


// ============================================================
// RÉCUPÈRE LE PARAMÈTRE ACTUEL
// ============================================================

export async function getInvitationsEnabled():
    Promise<boolean> {

    const {
        data: { user },
        error: userError,
    } =
        await supabase.auth.getUser();


    if (userError) {

        throw userError;
    }


    if (!user) {

        throw new Error(
            "Utilisateur introuvable.",
        );
    }


    const {
        data,
        error,
    } =
        await supabase
            .from("profiles")
            .select(
                "invitations_enabled",
            )
            .eq(
                "id",
                user.id,
            )
            .single();


    if (error) {

        throw error;
    }


    return (
        data.invitations_enabled ??
        true
    );
}


// ============================================================
// NORMALISE UNE INVITATION SUPABASE
// ============================================================

function mapInvitation(
    row: InvitationDatabaseRow,
): ChatInvitation {

    return {

        id:
        row.id,

        direction:
        row.direction,

        conversationName:
        row.conversation_name,

        counterpartName:
        row.counterpart_name,

        status:
        row.status,

        statusReason:
        row.status_reason,

        createdGroupId:
        row.created_group_id,

        createdAt:
        row.created_at,

        respondedAt:
        row.responded_at,
    };
}


// ============================================================
// FORMAT DATE POUR LA PAGE INVITATIONS
// ============================================================

export function formatInvitationDate(
    value: string,
): string {

    const date =
        new Date(value);

    const today =
        new Date();

    const yesterday =
        new Date();

    yesterday.setDate(
        today.getDate() - 1,
    );


    if (
        date.toDateString()
        ===
        today.toDateString()
    ) {

        return "Aujourd’hui";
    }


    if (
        date.toDateString()
        ===
        yesterday.toDateString()
    ) {

        return "Hier";
    }


    return date.toLocaleDateString(
        "fr-FR",
        {
            day: "numeric",
            month: "short",
        },
    );
}


// ============================================================
// FORMAT HEURE
// ============================================================

export function formatInvitationTime(
    value: string,
): string {

    return new Date(
        value,
    ).toLocaleTimeString(
        "fr-FR",
        {
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}