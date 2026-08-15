import { Check, CheckCircle2, Clock3, LoaderCircle, MessageCircle, ShieldOff, X, XCircle} from "lucide-react";

import {useNavigate} from "react-router-dom";
import {useEffect, useMemo, useState} from "react";
import BottomNavigation from "../components/BottomNavigation";
import { supabase } from "../lib/supabase";

import {
    acceptChatInvitation,
    formatInvitationDate,
    formatInvitationTime,
    getMyChatInvitations,
    rejectChatInvitation,
    type ChatInvitation,
} from "../services/invitations";
import icon from "../assets/icon.png";

type InvitationTab =
    | "pending"
    | "accepted"
    | "rejected";

export default function InvitationsPage() {
    const navigate = useNavigate();

    //Toutes les invitations reçues + envoyées.
    const [invitations, setInvitations] =
        useState<ChatInvitation[]>([]);

    //Onglet actuellement sélectionné.
    const [activeTab, setActiveTab] =
        useState<InvitationTab>("pending");

    // Chargement initial.
    const [loading, setLoading] =
        useState(true);

    // Invitation actuellement traitée.
    const [processingId, setProcessingId] =
        useState<string | null>(null);

    // Message d'erreur éventuel.
    const [errorMessage, setErrorMessage] =
        useState("");

    // CHARGE LES INVITATIONS + REALTIME
    useEffect(() => {
        let active = true;

        // Charge toutes les invitations.
        async function loadInvitations() {

            try {
                const data =
                    await getMyChatInvitations();

                if (!active) return;
                setInvitations(data);
                setLoading(false);

            } catch (error) {
                console.error(
                    "Invitations loading error:",
                    error,
                );

                if (!active) return;

                setErrorMessage(
                    "Impossible de charger les invitations.",
                );

                setLoading(false);
            }
        }

        void loadInvitations();

        // Recharge la liste dès qu'une invitation : - est créée - acceptée - refusée
        const channel =
            supabase
                .channel(
                    "chat-invitations-page",
                )

                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table:
                            "chat_invitations",
                    },

                    async () => {
                        try {
                            const data =
                                await getMyChatInvitations();

                            if (!active) return;

                            setInvitations(
                                data,
                            );

                        } catch (error) {
                            console.error("Invitations realtime error:", error);
                        }
                    },
                )
                .subscribe(
                    (status, error) => {

                        if (error) {
                            console.error(
                                "Invitation realtime subscription error:",
                                status,
                                error,
                            );
                        }
                    },
                );

        return () => {

            active = false;
            void supabase.removeChannel(
                channel,
            );
        };

    }, []);

    // COMPTEURS
    const pendingCount =
        useMemo(
            () =>
                invitations.filter(
                    (invitation) =>
                        invitation.status ===
                        "pending",
                ).length,
            [invitations],
        );


    const acceptedCount =
        useMemo(
            () =>
                invitations.filter(
                    (invitation) =>
                        invitation.status ===
                        "accepted",
                ).length,
            [invitations],
        );


    const rejectedCount =
        useMemo(
            () =>
                invitations.filter(
                    (invitation) =>
                        invitation.status ===
                        "rejected" ||
                        invitation.status ===
                        "blocked",
                ).length,
            [invitations],
        );

    // INVITATIONS AFFICHÉES DANS L'ONGLET ACTUEL
    const visibleInvitations =
        useMemo(() => {

            if (
                activeTab === "pending"
            ) {

                return invitations.filter(
                    (invitation) =>
                        invitation.status ===
                        "pending",
                );
            }

            if ( activeTab === "accepted") {
                return invitations.filter(
                    (invitation) =>
                        invitation.status ===
                        "accepted",
                );
            }

            return invitations.filter(
                (invitation) =>
                    invitation.status ===
                    "rejected" ||
                    invitation.status ===
                    "blocked",
            );

        }, [
            invitations,
            activeTab,
        ]);

    // ACCEPTER UNE INVITATION
    async function handleAccept(
        invitation: ChatInvitation,
    ) {

        setProcessingId(
            invitation.id,
        );

        setErrorMessage("");
        try {
            const groupId =
                await acceptChatInvitation(
                    invitation.id,
                );

            // Recharge les invitations immédiatement.
            const refreshed =
                await getMyChatInvitations();

            setInvitations(
                refreshed,
            );

            // Ouvre directement le nouveau groupe.
            navigate(
                `/chat/${groupId}`,
            );

        } catch (error) {
            console.error(
                "Accept invitation error:",
                error,
            );
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible d’accepter l’invitation.",
            );

        } finally {
            setProcessingId(null);
        }
    }
                                         // REFUSER UNE INVITATION
    async function handleReject(
        invitation: ChatInvitation,
    ) {

        setProcessingId(
            invitation.id,
        );

        setErrorMessage("");

        try {

            await rejectChatInvitation(
                invitation.id,
            );


            const refreshed =
                await getMyChatInvitations();

            setInvitations(
                refreshed,
            );

        } catch (error) {

            console.error(
                "Reject invitation error:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible de refuser l’invitation.",
            );

        } finally {

            setProcessingId(null);
        }
    }

    // OUVRIR UNE CONVERSATION ACCEPTÉE
    function openConversation(invitation: ChatInvitation) {
        if ( !invitation.createdGroupId ) {
            return;
        }
        navigate(`/chat/${invitation.createdGroupId}`);
    }

    return (
        <main className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-28">

            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:bg-slate-700 ">

                    <div className="flex items-center justify-center gap-3 p-2">

                        <img
                            src={icon}
                            alt=""
                            className="w-15 h-12 rounded-2xl"
                        />
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            Invitations
                        </h1>
                    </div>

            </header>

            <section className="mx-auto max-w-5xl p-4 sm:p-5">
                <div
                    className="rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 p-5 text-white shadow-lg shadow-sky-100 sm:p-7">

                <div className="flex items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                            <MessageCircle size={24} />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold sm:text-2xl">
                                Conversations privées
                            </h2>

                            <p className="mt-2 max-w-xl text-sm leading-6 text-sky-100">
                                Une nouvelle conversation n’est créée que lorsque l’invitation est acceptée.
                            </p>

                        </div>

                    </div>

                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-white p-1.5 shadow-sm">

                    <TabButton
                        active={
                            activeTab ===
                            "pending"
                        }
                        label="En cours"
                        count={
                            pendingCount
                        }
                        onClick={() =>
                            setActiveTab(
                                "pending",
                            )
                        }
                    />


                    <TabButton
                        active={
                            activeTab ===
                            "accepted"
                        }
                        label="Acceptées"
                        count={
                            acceptedCount
                        }
                        onClick={() =>
                            setActiveTab(
                                "accepted",
                            )
                        }
                    />


                    <TabButton
                        active={
                            activeTab ===
                            "rejected"
                        }
                        label="Refusées"
                        count={
                            rejectedCount
                        }
                        onClick={() =>
                            setActiveTab(
                                "rejected",
                            )
                        }
                    />

                </div>

                {errorMessage && (

                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">

                        {errorMessage}

                    </div>

                )}

                {loading ? (
                    <div className="flex min-h-[420px] items-center justify-center">

                        <LoaderCircle
                            size={32}
                            className="animate-spin text-sky-500"
                        />

                    </div>

                ) : visibleInvitations.length ===
                0 ? (

                    <EmptyState
                        tab={activeTab}
                    />

                ) : (

                    <div className="mt-5 space-y-4">

                        {visibleInvitations.map(
                            (
                                invitation,
                            ) => (

                                <InvitationCard
                                    key={
                                        invitation.id
                                    }

                                    invitation={
                                        invitation
                                    }

                                    processing={
                                        processingId ===
                                        invitation.id
                                    }

                                    onAccept={() =>
                                        void handleAccept(
                                            invitation,
                                        )
                                    }

                                    onReject={() =>
                                        void handleReject(
                                            invitation,
                                        )
                                    }

                                    onOpen={() =>
                                        openConversation(
                                            invitation,
                                        )
                                    }
                                />

                            ),
                        )}

                    </div>

                )}

            </section>

            <BottomNavigation
                active="invitations"
            />

        </main>
    );
}


// TAB BUTTON
type TabButtonProps = {
    active: boolean;
    label: string;
    count: number;
    onClick: () => void;
};

function TabButton({active, label, count,
                       onClick,
                   }: TabButtonProps) {

    return (
        <button
            type="button"

            onClick={onClick}

            className={`relative flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition sm:px-4 ${
                active
                    ? "bg-sky-500 text-white shadow-md shadow-sky-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
        >

            <span className="truncate">
                {label}
            </span>


            {count > 0 && (

                <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        active
                            ? "bg-white text-sky-600"
                            : "bg-slate-100 text-slate-500"
                    }`}
                >
                    {count}
                </span>

            )}

        </button>

    );
}

type InvitationCardProps = {
    invitation: ChatInvitation;
    processing: boolean;
    onAccept: () => void;
    onReject: () => void;
    onOpen: () => void;
};

function InvitationCard({
                            invitation,
                            processing,
                            onAccept,
                            onReject,
                            onOpen,
                        }: InvitationCardProps) {

    const isReceived =
        invitation.direction ===
        "received";

    const isSent =
        invitation.direction ===
        "sent";

    const isPending =
        invitation.status ===
        "pending";

    const isAccepted =
        invitation.status ===
        "accepted";

    const isRejected =
        invitation.status ===
        "rejected";

    const isBlocked =
        invitation.status ===
        "blocked";


    return (

        <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white dark:bg-slate-700 shadow-sm transition hover:shadow-md">

            <div className="p-5 sm:p-6">

                <div className="flex items-start gap-4">

                    <StatusIcon status={invitation.status}/>

                    <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                                    {
                                        invitation.conversationName
                                    }
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">

                                    {isReceived
                                        ? "Invitation reçue de "
                                        : "Invitation envoyée à "}

                                    <span className="font-semibold text-slate-700">

                                        {
                                            invitation.counterpartName
                                        }

                                    </span>

                                </p>

                            </div>


                            <StatusBadge
                                invitation={
                                    invitation
                                }
                            />

                        </div>


                        <p className="mt-3 text-xs text-slate-400">

                            {formatInvitationDate(
                                invitation.createdAt,
                            )}

                            {" • "}

                            {formatInvitationTime(
                                invitation.createdAt,
                            )}

                        </p>

                    </div>

                </div>

                {isSent &&
                    isPending && (
                        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
                            <Clock3
                                size={19}
                                className="mt-0.5 shrink-0 text-amber-500"
                            />
                            <div>
                                <p className="text-sm font-semibold text-amber-700">
                                    En attente d’une réponse
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-600">
                                    Tu seras informé automatiquement lorsque cette personne acceptera ou refusera.
                                </p>
                            </div>
                        </div>
                    )}

                {isBlocked && (

                    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-100 p-4">
                        <ShieldOff
                            size={19}
                            className="mt-0.5 shrink-0 text-slate-500"
                        />

                        <div>

                            <p className="text-sm font-semibold text-slate-700">
                                Invitations désactivées
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">

                                {invitation.statusReason ??
                                    "Cet utilisateur n’autorise pas les invitations."}

                            </p>

                        </div>

                    </div>

                )}


                {isRejected && (

                    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-red-50 p-4">

                        <XCircle
                            size={19}
                            className="mt-0.5 shrink-0 text-red-500"
                        />

                        <div>

                            <p className="text-sm font-semibold text-red-600">
                                Invitation refusée
                            </p>

                            <p className="mt-1 text-xs leading-5 text-red-500">

                                {isSent
                                    ? `${invitation.counterpartName} a refusé cette invitation.`
                                    : "Tu as refusé cette invitation."}

                            </p>

                        </div>

                    </div>

                )}


                {isAccepted && (

                    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">

                        <CheckCircle2
                            size={19}
                            className="mt-0.5 shrink-0 text-emerald-500"
                        />

                        <div>

                            <p className="text-sm font-semibold text-emerald-700">
                                Conversation créée
                            </p>

                            <p className="mt-1 text-xs leading-5 text-emerald-600">
                                Vous pouvez maintenant discuter dans votre nouveau groupe privé.
                            </p>

                        </div>

                    </div>

                )}

            </div>


            {/* ==================================================
                ACTIONS
            ================================================== */}

            {isPending &&
                isReceived && (

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">

                        <button
                            type="button"

                            disabled={
                                processing
                            }

                            onClick={
                                onReject
                            }

                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-100 font-semibold text-red-600 transition hover:bg-red-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            {processing ? (

                                <LoaderCircle
                                    size={18}
                                    className="animate-spin"
                                />

                            ) : (

                                <X
                                    size={18}
                                />

                            )}

                            Refuser

                        </button>


                        <button
                            type="button"

                            disabled={
                                processing
                            }

                            onClick={
                                onAccept
                            }

                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 font-semibold text-white shadow-md shadow-sky-100 transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >

                            {processing ? (

                                <LoaderCircle
                                    size={18}
                                    className="animate-spin"
                                />

                            ) : (

                                <Check
                                    size={18}
                                />

                            )}

                            Accepter

                        </button>

                    </div>

                )}


            {isAccepted &&
                invitation.createdGroupId && (

                    <div className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5">

                        <button
                            type="button"

                            onClick={
                                onOpen
                            }

                            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-semibold text-white shadow-md shadow-sky-100 transition hover:bg-sky-600 active:scale-[0.98]"
                        >

                            <MessageCircle
                                size={19}
                            />

                            Ouvrir la conversation

                        </button>

                    </div>

                )}

        </article>

    );
}


// ======================================================
// STATUS ICON
// ======================================================

function StatusIcon({
                        status,
                    }: {
    status:
        ChatInvitation["status"];
}) {

    if (
        status ===
        "accepted"
    ) {

        return (

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">

                <CheckCircle2
                    size={22}
                />

            </div>

        );
    }


    if (
        status ===
        "rejected"
    ) {

        return (

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-500">

                <XCircle
                    size={22}
                />

            </div>

        );
    }


    if (
        status ===
        "blocked"
    ) {

        return (

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">

                <ShieldOff
                    size={22}
                />

            </div>

        );
    }


    return (

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">

            <Clock3
                size={22}
            />

        </div>

    );
}


// ======================================================
// STATUS BADGE
// ======================================================

function StatusBadge({
                         invitation,
                     }: {
    invitation:
        ChatInvitation;
}) {

    if (
        invitation.status ===
        "accepted"
    ) {

        return (

            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-600">
                Acceptée
            </span>

        );
    }


    if (
        invitation.status ===
        "rejected"
    ) {

        return (

            <span className="shrink-0 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-500">
                Refusée
            </span>

        );
    }


    if (
        invitation.status ===
        "blocked"
    ) {

        return (

            <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500">
                Indisponible
            </span>

        );
    }


    return (

        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-600">
            En cours
        </span>

    );
}


// ======================================================
// EMPTY STATE
// ======================================================

function EmptyState({
                        tab,
                    }: {
    tab: InvitationTab;
}) {

    let title =
        "Aucune invitation";

    let description =
        "Les invitations apparaîtront ici.";

    let icon:
        React.ReactNode =
        <MessageCircle size={28} />;


    if (tab === "pending") {
        title = "Aucune invitation en cours";
        description = "Les invitations envoyées ou reçues en attente apparaîtront ici.";
        icon = <Clock3 size={28} />;
    }


    if (tab === "accepted") {
        title = "Aucune invitation acceptée";
        description = "Tes conversations créées à partir d’invitations apparaîtront ici.";
        icon = <CheckCircle2 size={28} />;
    }


    if (tab === "rejected") {
        title = "Aucune invitation refusée";
        description = "Les invitations refusées ou indisponibles apparaîtront ici.";
        icon = <XCircle size={28} />;
    }

    return (
        <div className="mt-6 flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-slate-700 px-6 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-500">
                {icon}
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-800">

                {title}

            </h2>


            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">

                {description}

            </p>

        </div>

    );
}