import {BellRing, Check, LoaderCircle, LockKeyhole, MessageCircle} from "lucide-react";
import { useNavigate } from "react-router-dom";
import icon from "../assets/icon.png";
import { supabase } from "../lib/supabase";
import {useState} from "react";


export default function NotificationPage() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function savePreference(enabled: boolean) {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
            throw new Error("Utilisateur introuvable.");
        }

        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                notifications_enabled: enabled,
            })
            .eq("id", user.id);

        if (updateError) throw updateError;
    }

    async function enableNotifications() {
        setLoading(true);
        setErrorMessage("");

        try {
            if (!("Notification" in window)) {
                throw new Error(
                    "Les notifications ne sont pas prises en charge par ce navigateur.",
                );
            }

            const permission = await Notification.requestPermission();
            const enabled = permission === "granted";

            await savePreference(enabled);

            if (!enabled) {
                setErrorMessage(
                    "L’autorisation n’a pas été accordée. Tu pourras l’activer plus tard.",
                );
                return;
            }

            navigate("/home", { replace: true });
        } catch (error) {
            console.error("Notification error:", error);

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible d’enregistrer ce choix.",
            );
        } finally {
            setLoading(false);
        }
    }

    async function skipNotifications() {
        setLoading(true);
        setErrorMessage("");

        try {
            await savePreference(false);
            navigate("/home", { replace: true });
        } catch (error) {
            console.error("Notification preference error:", error);

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible d’enregistrer ce choix.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4 py-6 sm:px-6">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
                <section className="grid w-full overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_24px_70px_rgba(14,165,233,0.14)] md:grid-cols-2">

                    <div className="flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-100 p-8 sm:p-12">
                        <div className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
                            <div className="absolute h-48 w-48 animate-pulse rounded-full bg-sky-300/40 sm:h-60 sm:w-60" />

                            <div className="relative rounded-[2rem] bg-white p-5 shadow-xl">
                                <img
                                    src={icon}
                                    alt="TellMe"
                                    className="h-24 w-24 object-contain sm:h-32 sm:w-32"
                                    draggable={false}
                                />
                            </div>

                            <div className="absolute right-3 top-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg sm:right-6 sm:top-8">
                                <BellRing size={27} />
                            </div>

                            <div className="absolute bottom-5 left-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-lg sm:bottom-8 sm:left-5">
                                <MessageCircle size={23} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                        <span className="w-fit rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">
                            Dernière étape
                        </span>

                        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                            Reste au courant sans être dérangé
                        </h1>

                        <p className="mt-4 leading-7 text-slate-500">
                            Active les notifications pour recevoir les nouveaux
                            messages et invitations importantes.
                        </p>

                        <div className="mt-7 space-y-4">
                            <Benefit text="Nouveaux messages dans tes groupes" />
                            <Benefit text="Invitations et réponses importantes" />
                            <Benefit text="Contenu masqué sur l’écran verrouillé" />
                        </div>

                        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                            <LockKeyhole
                                size={20}
                                className="mt-0.5 shrink-0 text-sky-600"
                            />

                            <p className="text-sm leading-6 text-slate-500">
                                Tu pourras modifier ce choix à tout moment dans
                                les paramètres.
                            </p>
                        </div>

                        {errorMessage && (
                            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {errorMessage}
                            </div>
                        )}
                        <button disabled={loading}
                            onClick={enableNotifications}
                            className="mt-8 flex h-14 items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <LoaderCircle
                                        size={20}
                                        className="animate-spin"
                                    />
                                    Chargement...
                                </>
                            ) : (
                                <>
                                    <BellRing size={20} />
                                    Autoriser les notifications
                                </>
                            )}
                        </button>

                        <button
                            onClick={skipNotifications}
                            className="mt-3 h-12 rounded-2xl font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                            Pas maintenant
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}

function Benefit({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={16} strokeWidth={3} />
            </div>

            <p className="text-sm font-medium text-slate-700 sm:text-base">
                {text}
            </p>
        </div>
    );
}