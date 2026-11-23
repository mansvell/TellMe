import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { t } from "../i18n/runtime";
import { CARD_THEMES, createStorytime, funError, type CardTheme } from "../services/fun";
import { FUN_BACKGROUNDS } from "../services/funCards";
import { STORY_TOPICS } from "../data/storytimes";
import StorytimeInfo from "../components/StorytimeInfo";
import StorytimePageLayout from "../components/StorytimePageLayout";

export default function CreateStorytimePage() {
    const [text, setText] = useState("");
    const [theme, setTheme] = useState<CardTheme>("blue");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    async function publish(event: React.FormEvent) {
        event.preventDefault();
        if (busy || !text.trim()) return;
        setBusy(true); setError("");
        try { await createStorytime(text, theme); navigate("/fun", { replace: true }); }
        catch (failure) { setError(funError(failure)); setBusy(false); }
    }
    return <StorytimePageLayout title={t("Publier une Storytime")} busy={busy}>
        <form onSubmit={event => void publish(event)}>
            <fieldset disabled={busy}>
                <legend className="mb-4 text-sm font-medium">{t("Couleur de ton histoire")}</legend>
                <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-6">
                    {CARD_THEMES.map(value => <button key={value} type="button" aria-pressed={theme === value}
                        aria-label={`${t(FUN_BACKGROUNDS[value].label)} · ${t(STORY_TOPICS[value].label)}`} onClick={() => setTheme(value)}
                        className="flex flex-col items-center gap-2 text-center text-xs">
                        <span style={{ background: FUN_BACKGROUNDS[value].background, color: FUN_BACKGROUNDS[value].color }}
                            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${theme === value ? "border-sky-600 ring-2 ring-sky-200 ring-offset-2 dark:ring-offset-slate-900" : "border-slate-300 dark:border-slate-600"}`}>
                            {theme === value && <Check size={20} aria-hidden="true" />}
                        </span>
                        {t(STORY_TOPICS[value].label)}
                    </button>)}
                </div>
            </fieldset>
            <label className="mt-7 block text-sm font-medium">{t("Ton histoire")}
                <textarea value={text} onChange={event => setText(event.target.value)} maxLength={2000} rows={9} disabled={busy}
                    className="mt-3 min-h-64 w-full resize-y rounded-xl border border-slate-300 bg-transparent p-4 text-base font-normal leading-7 outline-sky-500 dark:border-slate-700" />
            </label>
            <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{text.length}/2000</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
            <button type="submit" disabled={busy || !text.trim()} className="mt-4 w-full rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? t("Publication...") : t("Publier")}</button>
        </form>
        <div className="mt-9"><StorytimeInfo /></div>
    </StorytimePageLayout>;
}
