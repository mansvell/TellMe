import {
    Bell,
    ChevronRight,
    FileText,
    Languages,
    LoaderCircle, Mail,
    Moon,
    Shield,
    ShieldCheck,
    UserPen,
    X,
} from "lucide-react";

import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import BottomNavigation from "../components/BottomNavigation.tsx";
import { supabase } from "../lib/supabase";

import {
    getInvitationsEnabled,
    updateInvitationsEnabled,
} from "../services/invitations";

import {
    disablePushNotifications,
    enablePushNotifications,
    getPushStatus,
} from "../services/pushNotifications";

import {
    applyTheme,
    getSavedTheme,
} from "../services/theme";

type ProfileSettings = {
    id: string;
    displayName: string;
    profileColor: string;
    createdAt: string;
    usernameUpdatedAt: string | null;
    notificationsEnabled: boolean;
};


type ProfileDatabaseRow = {
    id: string;
    display_name: string | null;
    default_color: string | null;
    created_at: string;
    username_updated_at: string | null;
    notifications_enabled: boolean | null;
};


type SwitchProps = {
    icon: React.ReactNode;
    title: string;
    description?: string;
    checked: boolean;
    disabled?: boolean;
    loading?: boolean;
    onChange: (value: boolean) => void;
};


type RowProps = {
    icon?: React.ReactNode;
    title: string;
    value?: string;
    description?: string;
    disabled?: boolean;
    onClick?: () => void;
};

// Le pseudo peut être modifié tous les 14 jours.
const USERNAME_CHANGE_DELAY_DAYS = 14;

export default function SettingsPage() {

    const navigate = useNavigate();

    const [darkMode, setDarkMode] =
        useState(
            () => getSavedTheme() === "dark",
        );
    // Active ou désactive le thème sombre global.
    function handleDarkMode(enabled: boolean) {

        setDarkMode(enabled);

        applyTheme(
            enabled
                ? "dark"
                : "light",
        );
    }
    const [profile, setProfile] =
        useState<ProfileSettings | null>(null);

    // Chargement initial.
    const [loading, setLoading] =
        useState(true);

    // Notifications.
    const [
        notificationsEnabled,
        setNotificationsEnabled,
    ] = useState(true);

    // Invitations.
    const [
        invitationsEnabled,
        setInvitationsEnabled,
    ] = useState(true);

    // Sauvegarde des switches.
    const [
        savingNotifications,
        setSavingNotifications,
    ] = useState(false);

    const [
        savingInvitations,
        setSavingInvitations,
    ] = useState(false);

    const [
        showUsernameModal,
        setShowUsernameModal,
    ] = useState(false);

    const [
        newUsername,
        setNewUsername,
    ] = useState("");

    const [
        savingUsername,
        setSavingUsername,
    ] = useState(false);

    // Erreur générale.
    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [clock, setClock] = useState(0);

    useEffect(() => {

        let active = true;

        async function loadSettings() {

            try {

                const {
                    data: { user },
                    error: userError,
                } =
                    await supabase.auth.getUser();


                if (userError) {
                    throw userError;
                }


                if (!user) {

                    navigate(
                        "/welcome",
                        {
                            replace: true,
                        },
                    );

                    return;
                }

                const {
                    data,
                    error,
                } =
                    await supabase
                        .from("profiles")
                        .select(`
                            id,
                            display_name,
                            default_color,
                            created_at,
                            username_updated_at,
                            notifications_enabled
                        `)
                        .eq(
                            "id",
                            user.id,
                        )
                        .single();


                if (error) {
                    throw error;
                }

                const row =
                    data as ProfileDatabaseRow;

                if (!active) return;

                const loadedProfile:
                    ProfileSettings = {

                    id:
                    row.id,

                    displayName:
                        row.display_name ??
                        "Utilisateur",

                    profileColor:
                        row.default_color ??
                        "#0EA5E9",

                    createdAt:
                    row.created_at,

                    usernameUpdatedAt:
                    row.username_updated_at,

                    notificationsEnabled:
                        row.notifications_enabled ??
                        true,
                };


                setProfile(
                    loadedProfile,
                );

                setNewUsername(
                    loadedProfile.displayName,
                );

                const pushStatus =
                    await getPushStatus();

                setNotificationsEnabled(
                    pushStatus === "enabled",
                );

                // Charge l'autorisation d'invitation.
                const allowInvitations =
                    await getInvitationsEnabled();

                if (!active) return;

                setInvitationsEnabled(
                    allowInvitations,
                );

            } catch (error) {

                console.error(
                    "Settings loading error:",
                    error,
                );

                if (!active) return;

                setErrorMessage(
                    "Impossible de charger les paramètres.",
                );

            } finally {
                if (active) {

                    setLoading(false);
                }
            }
        }

        void loadSettings();

        return () => {

            active = false;
        };

    }, [navigate]);

    // COMPTEUR DU PSEUDO
    useEffect(() => {

        const interval = window.setInterval(() => {

            setClock(Date.now());

        }, 60000);

        return () => {

            window.clearInterval(interval);

        };

    }, []);

    // DATE DE CRÉATION
    const memberSince =
        useMemo(() => {

            if (!profile) {
                return "";
            }

            return new Date(
                profile.createdAt,
            ).toLocaleDateString(
                "fr-FR",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                },
            );

        }, [profile, clock]);

                             // PROCHAINE MODIFICATION DU PSEUDO
    const usernameAvailability =
        useMemo(() => {
            if (clock === 0) {
                return {
                    canEdit: false,
                    text: "...( Calcul en cours )..",
                };
            }

            if (!profile?.usernameUpdatedAt) {
                return {
                    canEdit: true,
                    text:
                        "Modifiable maintenant",
                };
            }

            const lastUpdate = new Date( profile.usernameUpdatedAt ).getTime();

            const delay = USERNAME_CHANGE_DELAY_DAYS * 24 * 60 * 60 * 1000;

            const availableAt = lastUpdate + delay;

            const remaining = availableAt - clock;

            if (remaining <= 0) {
                return {
                    canEdit: true,
                    text:
                        "Modifiable maintenant",
                };
            }

            const days =
                Math.floor(
                    remaining /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    ),
                );

            const hours =
                Math.floor(
                    (
                        remaining %
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        )
                    ) /
                    (
                        1000 *
                        60 *
                        60
                    ),
                );

            const minutes =
                Math.floor(
                    (
                        remaining %
                        (
                            1000 *
                            60 *
                            60
                        )
                    ) /
                    (
                        1000 *
                        60
                    ),
                );

            if (days > 0) {
                return {
                    canEdit: false,
                    text:
                        `${days} j ${hours} h`,
                };
            }

            if (hours > 0) {
                return {
                    canEdit: false,
                    text:
                        `${hours} h ${minutes} min`,
                };
            }

            return {
                canEdit: false,
                text:
                    `${minutes} min`,
            };

        }, [
            profile,
            clock,
        ]);

    // MODIFIE LES NOTIFICATIONS
    async function handleNotifications(
        enabled: boolean,
    ) {

        const previousValue =
            notificationsEnabled;


        setSavingNotifications(
            true,
        );

        setErrorMessage("");


        try {

            if (enabled) {

                // Demande la permission système +
                // crée l'abonnement Web Push.
                await enablePushNotifications();

                setNotificationsEnabled(
                    true,
                );

            } else {

                // Supprime l'abonnement de cet appareil.
                await disablePushNotifications();

                setNotificationsEnabled(
                    false,
                );
            }


        } catch (error) {

            console.error(
                "Push notification error:",
                error,
            );


            setNotificationsEnabled(
                previousValue,
            );


            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible de modifier les notifications.",
            );


        } finally {

            setSavingNotifications(
                false,
            );
        }
    }

    // MODIFIE LES AUTORISATIONS D'INVITATION
    async function handleInvitations(
        enabled: boolean,
    ) {

        const previousValue =
            invitationsEnabled;


        setInvitationsEnabled(
            enabled,
        );

        setSavingInvitations(
            true,
        );

        setErrorMessage("");


        try {

            await updateInvitationsEnabled(
                enabled,
            );


        } catch (error) {

            console.error(
                "Invitation settings error:",
                error,
            );


            setInvitationsEnabled(
                previousValue,
            );


            setErrorMessage(
                "Impossible de modifier les invitations.",
            );

        } finally {

            setSavingInvitations(
                false,
            );
        }
    }

    function openUsernameModal() {

        if (
            !profile ||
            !usernameAvailability.canEdit
        ) {
            return;
        }

        setNewUsername(profile.displayName);

        setErrorMessage("");

        setShowUsernameModal(true);
    }

    // ENREGISTRE LE NOUVEAU PSEUDO
    async function handleUsernameSave(
        event:
            React.FormEvent<HTMLFormElement>,
    ) {

        event.preventDefault();


        if (!profile) return;


        const cleanUsername =
            newUsername.trim();


        if (
            cleanUsername.length < 2
        ) {

            setErrorMessage(
                "Le pseudo doit contenir au moins 2 caractères.",
            );

            return;
        }


        if (
            cleanUsername.length > 24
        ) {

            setErrorMessage(
                "Le pseudo ne peut pas dépasser 24 caractères.",
            );

            return;
        }


        if (
            cleanUsername ===
            profile.displayName
        ) {

            setShowUsernameModal(
                false,
            );

            return;
        }


        setSavingUsername(
            true,
        );

        setErrorMessage("");


        try {
            const {
                error,
            } = await supabase.rpc(
                "update_my_username",
                {
                    new_display_name:
                    cleanUsername,
                },
            );

            if (error) {
                throw error;
            }

// Date utilisée immédiatement par l'interface.
// PostgreSQL possède également sa propre date avec now().
            const updatedAt =
                new Date().toISOString();

            setProfile(current => {
                    if (!current) {
                        return current;
                    }
                    return {
                        ...current,

                        displayName:
                        cleanUsername,

                        usernameUpdatedAt:
                        updatedAt,
                    };
                },
            );
            setShowUsernameModal(false);
        } catch (error) {

            console.error(
                "Username update error:",
                error,
            );


            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible de modifier le pseudo.",
            );

        } finally {

            setSavingUsername(
                false,
            );
        }
    }


    // CHARGEMENT
    if (loading) {

        return (

            <main className="flex min-h-screen items-center justify-center bg-slate-100">

                <LoaderCircle
                    size={34}
                    className="animate-spin text-sky-500"
                />

            </main>
        );
    }

    // PROFIL INTROUVABLe
    if (!profile) {

        return (

            <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">

                <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">

                    <Shield
                        size={34}
                        className="mx-auto text-slate-400"
                    />

                    <h1 className="mt-4 text-xl font-bold text-slate-900">
                        Profil indisponible
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Impossible de récupérer tes paramètres.
                    </p>

                </div>

            </main>
        );
    }

    return (

        <main className="min-h-screen bg-slate-100 pb-28 dark:bg-slate-800">

            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-700">

                <div className="mx-auto flex h-16 max-w-4xl items-center justify-center px-5">

                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        Paramètres
                    </h1>

                </div>

            </header>

            <section className="mx-auto max-w-4xl space-y-5 p-4 sm:p-5">

                <div
                    className="relative overflow-hidden rounded-[2rem] p-7 shadow-lg sm:p-9"
                    style={{
                        backgroundColor:
                        profile.profileColor,
                    }}
                >

                    {/* Décoration */}

                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10"/>

                    <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/5"/>


                    <div className="relative">

                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
                            TellMe
                        </p>


                        <h2 className="mt-5 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">
                            {profile.displayName}
                        </h2>


                        <div className="mt-6 inline-flex rounded-full bg-black/10 px-4 py-2 backdrop-blur">

                            <p className="text-xs font-medium text-white/90">
                                Membre depuis le {memberSince}
                            </p>

                        </div>

                    </div>

                </div>

                {/* ERREUR*/}
                {errorMessage && (

                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">

                        <X
                            size={18}
                            className="mt-0.5 shrink-0"
                        />

                        <span>
                            {errorMessage}
                        </span>

                    </div>

                )}

                <SettingsTitle>
                    Compte
                </SettingsTitle>
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-slate-700">

                    <Row
                        icon={<UserPen size={21}/>}
                        title="Pseudo"
                        value={profile.displayName}
                        description={
                            usernameAvailability.canEdit
                                ? "Tu peux modifier ton pseudo une fois tous les 14 jours."
                                : `Prochaine modification dans ${usernameAvailability.text}.`
                        }
                        disabled={
                            !usernameAvailability.canEdit
                        }
                        onClick={
                            openUsernameModal
                        }
                    />

                </div>

                <SettingsTitle>
                    Préférences
                </SettingsTitle>


                <div className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-slate-700">
                    <SwitchRow
                        icon={<Bell size={21}/>}
                        title="Notifications"
                        description="Recevoir les notifications des conversations."
                        checked={notificationsEnabled}
                        loading={savingNotifications}
                        onChange={value =>
                                void handleNotifications(
                                    value,
                                )
                        }
                    />


                    <SwitchRow
                        icon={<Moon size={21}/>}
                        title="Thème sombre"
                        description="Utiliser une apparence sombre dans TellMe."
                        checked={darkMode}
                        onChange={handleDarkMode}
                    />


                    <SwitchRow
                        icon={<ShieldCheck size={21}/>}
                        title="Autoriser les invitations"
                        description="Les membres de tes groupes peuvent t'inviter dans une conversation privée."
                        checked={invitationsEnabled}
                        loading={savingInvitations}
                        onChange={
                            value =>
                                void handleInvitations(
                                    value,
                                )
                        }
                    />
                </div>

                <SettingsTitle>
                    Application
                </SettingsTitle>
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-slate-700">
                    <Row
                        disabled
                         icon={<Languages size={21}/>}
                        title="Langue"
                        value="Bientôt disponible"
                        description="D'autres langues seront disponibles prochainement."
                    />

                </div>


                {/*INFORMATIONS */}
                <SettingsTitle>
                    Informations
                </SettingsTitle>

                <div className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-slate-700">
                    <Row
                        icon={<Shield size={21}/>}
                        title="Politique de confidentialité"
                        description="Découvre comment TellMe protège tes informations."
                        onClick={() => navigate("/privacy")}
                    />

                    <Row icon={<FileText size={21}/>}
                        title="Conditions d'utilisation"
                        description="Règles et conditions d'utilisation de TellMe."
                        onClick={() => navigate("/terms")}
                    />
                    <Row icon={<Mail size={21}/>}
                         title="Aide, Support, Bugs"
                         description="Contactez au mansvellnk@gmail.com"
                    />

                    <Row
                        title="Version"
                        value="1.0.0"
                        disabled
                    />

                </div>

                <p className="pb-3 text-center text-xs leading-5 text-slate-400">
                    TellMe protège ton anonymat dans les conversations.
                </p>

            </section>

            {showUsernameModal && (

                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-5"

                    onClick={() =>
                        !savingUsername &&
                        setShowUsernameModal(
                            false,
                        )
                    }
                >

                    <form
                        onSubmit={
                            event =>
                                void handleUsernameSave(
                                    event,
                                )
                        }

                        onClick={
                            event =>
                                event.stopPropagation()
                        }

                        className="w-full max-w-md rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] dark:bg-slate-900"
                    >

                        <div className="flex items-start justify-between gap-4">

                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Modifier le pseudo
                                </h2>
                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                    Après modification, vous devrez attendre {USERNAME_CHANGE_DELAY_DAYS} jours avant de pouvoir le changer à nouveau.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={savingUsername}
                                onClick={() =>
                                    setShowUsernameModal(
                                        false,
                                    )
                                }
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            >
                                <X size={18}/>
                            </button>
                        </div>

                        <label className="mt-6 block">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Nouveau pseudo
                            </span>

                            <input
                                autoFocus
                                type="text"
                                value={newUsername}
                                maxLength={24}
                                disabled={savingUsername}
                                onChange={
                                    event =>
                                        setNewUsername(
                                            event.target.value,
                                        )
                                }
                                placeholder="Ton pseudo"
                                className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-sky-900/30"
                            />
                        </label>

                        <div className="mt-2 flex justify-between text-xs text-slate-400">
                            <span>
                                2 caractères minimum
                            </span>
                            <span>
                                {newUsername.length}/24
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={
                                savingUsername ||
                                newUsername.trim().length <
                                2
                            }
                            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white transition hover:bg-sky-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >

                            {savingUsername && (
                                <LoaderCircle size={19} className="animate-spin"/>
                            )}
                            Enregistrer
                        </button>
                    </form>
                </div>
            )}



            <BottomNavigation
                active="settings"
            />

        </main>
    );
}


// ============================================================
// TITRE DE SECTION
// ============================================================

function SettingsTitle({
                           children,
                       }: {
    children: React.ReactNode;
}) {

    return (

        <h2 className="px-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            {children}
        </h2>

    );
}


// ============================================================
// ROW
// ============================================================

function Row({
                 icon,
                 title,
                 value,
                 description,
                 disabled = false,
                 onClick,
             }: RowProps) {

    return (

        <button
            type="button"

            disabled={
                disabled
            }

            onClick={
                onClick
            }

            className={`flex w-full items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 text-left transition last:border-0 dark:border-slate-800 ${
                disabled
                    ? "cursor-default"
                    : "hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
        >

            <div className="flex min-w-0 items-center gap-4">

                {icon && (

                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            disabled
                                ? "bg-slate-100 text-slate-300 dark:bg-slate-800"
                                : "bg-sky-50 text-sky-500 dark:bg-sky-950/40"
                        }`}
                    >

                        {icon}

                    </div>

                )}


                <div className="min-w-0">

                    <p
                        className={`font-semibold ${
                            disabled
                                ? "text-slate-400"
                                : "text-slate-800 dark:text-slate-100"
                        }`}
                    >
                        {title}
                    </p>


                    {description && (

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                            {description}
                        </p>

                    )}

                </div>

            </div>


            <div className="flex shrink-0 items-center gap-2">

                {value && (

                    <span
                        className={`max-w-32 truncate text-sm ${
                            disabled
                                ? "text-slate-400"
                                : "text-slate-500 dark:text-slate-300"
                        }`}
                    >
                        {value}
                    </span>

                )}


                {!disabled && (

                    <ChevronRight
                        size={18}
                        className="text-slate-300"
                    />

                )}

            </div>

        </button>

    );
}

function SwitchRow({
                       icon,
                       title,
                       description,
                       checked,
                       disabled = false,
                       loading = false,
                       onChange,
                   }: SwitchProps) {

    return (

        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 last:border-0 dark:border-slate-700">

            <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-950/40">
                    {icon}
                </div>

                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {title}
                    </p>


                    {description && (

                        <p className="mt-1 max-w-lg text-xs leading-5 text-slate-400">
                            {description}
                        </p>

                    )}

                </div>

            </div>


            <button
                type="button"

                role="switch"

                aria-checked={
                    checked
                }

                disabled={
                    disabled ||
                    loading
                }

                onClick={() =>
                    onChange(
                        !checked,
                    )
                }

                className={`relative h-8 w-14 shrink-0 rounded-full transition-all duration-300 ${
                    checked
                        ? "bg-sky-500"
                        : "bg-slate-300 dark:bg-slate-700"
                } ${
                    disabled ||
                    loading
                        ? "cursor-not-allowed opacity-60"
                        : ""
                }`}
            >

                {loading ? (

                    <LoaderCircle
                        size={16}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white"
                    />

                ) : (

                    <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                            checked
                                ? "left-7"
                                : "left-1"
                        }`}
                    />

                )}

            </button>

        </div>

    );
}