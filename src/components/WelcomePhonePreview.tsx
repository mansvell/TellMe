import { BarChart3, BookOpen, House, MessageCircle, Plus, Search, Settings, Shield, VenetianMask } from "lucide-react";
import logo from "../assets/icon.png";
import { t } from "../i18n/runtime";

// Illustration de l’interface avec des exemples, sans données de membres.
export default function WelcomePhonePreview() {
    return <figure className="relative mx-auto w-full max-w-[250px] text-left sm:max-w-[260px]">
        <div role="img" aria-label={t("Aperçu de TellMe sur téléphone : Storys et groupes privés.")} className="rounded-[2.5rem] border-[7px] border-slate-900 bg-white p-2 shadow-[0_22px_60px_-24px_rgba(2,132,199,0.5)] dark:border-slate-600">
            <div aria-hidden="true">
                <div className="mx-auto mb-3 h-3 w-20 rounded-full bg-slate-900" />
                <div className="rounded-t-3xl bg-linear-to-b from-sky-100 to-white px-3 pb-3 pt-1 text-slate-900">
                    <div className="flex items-center gap-2"><img src={logo} alt="" className="h-9 w-9 object-contain" /><span className="text-lg font-bold">TellMe</span></div>
                    <div className="mt-3 flex items-center gap-2"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-2 py-2 text-xs text-slate-500"><Search size={12} />{t("Discussions")}</div><span className="rounded-lg bg-sky-700 p-2 text-white"><Plus size={16} /></span></div>
                </div>
                <div className="px-3 text-slate-900">
                    <div className="flex items-center justify-between text-xs font-semibold"><span>{t("Storys")}</span><BookOpen size={14} className="text-sky-600" /></div>
                    <div className="my-3 flex justify-between gap-2">{["bg-green-200", "bg-violet-200", "bg-rose-200", "bg-sky-200"].map((color, index) => <span key={color} className={`flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-sky-300 ring-offset-2 ${color}`}>{index === 0 ? <Plus size={16} /> : <VenetianMask size={17} />}</span>)}</div>
                    <div className="mb-1 mt-4 text-xs font-semibold">{t("Groupes privés")}</div>
                    {[{ name: "Entre amis", icon: MessageCircle, color: "bg-sky-100" }, { name: "La pause", icon: Shield, color: "bg-green-100" }].map(({ name, icon: Icon, color }) => <div key={name} className="flex items-center gap-2 border-b border-slate-100 py-3 last:border-0"><span className={`rounded-xl p-2 ${color}`}><Icon size={18} /></span><div className="min-w-0"><p className="text-xs font-semibold">{t(name)}</p><p className="mt-1 text-[11px] text-slate-500">4 {t("membres")}</p></div></div>)}
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs font-medium text-sky-800"><BarChart3 size={17} />{t("Et toi, tu choisirais quoi ?")}</div>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-b-3xl bg-slate-50 px-4 py-3 text-slate-400"><BookOpen size={17} /><VenetianMask size={17} /><span className="rounded-lg bg-sky-100 p-1.5 text-sky-700"><House size={18} /></span><BarChart3 size={17} /><Settings size={17} /></div>
                <div className="mx-auto mb-1 mt-2 h-1 w-20 rounded-full bg-slate-900" />
            </div>
        </div>
    </figure>;
}
