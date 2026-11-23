import { ChevronDown, Languages } from "lucide-react";
import { getLanguage, setLanguage, t, type Language } from "../i18n/runtime";
import { supabase } from "../lib/supabase";

export default function LanguageSelector({ compact = false, onBrand = false }: { compact?: boolean; onBrand?: boolean }) {
    function change(language: Language) {
        setLanguage(language);
        void supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (user) await supabase.from("profiles").update({ language }).eq("id", user.id);
        }).catch(() => {});
    }
    return <label className={compact ? `inline-flex items-center gap-2 text-sm ${onBrand ? "rounded-xl bg-white/15 px-2 text-white" : "text-slate-500 dark:text-slate-400"}` : "flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 last:border-0 dark:border-slate-800"}>
        {compact ? <><Languages size={17}/><span className="sr-only">{t("Langue")}</span></> : <span className="flex min-w-0 items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-950/40"><Languages size={21}/></span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{t("Langue")}</span>
        </span>}
        <span className="relative inline-flex shrink-0 items-center">
            <select aria-label={t("Langue")} value={getLanguage()} onChange={event => change(event.target.value as Language)}
                className={`max-w-36 cursor-pointer appearance-none border-0 bg-transparent py-2 pl-2 pr-6 text-sm outline-none focus-visible:rounded focus-visible:outline-2 focus-visible:outline-sky-500 ${onBrand ? "text-white" : "text-slate-500 dark:text-slate-300"}`}>
                <option value="fr" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Français</option>
                <option value="en" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">English</option>
                <option value="de" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Deutsch</option>
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-0 text-slate-300"/>
        </span>
    </label>;
}
