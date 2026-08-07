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
    lifetime_minutes: number | null;
    expires_at: string | null;
    created_at: string;
    members_count: number;
    unread_count: number;
};

type MembershipWithGroup = {
    group_id: string;
    groups: {
        id: string;
        name: string;
        color: string;
        dominus_id: string;
        invite_code: string;
        lifetime_minutes: number | null;
        expires_at: string | null;
        created_at: string;
        group_members: { count: number }[];
    } | {
        id: string;
        name: string;
        color: string;
        dominus_id: string;
        invite_code: string;
        lifetime_minutes: number | null;
        expires_at: string | null;
        created_at: string;
        group_members: { count: number }[];
    }[] | null;
};

//Crée un groupe grâce à la fonction PostgreSQL create_group.
// La fonction ajoute aussi automatiquement le Dominus.
export async function createGroup(
    name: string,
    color: string,
    lifetimeMinutes: GroupLifetime,
): Promise<string> {
    const { data, error } = await supabase.rpc("create_group", {
        group_name: name.trim(),
        group_color: color,
        group_lifetime_minutes: lifetimeMinutes,
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Le groupe n’a pas été créé.");
    }

    return data as string;
}
 //Charge tous les groupes actifs de l'utilisateur connecté.
export async function getMyGroups(): Promise<Group[]> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

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
        .order("joined_at", { ascending: false });

    if (error) {
        throw error;
    }

    return ((data ?? []) as MembershipWithGroup[])
        .flatMap((membership) => {

            if (!membership.groups) return [];

            const group = Array.isArray(membership.groups)
                ? membership.groups[0]
                : membership.groups;

            return [{
                ...group,
                members_count: group.group_members?.[0]?.count ?? 0,
                unread_count: 0,
            }];

        });
}

export type GroupDetails = {
    id: string;
    name: string;
    color: string;
    membersCount: number;
    createdAt: string;
    duration: string;
    inviteLink: string;
    isDominus: boolean;
};

// Charge toutes les informations d'un groupe
export async function getGroupDetails(groupId: string): Promise<GroupDetails>  {

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
            created_at,
            group_members(count)
        `)
        .eq("id", groupId)
        .single();

    if (error) throw error;
    console.log("Supabase group :", data);
    return {

        id: data.id,

        name: data.name,

        color: data.color,

        membersCount:
            data.group_members?.[0]?.count ?? 0,

        createdAt: new Date(
            data.created_at,
        ).toLocaleDateString("fr-FR"),

        duration: data.lifetime_minutes === null
                ? "Jamais"
                : `${data.lifetime_minutes} minutes`,

        inviteLink: `${window.location.origin}/invite/${data.invite_code}`,

        isDominus: data.dominus_id === user.id,
    };

}