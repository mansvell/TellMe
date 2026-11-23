import { CARD_THEMES, type CardTheme } from "../services/fun";
import { FUN_BACKGROUNDS } from "../services/funCards";
import { t } from "../i18n/runtime";

export default function FunThemePicker({ value, onChange }: { value: CardTheme; onChange: (value: CardTheme) => void }) {
    return (
        <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">{t("Fond de la carte")}</legend>
            <div className="flex flex-wrap gap-3">
                {CARD_THEMES.map(theme => (
                    <button type="button" key={theme} aria-label={t(FUN_BACKGROUNDS[theme].label)} aria-pressed={value === theme}
                        onClick={() => onChange(theme)} style={{ background: FUN_BACKGROUNDS[theme].background }}
                        className={`h-11 w-11 rounded-full border-2 ${value === theme ? "border-sky-600 ring-2 ring-sky-200" : "border-slate-300 dark:border-slate-600"}`} />
                ))}
            </div>
        </fieldset>
    );
}
