import { getLanguage, setLanguage, t, type Language } from "../i18n/runtime";
import { supabase } from "../lib/supabase";

export default function LanguageSelector() {
    function change(language: Language) {
        setLanguage(language);
        // Le changement est immédiat et reste enregistré même sans réseau.
        void supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (user) await supabase.from("profiles").update({ language }).eq("id", user.id);
        }).catch(() => {});
    }
    return <label className="flex items-center justify-between gap-4 px-5 py-4">
        <span className="font-semibold">{t("Langue")}</span>
        <select aria-label={t("Langue")} value={getLanguage()} onChange={event => change(event.target.value as Language)} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-600">
            <option value="fr">Français</option><option value="en">English</option><option value="de">Deutsch</option>
        </select>
    </label>;
}
