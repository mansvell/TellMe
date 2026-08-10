import {
    ArrowLeft,
    LoaderCircle,
    Lock,
    Users,
} from "lucide-react";

import {
    Link,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    useEffect,
    useState,
} from "react";

import icon from "../assets/icon.png";

import { supabase } from "../lib/supabase";

import {
    getGroupPreviewByInviteCode,
    joinGroupByInviteCode,
    type GroupInvitePreview,
} from "../services/group";


export default function JoinPreviewPage() {

    const {
        inviteCode: routeInviteCode,
    } = useParams<{
        inviteCode: string;
    }>();

    const location =
        useLocation();

    const navigate =
        useNavigate();

    // Supporte aussi l'ancien parcours /join/preview?token=...
    const queryInviteCode =
        new URLSearchParams(
            location.search,
        ).get("token");

    const inviteCode =
        routeInviteCode
        ?? queryInviteCode
        ?? "";

    const [group, setGroup] =
        useState<GroupInvitePreview | null>(
            null,
        );

    const [loading, setLoading] =
        useState(true);

    const [joining, setJoining] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");


    // Charge uniquement les informations publiques du groupe.
    const invalidInvite = !inviteCode;

    useEffect(() => {

        if (invalidInvite) return;

        let active = true;

        getGroupPreviewByInviteCode(inviteCode)
            .then((data) => {

                if (!active) return;

                setGroup(data);
                setLoading(false);

            })
            .catch((error) => {

                console.error(error);

                if (!active) return;

                setErrorMessage("Ce lien est invalide ou a expiré.");
                setLoading(false);

            });

        return () => {
            active = false;
        };

    }, [inviteCode, invalidInvite]);


    // Rejoint le groupe ou demande d'abord l'inscription.
    async function joinGroup() {

        if (!inviteCode) return;

        setJoining(true);
        setErrorMessage("");

        try {

            const {
                data: { user },
            } =
                await supabase.auth.getUser();

            if (!user) {

                navigate(
                    "/register",
                    {
                        state: {
                            inviteToken:
                            inviteCode,
                        },
                    },
                );

                return;
            }

            const groupId =
                await joinGroupByInviteCode(
                    inviteCode,
                );

            navigate(
                `/chat/${groupId}`,
                {
                    replace: true,
                },
            );

        } catch (error) {

            console.error(
                "Join group error:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible de rejoindre le groupe.",
            );

        } finally {

            setJoining(false);
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

    if (invalidInvite) {

        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-100">
                <p className="text-slate-500">
                    Lien d’invitation invalide.
                </p>
            </main>
        );

    }
    return (

        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">

            <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-sm sm:p-8">

                <Link
                    to="/join"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100"
                >
                    <ArrowLeft />
                </Link>


                {group ? (

                    <>
                        <div className="mt-4 flex justify-center">

                            <div
                                className="flex h-28 w-28 items-center justify-center rounded-3xl"
                                style={{
                                    backgroundColor:
                                    group.color,
                                }}
                            >
                                <img
                                    src={icon}
                                    alt=""
                                    className="h-16 w-16"
                                />
                            </div>

                        </div>


                        <h1 className="mt-6 text-center text-3xl font-bold text-slate-900">
                            {group.name}
                        </h1>


                        <div className="mt-3 flex items-center justify-center gap-2 text-slate-500">

                            <Users size={18} />

                            {group.membersCount}{" "}
                            {group.membersCount > 1
                                ? "membres"
                                : "membre"}

                        </div>


                        <div className="mt-8 flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-5">

                            <Lock
                                size={22}
                                className="shrink-0 text-sky-500"
                            />

                            <div>

                                <p className="font-semibold">
                                    Groupe privé
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Tu as reçu un lien pour rejoindre cette discussion TellMe.
                                </p>

                            </div>

                        </div>


                        <button
                            type="button"
                            disabled={joining}
                            onClick={() =>
                                void joinGroup()
                            }
                            className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white transition hover:bg-sky-600 disabled:bg-slate-300"
                        >

                            {joining && (
                                <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                />
                            )}

                            Rejoindre le groupe

                        </button>

                    </>

                ) : (

                    <div className="py-16 text-center">

                        <p className="font-semibold text-red-500">
                            {errorMessage}
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                            Le groupe a peut-être expiré ou été supprimé.
                        </p>

                    </div>

                )}


                {group && errorMessage && (

                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        {errorMessage}
                    </div>

                )}

            </div>

        </main>
    );
}