import {
    ArrowLeft,
    ChevronRight,
    Clock3,
    Copy,
    Images,
    LoaderCircle,
    LogOut,
    Palette,
    Share2,
    Trash2,
    Users,
} from "lucide-react";

import icon from "../assets/icon.png";

import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    useEffect,
    useState,
} from "react";

import {
    deleteGroup,
    getGroupDetails,
    leaveGroup,
    updateGroupLifetime,
    type GroupDetails,
    type GroupLifetime,
} from "../services/group";


const durations: {
    label: string;
    value: GroupLifetime;
}[] = [
    {
        label: "5 minutes",
        value: 5,
    },
    {
        label: "30 minutes",
        value: 30,
    },
    {
        label: "1 heure",
        value: 60,
    },
    {
        label: "2 heures",
        value: 120,
    },
    {
        label: "1 jour",
        value: 1440,
    },
    {
        label: "3 jours",
        value: 4320,
    },
    {
        label: "7 jours",
        value: 10080,
    },
    {
        label: "Jamais",
        value: null,
    },
];


export default function GroupDetailsPage() {

    const { groupId } =
        useParams<{ groupId: string }>();

    const navigate =
        useNavigate();

    const [group, setGroup] =
        useState<GroupDetails | null>(null);

    const [duration, setDuration] =
        useState<GroupLifetime>(null);

    const [loading, setLoading] =
        useState(true);

    const [savingDuration, setSavingDuration] =
        useState(false);

    const [copied, setCopied] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");


    // Charge les informations du groupe.
    useEffect(() => {

        if (!groupId) return;

        let active = true;

        getGroupDetails(groupId)
            .then((data) => {

                if (!active) return;

                setGroup(data);

                setDuration(
                    data.lifetimeMinutes,
                );

                setLoading(false);
            })
            .catch((error) => {

                console.error(
                    "Group details error:",
                    error,
                );

                if (!active) return;

                setErrorMessage(
                    "Impossible de charger le groupe.",
                );

                setLoading(false);
            });

        return () => {
            active = false;
        };

    }, [groupId]);


    // Copie le lien d'invitation.
    async function copyInviteLink() {

        if (!group) return;

        try {

            await navigator.clipboard.writeText(
                group.inviteLink,
            );

            setCopied(true);

            window.setTimeout(
                () => setCopied(false),
                1800,
            );

        } catch {
            setErrorMessage(
                "Impossible de copier le lien.",
            );
        }
    }


    // Utilise le partage natif du téléphone si disponible.
    async function shareInviteLink() {

        if (!group) return;

        if (!navigator.share) {

            await copyInviteLink();

            return;
        }

        try {

            await navigator.share({
                title:
                    `Rejoindre ${group.name} sur TellMe`,
                text:
                    `Salut, Rejoins mon groupe "${group.name}" sur TellMe.`,
                url:
                group.inviteLink,
            });

        } catch {
            // Annulation du partage : aucune erreur à afficher.
        }
    }

    async function handleDurationChange(
        value: GroupLifetime,
    ) {

        if (!groupId) return;

        setDuration(value);

        setSavingDuration(true);

        setErrorMessage("");

        try {

            await updateGroupLifetime(
                groupId,
                value,
            );

            const refreshed =
                await getGroupDetails(
                    groupId,
                );

            setGroup(refreshed);

            setDuration(
                refreshed.lifetimeMinutes,
            );

        } catch (error) {

            console.error(
                "Lifetime error:",
                error,
            );

            setErrorMessage(
                "Impossible de modifier la durée.",
            );

        } finally {

            setSavingDuration(false);
        }
    }


    // Un membre quitte le groupe.
    async function handleLeaveGroup() {

        if (!groupId) return;

        const confirmed =
            window.confirm(
                "Quitter ce groupe ?",
            );

        if (!confirmed) return;

        try {

            await leaveGroup(groupId);

            navigate(
                "/home",
                {
                    replace: true,
                },
            );

        } catch (error) {

            console.error(
                "Leave group error:",
                error,
            );

            setErrorMessage(
                "Impossible de quitter le groupe.",
            );
        }
    }


    // Le Dominus supprime définitivement le groupe.
    async function handleDeleteGroup() {

        if (!groupId) return;

        const confirmed =
            window.confirm(
                "Supprimer définitivement ce groupe, ses messages et ses médias ?",
            );

        if (!confirmed) return;

        try {

            await deleteGroup(groupId);

            navigate(
                "/home",
                {
                    replace: true,
                },
            );

        } catch (error) {

            console.error(
                "Delete group error:",
                error,
            );

            setErrorMessage(
                "Impossible de supprimer le groupe.",
            );
        }
    }


    if (loading) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100">

                <LoaderCircle
                    size={32}
                    className="animate-spin text-sky-500"
                />

            </main>
        );
    }


    if (!group) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">

                <p className="text-center text-slate-500">
                    Groupe introuvable ou expiré.
                </p>

            </main>
        );
    }


    return (

        <main className="min-h-screen bg-slate-100 dark:bg-slate-800">

            <header className="bg-white sticky top-0 z-30 dark:bg-slate-700 shadow-sm">

                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">

                    <Link
                        to={`/chat/${group.id}`}
                        className="flex h-10 w-10 items-center dark:text-white justify-center rounded-xl transition hover:bg-slate-300"
                    >
                        <ArrowLeft />
                    </Link>

                    <h1 className="text-lg dark:text-white font-bold">
                        Informations
                    </h1>

                    <div className="w-10" />

                </div>

            </header>


            <section className="mx-auto max-w-3xl p-5">

                {/* Identité du groupe */}

                <div className="rounded-3xl bg-white dark:bg-slate-600 p-8 shadow-sm">

                    <div className="flex flex-col items-center text-center">

                        <div
                            className="flex h-28 w-28 items-center justify-center rounded-3xl shadow-sm"
                            style={{
                                backgroundColor:
                                group.color,
                            }}
                        >
                            <img
                                src={icon}
                                alt=""
                                className="h-16 w-16 object-contain"
                                draggable={false}
                            />
                        </div>

                        <h2 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
                            {group.name}
                        </h2>

                        <p className="mt-2 text-slate-500">
                            {group.membersCount}{" "}
                            {group.membersCount > 1
                                ? "membres"
                                : "membre"}
                            {" • "}
                            {group.messageCount}{" "}
                            {group.messageCount > 1
                                ? "messages"
                                : "message"}
                        </p>

                        <p className="mt-1 text-sm text-slate-400 dark:text-white">
                            {group.createdAtLabel}
                        </p>

                    </div>

                </div>

                <div className="mt-6 overflow-hidden rounded-3xl bg-white dark:bg-slate-600 shadow-sm">

                    <Item
                        to={`/members/${group.id}`}
                        icon={
                            <Users size={21} />
                        }
                        title="Membres"
                        subtitle={`${group.membersCount} dans le groupe`}
                    />

                    <Item
                        to={`/media/${group.id}`}
                        icon={
                            <Images size={21} />
                        }
                        title="Médias"
                        subtitle="Photos, vidéos et fichiers"
                    />

                    <Item
                        to={`/custom/${group.id}`}
                        icon={
                            <Palette size={21} />
                        }
                        title="Personnalisation"
                        subtitle="Couleur de tes messages"
                    />

                </div>

                <div className="mt-6 rounded-3xl bg-white dark:bg-slate-600 p-6 shadow-sm">

                    <h3 className="text-lg dark:text-white font-bold">
                        Invite tes ami(e)s
                    </h3>

                    <p className="mt-1 text-sm text-sky-400">
                        Seules les personnes possédant ce lien pourront rejoindre le groupe.
                    </p>

                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">

                        <p className="truncate text-sm text-slate-700">
                            {group.inviteLink}
                        </p>

                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">

                        <button
                            type="button"
                            onClick={() =>
                                void copyInviteLink()
                            }
                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 font-semibold text-white transition hover:bg-sky-600"
                        >
                            <Copy size={18} />

                            {copied
                                ? "Copié !"
                                : "Copier"}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                void shareInviteLink()
                            }
                            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-sky-200 font-semibold text-sky-600 transition hover:bg-sky-50"
                        >
                            <Share2 size={18} />

                            Partager
                        </button>
                    </div>
                </div>

                {/* Durée : uniquement visible par le Dominus */}
                {group.isDominus && (

                    <div className="mt-6 rounded-3xl bg-white dark:bg-slate-600 p-5 shadow-sm sm:p-6">

                        <div className="flex items-start gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">

                                <Clock3 size={21} />

                            </div>

                            <div>

                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    Durée de vie du groupe
                                </h3>

                                <p className="mt-1 text-sm text-red-400 ">
                                    Cette option n’est visible que par le créateur
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-400 dark:text-white">
                                    Apres expiration, le groupe, les messages, les membres, les médias et liens seront supprimés
                                </p>

                            </div>

                        </div>


                        <select
                            value={
                                duration === null
                                    ? "never"
                                    : duration
                            }
                            disabled={savingDuration}
                            onChange={(event) => {

                                const value =
                                    event.target.value;

                                const parsed:
                                    GroupLifetime =
                                    value === "never"
                                        ? null
                                        : Number(
                                            value,
                                        ) as Exclude<
                                            GroupLifetime,
                                            null
                                        >;

                                void handleDurationChange(
                                    parsed,
                                );
                            }}
                            className="mt-5 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-500 disabled:opacity-60"
                        >

                            {durations.map(
                                (item) => (

                                    <option
                                        key={
                                            item.label
                                        }
                                        value={
                                            item.value
                                            ?? "never"
                                        }
                                    >
                                        {
                                            item.label
                                        }
                                    </option>

                                ),
                            )}

                        </select>


                        <div className="mt-4 flex items-center gap-2">

                            {savingDuration && (

                                <LoaderCircle
                                    size={16}
                                    className="animate-spin text-sky-500"
                                />

                            )}

                            <p className="text-sm text-slate-500">

                                {group.expiresAt
                                    ? `Expiration : ${group.expiresLabel}`
                                    : "Ce groupe n’expire pas."}

                            </p>

                        </div>

                    </div>

                )}


                {errorMessage && (

                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">

                        {errorMessage}

                    </div>

                )}


                {/* Dominus supprime ; membre classique quitte */}

                {group.isDominus ? (

                    <button
                        type="button"
                        onClick={() =>
                            void handleDeleteGroup()
                        }
                        className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red-500 font-bold text-white transition hover:bg-red-600"
                    >
                        <Trash2 size={20} />
                        Supprimer le groupe
                    </button>

                ) : (

                    <button
                        type="button"
                        onClick={() =>
                            void handleLeaveGroup()
                        }
                        className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red-500 font-bold text-white transition hover:bg-red-600"
                    >
                        <LogOut size={20} />
                        Quitter le groupe
                    </button>

                )}

            </section>

        </main>
    );
}


type ItemProps = {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    to: string;
};


function Item({
                  icon,
                  title,
                  subtitle,
                  to,
              }: ItemProps) {

    return (

        <Link
            to={to}
            className="flex w-full items-center justify-between border-b px-6 py-5 transition last:border-0"
        >

            <div className="flex min-w-0 items-center gap-4">

                <div className="text-sky-500">
                    {icon}
                </div>

                <div className="min-w-0">

                    <p className="font-medium text-slate-900 dark:text-white">
                        {title}
                    </p>

                    <p className="mt-0.5 truncate text-sm text-slate-400 dark:text-white/70">
                        {subtitle}
                    </p>

                </div>

            </div>

            <ChevronRight
                className="shrink-0 text-slate-400"
                size={20}
            />

        </Link>
    );
}