import { Link } from "react-router-dom";
import logo from "../assets/icon.png";
import LanguageSelector from "../components/LanguageSelector";
import { t } from "../i18n/runtime";
import { initialPushStatus } from "../services/pushNotifications";

export default function WelcomePage() {
    return (
        <main className="flex min-h-dvh flex-col bg-linear-to-br from-sky-200 via-white to-white text-slate-900
            dark:from-sky-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
            <header className="mx-auto flex w-full max-w-6xl justify-end px-5 py-3">
                <LanguageSelector compact />
            </header>

            <section className="mx-auto grid w-full max-w-5xl flex-1 content-center items-center gap-6 px-6 py-8 md:grid-cols-2 md:gap-12">
                <img src={logo} alt="" draggable={false} className="mx-auto w-36 select-none object-contain sm:w-48 md:w-64 lg:w-72" />

                <div className="mx-auto w-full max-w-sm text-center">
                    <h1 className="text-5xl font-semibold tracking-tight text-sky-700 dark:text-sky-300">TellMe</h1>
                    <p className="mt-3 text-base text-slate-600 dark:text-slate-300">{t("Discute sous pseudo avec tes proches.")}</p>

                    <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <li>{t("Groupes privés")}</li>
                        <li>{t("Liens d’invitation")}</li>
                        <li>{t("Sondages Buzz")}</li>
                        <li>{t("Questions à partager")}</li>
                    </ul>

                    <Link to="/register" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-700 px-5
                        py-2.5 text-sm font-bold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
                        {t("S'enregistrer")}
                    </Link>
                    {initialPushStatus() === "install" && (
                        <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {t("Pour recevoir les notifications, ajoute TellMe à l’écran d’accueil avant de t’inscrire.")}
                        </p>
                    )}
                </div>
            </section>

            <footer className="bg-sky-700 text-sky-50 dark:bg-sky-950">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-3 text-xs sm:justify-between">
                    <span>© {new Date().getFullYear()} TellMe</span>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                        <Link to="/privacy" className="hover:underline">{t("Confidentialité")}</Link>
                        <Link to="/terms" className="hover:underline">{t("Conditions d'utilisation")}</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
