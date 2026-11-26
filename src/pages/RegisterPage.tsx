import RewardsPreview from "../components/RewardsPreview";
import { t } from "../i18n/runtime";
import { getLanguage, setLanguage as saveLanguage } from "../i18n/runtime";
import { useState } from "react";
import {Check, Download, Globe2, LoaderCircle, UserRound} from "lucide-react";
import {useLocation, useNavigate} from "react-router-dom";
import icon from "../assets/icon.png";
import { supabase } from "../lib/supabase";

const colors = [
    "#0EA5E9",
    "#22C55E",
    "#8B5CF6",
    "#F97316",
    "#EC4899",
    "#64748B",
    "#EF4444",
    "#EAB308",
    "#B45309"
];

type RegisterLocationState = {
    inviteToken?: string;
};

export default function RegisterPage() {
    const navigate = useNavigate();

    const [pseudo, setPseudo] = useState("");
    const [language, setLanguage] = useState(getLanguage());
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [accepted, setAccepted] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const location = useLocation();

    const { inviteToken } =
    (location.state as RegisterLocationState | null) ?? {};

    const cleanPseudo = pseudo.trim();
    const canContinue =
        cleanPseudo.length >= 3 &&
        cleanPseudo.length <= 24 &&
        accepted &&
        !loading;

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!canContinue) return;

        setLoading(true);
        setErrorMessage("");

        //pseudo unique et la constrainte citext dans supab
        const { data: existingUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("display_name", cleanPseudo)
            .maybeSingle();

        if (existingUser) {

            setErrorMessage(
                t("Ce pseudo est déjà utilisé.")
            );

            setLoading(false);

            return;

        }
        try {
            /*
             * Évite de créer un deuxième utilisateur si une session
             * anonyme existe déjà dans le navigateur.
             */
            const {
                data: { session: existingSession },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            let user = existingSession?.user ?? null;

            if (!user) {
                const {
                    data,
                    error: authError,
                } = await supabase.auth.signInAnonymously();

                if (authError) {
                    throw authError;
                }

                user = data.user;
            }

            if (!user) {
                throw new Error(
                    t("Supabase n’a pas retourné d’utilisateur."),
                );
            }

            const { error: profileError } = await supabase
                .from("profiles")
                .upsert(
                    {
                        id: user.id,
                        display_name: cleanPseudo,
                        default_color: selectedColor,
                        language,
                        receive_invitations: true,
                        terms_accepted_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "id",
                    },
                );

            if (profileError) {
                throw profileError;
            }

            /*
             * Le token sera traité plus tard lorsque nous connecterons
             * les invitations. Pour l'instant, on conserve le parcours.
             */
            saveLanguage(language);
            if (inviteToken) {
                navigate(`/join/preview?token=${inviteToken}`, {
                    replace: true,
                });
                return;
            }

            navigate("/notif", { replace: true });
        } catch (error) {
            console.error("Registration error:", error);

            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "23505"
            ) {
                setErrorMessage(t("Ce pseudo est déjà utilisé."));
            } else if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage(t("Impossible de créer ton identité."));
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
                <section className="grid w-full overflow-hidden rounded-[2rem] border border-sky-100 bg-white dark:bg-slate-700 lg:grid-cols-[0.9fr_1.1fr]">

                    <div className="hidden min-h-[650px] flex-col justify-between bg-gradient-to-br from-sky-500 to-blue-600 p-10 text-white lg:flex">
                        <img
                            src={icon}
                            alt="TellMe"
                            className="h-20 w-20 rounded-3xl object-contain shadow-lg"
                            draggable={false}
                        />

                        <div>
                            <h2 className="max-w-md text-3xl font-semibold leading-tight">
                                 {t("Participez au challenge des Storys pour remporter des récompenses.")} </h2>

                            <RewardsPreview />
                        </div>

                        <div className="flex items-center gap-3 text-sm text-sky-100">
                             {t("Sentez vous libre")} </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
                        <div className="flex items-center justify-center gap-4 lg:hidden">
                            <img
                                src={icon}
                                alt="TellMe"
                                className="h-18 w-18 rounded-2xl object-contain"
                                draggable={false}
                            />

                            <p className="text-2xl font-semibold text-sky-600">
                                TellMe
                            </p>
                        </div>

                        <div className="mt-7 lg:mt-0">
                            <label htmlFor="pseudo" className="block text-sm font-semibold leading-6 text-red-600 dark:text-red-300">
                                {t("Choisissez un nom au hasard pour garder l'anonymat !!")}
                            </label>
                            <div
                                className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-sky-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                                <UserRound
                                    size={20}
                                    className="shrink-0 text-slate-400"
                                />

                                <input
                                    id="pseudo"
                                    value={pseudo}
                                    onChange={(event) =>
                                        setPseudo(event.target.value)
                                    }
                                    maxLength={24}
                                    placeholder={t("pseudo")}
                                    className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                                />

                                <span className="text-xs text-slate-400">
                                    {pseudo.length}/24
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <p className="text-sm font-bold dark:text-white text-slate-700">
                                 {t("Choisis une Couleur :")} </p>

                            <div className="mt-3 flex flex-wrap gap-3">
                                {colors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() =>
                                            setSelectedColor(color)
                                        }
                                        className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow-md transition hover:scale-110 active:scale-95"
                                        style={{backgroundColor: color}}
                                        aria-label={`Choisir la couleur ${color}`}
                                    >
                                        {selectedColor === color && (
                                            <Check
                                                size={19}
                                                className="text-white"
                                                strokeWidth={3}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                            <label
                                htmlFor="language"
                                className="text-sm dark:text-white font-bold text-slate-700"
                            >
                                 {t("Langue :")} </label>

                            <div
                                className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
                                <Globe2
                                    size={20}
                                    className="text-slate-400"
                                />

                                <select
                                    id="language"
                                    value={language}
                                    onChange={(event) =>
                                        setLanguage(event.target.value as "fr" | "en" | "de")
                                    }
                                    className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none"
                                >
                                    <option value="fr">Français</option>
                                    <option value="de">Deutsch</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>

                        <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl bg-sky-50 p-4">
                            <input
                                type="checkbox"
                                checked={accepted}
                                onChange={(event) =>
                                    setAccepted(event.target.checked)
                                }
                                className="mt-1 h-5 w-5 accent-sky-500"
                            />

                            <p className="text-sm leading-6 text-slate-600">  {t("J’accepte les")} <span className="text-blue-500" onClick={() => navigate("/terms")}>  {t("conditions d’utilisation")}</span>  {t("et la")} <span className="text-blue-500" onClick={() => navigate("/privacy")}>  {t("politique de confidentialité")}</span>.
                            </p>
                        </label>

                        {errorMessage && (
                            <div role="alert"
                                className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                            >
                                {errorMessage}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={!canContinue}
                            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                            {loading ? (
                                <>
                                    <LoaderCircle
                                        size={20}
                                        className="animate-spin"
                                    />
                                     {t("Création...")} </>
                            ) : (
                                <>
                                     {t("Créer mon identité")}
                                </>
                            )}
                        </button>
                        <button type="button" onClick={() => navigate(inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : "/login")} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-200 dark:bg-sky-900 dark:text-sky-100">{t("J’ai déjà un compte")}</button>
                        <button type="button" onClick={() => navigate(inviteToken ? `/transfer?invite=${encodeURIComponent(inviteToken)}` : "/transfer")} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-900 hover:bg-green-200 dark:bg-green-900/60 dark:text-green-100"><Download size={17} />{t("Saisir mon code de transfert")}</button>
                    </form>
                </section>
            </div>
        </main>
    );
}