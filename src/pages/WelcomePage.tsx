import { ArrowRight, CheckCheck, LockKeyhole, MessageCircle, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { t } from "../i18n/runtime";
import LanguageSelector from "../components/LanguageSelector";
import logo from "../assets/icon.png";

export default function WelcomePage() {
    const navigate = useNavigate();
    return <main className="flex min-h-dvh flex-col bg-[#fafbfc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
            <Link to="/welcome" aria-label="TellMe" className="flex items-center gap-2.5"><img src={logo} alt="" className="h-10 w-10 object-contain"/><span className="text-xl font-semibold tracking-tight">TellMe<span className="text-sky-600">.</span></span></Link>
            <LanguageSelector compact/>
        </header>
        <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-14 pt-10 sm:px-8 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-20">
            <div className="max-w-xl">
                <p className="mb-5 flex items-center gap-2 text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-sky-500"/>{t("Un espace à toi, une place pour tes proches.")}</p>
                <h1 className="text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[1.12] tracking-[-0.045em]">{t("Parler librement.")}<br/><span className="text-sky-600 dark:text-sky-400">{t("Tout simplement.")}</span></h1>
                <p className="mt-6 max-w-md text-base leading-7 text-slate-500 dark:text-slate-400 sm:text-lg sm:leading-8">{t("Un pseudo, des groupes privés et des conversations qui te ressemblent. Retrouve tes proches, partage un Buzz et laisse la discussion commencer.")}</p>
                <button type="button" onClick={() => navigate("/register")} className="mt-8 inline-flex min-h-12 items-center justify-center gap-5 rounded-lg bg-sky-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">{t("S'enregistrer")}<ArrowRight size={18}/></button>
                <p className="mt-4 text-xs text-slate-400">{t("Aucun e-mail ni mot de passe à renseigner.")}</p>
            </div>
            <div className="mx-auto w-full max-w-[420px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_48px_-30px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950"><Users size={20}/></span><div><p className="text-sm font-semibold">{t("Les proches")}</p><p className="mt-0.5 text-[11px] text-slate-400">{t("Groupe privé")}</p></div><LockKeyhole size={15} className="ml-auto text-slate-400"/></div>
                    <div className="space-y-4 bg-slate-50 px-4 py-7 dark:bg-slate-950/50 sm:px-6">
                        <p className="mb-6 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">{t("Un aperçu de TellMe")}</p>
                        <div className="max-w-[88%] rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800"><p className="mb-1 text-[11px] font-semibold text-violet-500">Alex</p><p className="text-sm leading-6">{t("On se retrouve ce soir ?")}</p><p className="mt-1 text-right text-[10px] text-slate-400">18:42</p></div>
                        <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-sky-100 px-3.5 py-3 text-slate-800 dark:bg-sky-950 dark:text-slate-100"><p className="text-sm leading-6">{t("Oui, à 20 h. Je ramène de quoi grignoter.")}</p><p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">18:43 <CheckCheck size={15} className="text-sky-600"/></p></div>
                        <div className="max-w-[88%] rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800"><p className="mb-1 text-[11px] font-semibold text-emerald-600">Sam</p><p className="text-sm leading-6">{t("Parfait. Et on choisit le film avec un Buzz ?")}</p><p className="mt-1 text-right text-[10px] text-slate-400">18:44</p></div>
                    </div>
                    <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-400 dark:border-slate-800"><MessageCircle size={17}/>{t("À chaque groupe, sa conversation.")}</div>
                </div>
                <p className="mt-4 text-center text-xs text-slate-400">{t("Un lien suffit pour réunir tout le monde.")}</p>
            </div>
        </section>
        <section className="border-y border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 sm:grid-cols-3 sm:gap-10 sm:px-8 sm:py-10">
                <Feature number="01" title={t("Ton pseudo, ton espace.")} description={t("Choisis comment tu apparais et discute à ton rythme.")}/>
                <Feature number="02" title={t("Tes proches, réunis.")} description={t("Crée un groupe et invite les bonnes personnes avec un lien.")}/>
                <Feature number="03" title={t("Une question, un Buzz.")} description={t("Sonde le groupe, lance une idée et fais vivre les échanges.")}/>
            </div>
        </section>
        <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-slate-400 sm:px-8"><p>© {new Date().getFullYear()} TellMe</p><div className="flex gap-5"><Link to="/privacy" className="hover:text-slate-600 dark:hover:text-slate-200">{t("Confidentialité")}</Link><Link to="/terms" className="hover:text-slate-600 dark:hover:text-slate-200">{t("Conditions d'utilisation")}</Link></div></footer>
    </main>;
}

function Feature({ number, title, description }: { number: string; title: string; description: string }) {
    return <div className="flex items-start gap-4"><span className="pt-0.5 text-xs tabular-nums text-sky-600 dark:text-sky-400">{number}</span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p></div></div>;
}
