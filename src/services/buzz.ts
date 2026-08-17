import { supabase } from "../lib/supabase";


// ============================================================
// TYPES
// ============================================================

export type VoteType =
    | "single"
    | "multiple";


export type BuzzOption = {
    id: string;
    buzz_id: string;
    label: string;
    position: number;
};


export type Buzz = {
    id: string;
    creator_user_id: string;
    group_id: string | null;
    question: string;
    vote_type: VoteType;
    allow_external_votes: boolean;
    show_results_after_vote: boolean;
    is_active: boolean;
    share_code: string;
    created_at: string;
    updated_at: string;
    closed_at: string | null;

    buzz_options?: BuzzOption[];

    votes_count?: number;
    tellme_votes_count?: number;
    external_votes_count?: number;
};


export type CreateBuzzInput = {
    question: string;
    options: string[];
    voteType: VoteType;
    groupId?: string | null;
    allowExternalVotes: boolean;
    showResultsAfterVote: boolean;
};

export type BuzzVoteResult = {
    option_id: string;
    label: string;
    position: number;
    votes: number;
};
export type PublicBuzzOption = {
    id: string;
    label: string;
    position: number;
};

export type PublicBuzz = {
    id: string;
    question: string;
    vote_type: VoteType;
    allow_external_votes: boolean;
    show_results_after_vote: boolean;
    is_active: boolean;
    share_code: string;
    group_id: string | null;
    group_name: string | null;
    group_invite_code: string | null;
    options: PublicBuzzOption[];
};

export type PublicBuzzResult = {
    option_id: string;
    label: string;
    votes: number;
};

export async function getPublicBuzz(
    shareCode: string,
): Promise<PublicBuzz | null> {
    const { data, error } = await supabase.rpc(
        "get_public_buzz",
        {
            target_share_code: shareCode,
        },
    );

    if (error) throw error;
    if (!data) return null;

    return data as PublicBuzz;
}

export async function votePublicBuzz(
    shareCode: string,
    visitorId: string,
    optionIds: string[],
): Promise<void> {
    const { error } = await supabase.rpc(
        "vote_public_buzz",
        {
            target_share_code: shareCode,
            target_visitor_id: visitorId,
            target_option_ids: optionIds,
        },
    );

    if (error) throw error;
}

export async function getPublicBuzzResults(
    shareCode: string,
): Promise<PublicBuzzResult[]> {
    const { data, error } = await supabase.rpc(
        "get_public_buzz_results",
        {
            target_share_code: shareCode,
        },
    );

    if (error) throw error;

    return (data ?? []).map(
        (item: {
            option_id: string;
            label: string;
            votes: number | string;
        }): PublicBuzzResult => ({
            option_id: item.option_id,
            label: item.label,
            votes: Number(item.votes),
        }),
    );
}

export type ChatBuzz = Buzz & {
    has_voted: boolean;
    selected_option_ids: string[];
    results: BuzzVoteResult[];
};
// ============================================================
// GÉNÈRE LE CODE PUBLIC
// ============================================================

function generateShareCode(): string {

    return crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 12);
}


// ============================================================
// CRÉER UN BUZZ
// ============================================================

export async function createBuzz(
    input: CreateBuzzInput,
): Promise<Buzz> {

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();


    if (userError) {
        throw userError;
    }


    if (!user) {
        throw new Error(
            "Utilisateur introuvable.",
        );
    }


    const question =
        input.question.trim();


    const options =
        input.options
            .map((option) =>
                option.trim(),
            )
            .filter(Boolean);


    if (!question) {
        throw new Error(
            "La question est obligatoire.",
        );
    }


    if (options.length < 2) {
        throw new Error(
            "Ajoute au moins deux réponses.",
        );
    }


    const shareCode =
        generateShareCode();


    // --------------------------------------------------------
    // CRÉATION DU BUZZ
    // --------------------------------------------------------

    const {
        data: buzz,
        error: buzzError,
    } = await supabase
        .from("buzzes")
        .insert({
            creator_user_id:
            user.id,

            group_id:
                input.groupId ?? null,

            question,

            vote_type:
            input.voteType,

            allow_external_votes:
            input.allowExternalVotes,

            show_results_after_vote:
            input.showResultsAfterVote,

            share_code:
            shareCode,
        })
        .select()
        .single();


    if (buzzError) {
        throw buzzError;
    }


    // --------------------------------------------------------
    // CRÉATION DES OPTIONS
    // --------------------------------------------------------

    const optionRows =
        options.map(
            (label, index) => ({
                buzz_id:
                buzz.id,

                label,

                position:
                index,
            }),
        );


    const {
        data: createdOptions,
        error: optionsError,
    } = await supabase
        .from("buzz_options")
        .insert(optionRows)
        .select();


    if (optionsError) {

        // Évite de laisser un Buzz vide.
        await supabase
            .from("buzzes")
            .delete()
            .eq(
                "id",
                buzz.id,
            );

        throw optionsError;
    }


    return {
        ...buzz,
        buzz_options:
            createdOptions ?? [],
        votes_count: 0,
        tellme_votes_count: 0,
        external_votes_count: 0,
    } as Buzz;
}


// ============================================================
// MES BUZZ
// ============================================================

export async function getMyBuzzes():
    Promise<Buzz[]> {

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();


    if (userError) {
        throw userError;
    }


    if (!user) {
        return [];
    }


    const {
        data: buzzes,
        error: buzzError,
    } = await supabase
        .from("buzzes")
        .select(`
            *,
            buzz_options (
                id,
                buzz_id,
                label,
                position
            )
        `)
        .eq(
            "creator_user_id",
            user.id,
        )
        .order(
            "created_at",
            {
                ascending: false,
            },
        );


    if (buzzError) {
        throw buzzError;
    }


    if (!buzzes?.length) {
        return [];
    }


    const buzzIds =
        buzzes.map(
            (buzz) => buzz.id,
        );


    // --------------------------------------------------------
    // CHARGE LES VOTES
    // --------------------------------------------------------

    const {
        data: votes,
        error: votesError,
    } = await supabase
        .from("buzz_votes")
        .select(`
            id,
            buzz_id,
            source
        `)
        .in(
            "buzz_id",
            buzzIds,
        );


    if (votesError) {
        throw votesError;
    }


    return buzzes.map((buzz) => {

        const buzzVotes =
            (votes ?? []).filter(
                (vote) =>
                    vote.buzz_id ===
                    buzz.id,
            );


        return {
            ...buzz,

            buzz_options:
                [...(buzz.buzz_options ?? [])]
                    .sort(
                        (a, b) =>
                            a.position -
                            b.position,
                    ),

            votes_count:
            buzzVotes.length,

            tellme_votes_count:
            buzzVotes.filter(
                (vote) =>
                    vote.source ===
                    "tellme",
            ).length,

            external_votes_count:
            buzzVotes.filter(
                (vote) =>
                    vote.source ===
                    "external",
            ).length,
        };

    }) as Buzz[];
}


// ============================================================
// ACTIVER / FERMER
// ============================================================

export async function setBuzzActive(
    buzzId: string,
    active: boolean,
): Promise<void> {

    const {
        error,
    } = await supabase
        .from("buzzes")
        .update({
            is_active:
            active,

            closed_at:
                active
                    ? null
                    : new Date()
                        .toISOString(),

            updated_at:
                new Date()
                    .toISOString(),
        })
        .eq(
            "id",
            buzzId,
        );


    if (error) {
        throw error;
    }
}


// ============================================================
// SUPPRIMER
// ============================================================

export async function deleteBuzz(
    buzzId: string,
): Promise<void> {

    const {
        error,
    } = await supabase
        .from("buzzes")
        .delete()
        .eq(
            "id",
            buzzId,
        );


    if (error) {
        throw error;
    }
}


// ============================================================
// LIEN PUBLIC
// ============================================================

export function getBuzzShareLink(
    shareCode: string,
): string {

    return `${window.location.origin}/b/${shareCode}`;
}
// ============================================================
// PUBLIER LE BUZZ DANS SON GROUPE
// ============================================================
export async function publishBuzzToGroup(buzz: Buzz): Promise<void> {
    if (!buzz.group_id) {
        throw new Error("Ce Buzz n'est lié à aucun groupe.");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Utilisateur introuvable.");

    const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", buzz.group_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

    if (membershipError) throw membershipError;

    const { data: existingMessage, error: existingError } = await supabase
        .from("messages")
        .select("id")
        .eq("buzz_id", buzz.id)
        .eq("group_id", buzz.group_id)
        .maybeSingle();

    if (existingError) throw existingError;

    if (existingMessage) {
        throw new Error("Ce Buzz est déjà publié dans ce groupe.");
    }

    const { error } = await supabase
        .from("messages")
        .insert({
            group_id: buzz.group_id,
            sender_membership_id: membership.id,
            content: buzz.question,
            buzz_id: buzz.id,
        });

    if (error) throw error;
}
export async function voteBuzz(
    buzzId: string,
    optionIds: string[],
): Promise<void> {

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();


    if (userError) {
        throw userError;
    }


    if (!user) {
        throw new Error(
            "Utilisateur introuvable.",
        );
    }


    if (optionIds.length === 0) {
        throw new Error(
            "Sélectionne une réponse.",
        );
    }


    // Charge le Buzz.
    const {
        data: buzz,
        error: buzzError,
    } = await supabase
        .from("buzzes")
        .select(`
            id,
            vote_type,
            is_active
        `)
        .eq(
            "id",
            buzzId,
        )
        .single();


    if (buzzError) {
        throw buzzError;
    }


    if (!buzz.is_active) {
        throw new Error(
            "Ce Buzz est fermé.",
        );
    }


    if (
        buzz.vote_type === "single" &&
        optionIds.length !== 1
    ) {
        throw new Error(
            "Une seule réponse est autorisée.",
        );
    }


    // Vérifie si le user a déjà voté.
    const {
        data: existingVote,
        error: existingVoteError,
    } = await supabase
        .from("buzz_votes")
        .select("id")
        .eq(
            "buzz_id",
            buzzId,
        )
        .eq(
            "user_id",
            user.id,
        )
        .maybeSingle();


    if (existingVoteError) {
        throw existingVoteError;
    }


    if (existingVote) {
        throw new Error(
            "Tu as déjà voté à ce Buzz.",
        );
    }


    // Crée la participation.
    const {
        data: vote,
        error: voteError,
    } = await supabase
        .from("buzz_votes")
        .insert({
            buzz_id:
            buzzId,

            user_id:
            user.id,

            source:
                "tellme",
        })
        .select("id")
        .single();


    if (voteError) {
        throw voteError;
    }


    const choices =
        optionIds.map(
            (optionId) => ({
                vote_id:
                vote.id,

                option_id:
                optionId,
            }),
        );


    const {
        error: choiceError,
    } = await supabase
        .from("buzz_vote_choices")
        .insert(choices);


    if (choiceError) {

        await supabase
            .from("buzz_votes")
            .delete()
            .eq(
                "id",
                vote.id,
            );

        throw choiceError;
    }
}