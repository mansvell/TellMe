import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Bell, BookOpen, Download, MessageCircle, Shield, Smartphone } from "lucide-react";
import logo from "../assets/icon.png";
import LanguageSelector from "../components/LanguageSelector";
import WelcomePhonePreview from "../components/WelcomePhonePreview";
import { t } from "../i18n/runtime";

const features = [{ label: "Storys", icon: BookOpen }, { label: "Groupes privés", icon: Shield }, { label: "Sondages anonymes", icon: BarChart3 }, { label: "Messages anonymes", icon: MessageCircle }];
const guides = {
    ios: [
        ["Ouvre TellMe dans Safari", "Sur ton iPhone ou ton iPad."],
        ["Appuie sur Partager", "Le carré avec une flèche vers le haut."],
        ["Choisis « Sur l’écran d’accueil »", "Active « Ouvrir comme app » si proposé, puis touche Ajouter."],
        ["Ouvre l’icône TellMe", "Inscris-toi, puis active les notifications dans Paramètres."],
    ],
    android: [
        ["Ouvre TellMe dans Chrome", "Sur ton téléphone ou ta tablette Android."],
        ["Ouvre le menu ⋮", "En haut à droite du navigateur."],
        ["Choisis « Ajouter à l’écran d’accueil »", "Puis Installer l’application et confirme l’installation."],
        ["Ouvre l’icône TellMe", "Inscris-toi, puis active les notifications dans Paramètres."],
    ],
};

export default function WelcomePage() {
    const [platform, setPlatform] = useState<"ios" | "android">(() => /Android/i.test(navigator.userAgent) ? "android" : "ios");
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return <main className="flex min-h-dvh flex-col bg-linear-to-b from-sky-100 via-white to-white text-slate-900 dark:from-sky-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
            <Link to="/welcome" aria-label="TellMe" className="flex items-center gap-2"><img src={logo} alt="" className="h-10 w-10 object-contain" /><span className="text-xl font-bold tracking-tight">TellMe</span></Link>
            <LanguageSelector compact />
        </header>
        <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-5 pb-10 pt-3 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-6">
            <div className="text-center lg:text-left">
                <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t("Tes histoires. Tes proches.")}<br /><span className="text-sky-700 dark:text-sky-300">{t("Tes secrets.")}</span></h1>
                <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600 lg:mx-0 dark:text-slate-300">{t("Partage ce que tu veux, sous pseudo.")}</p>
                <ul className="mx-auto mb-7 mt-5 grid max-w-md grid-cols-2 gap-x-4 gap-y-3 text-left lg:mx-0">{features.map(({ label, icon: Icon }) => <li key={label} className="flex items-center gap-2 text-sm font-medium"><Icon size={18} className="shrink-0 text-sky-700 dark:text-sky-300" />{t(label)}</li>)}</ul>
                <WelcomePhonePreview />
            </div>
            <div className="w-full rounded-3xl bg-white p-5 shadow-[0_8px_40px_-20px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/80 sm:p-7 dark:bg-slate-900 dark:ring-slate-700">
                <div className="flex items-start gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><Smartphone size={23} /></span><div><h2 className="text-xl font-semibold tracking-tight">{t(installed ? "TellMe est à portée de main" : "TellMe, sur ton écran d’accueil")}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(installed ? "Tu peux maintenant créer ton identité et activer tes notifications." : "Un accès direct à tes discussions et les notifications pour ne rien manquer.")}</p></div></div>
                {!installed && <>
                    <div role="group" aria-label={t("Ton appareil")} className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{(["ios", "android"] as const).map(value => <button key={value} type="button" aria-pressed={platform === value} onClick={() => setPlatform(value)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${platform === value ? "bg-white text-sky-800 shadow-sm dark:bg-slate-700 dark:text-sky-200" : "text-slate-600 hover:text-slate-900 dark:text-slate-300"}`}>{value === "ios" ? "iPhone / iPad" : "Android"}</button>)}</div>
                    <ol className="mt-5 space-y-4">{guides[platform].map(([title, text], index) => <li key={title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">{index + 1}</span><div><h3 className="text-sm font-semibold leading-6">{t(title)}</h3><p className="mt-0.5 text-sm leading-5 text-slate-500 dark:text-slate-400">{t(text)}</p></div></li>)}</ol>
                </>}
                <div className="mt-5 flex items-start gap-2 text-sm leading-5 text-slate-500 dark:text-slate-400"><Bell size={16} className="mt-0.5 shrink-0" /><p>{t("Les notifications restent soumises à ton autorisation et aux réglages de ton appareil.")}</p></div>
                <Link to="/register" className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">{t("S'enregistrer")}</Link>
                <Link to="/login" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-200 dark:bg-sky-900 dark:text-sky-100 dark:hover:bg-sky-800">{t("J’ai déjà un compte")}</Link>
                <Link to="/transfer" className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-900 transition-colors hover:bg-green-200 dark:bg-green-900/60 dark:text-green-100 dark:hover:bg-green-900"><Download size={17} />{t("Saisir mon code de transfert")}</Link>
            </div>
        </section>
        <footer className="px-5 py-5 text-xs text-slate-500 dark:text-slate-400"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:justify-between"><span>© {new Date().getFullYear()} TellMe</span><div className="flex flex-wrap justify-center gap-5"><Link to="/privacy" className="hover:underline">{t("Confidentialité")}</Link><Link to="/terms" className="hover:underline">{t("Conditions d'utilisation")}</Link></div></div></footer>
    </main>;
}
