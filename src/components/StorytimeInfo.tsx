import { Info } from "lucide-react";
import { t } from "../i18n/runtime";
import { CARD_THEMES } from "../services/fun";
import { FUN_BACKGROUNDS } from "../services/funCards";
import { STORY_TOPICS } from "../data/storytimes";

export default function StorytimeInfo() {
    return <div className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        <h2 className="flex items-center gap-2 font-semibold"><Info size={17} />{t("À propos des Storytimes")}</h2>
        <p className="mt-2">{t("Les Storytimes sont anonymes et visibles par tous les utilisateurs de TellMe. Elles disparaissent du fil après 24 heures.")}</p>
        <p className="mt-2">{t("Tu peux avoir 5 Storytimes actives et en publier 10 par jour. Une histoire peut contenir jusqu’à 2 000 caractères.")}</p>
        <p className="mt-2">{t("Chaque histoire passe à la suivante après 5 secondes. Maintiens le texte appuyé ou utilise Pause pour prendre le temps de lire.")}</p>
        <h3 className="mt-4 font-medium">{t("Une couleur, un thème")}</h3>
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {CARD_THEMES.map(theme => <li key={theme} className="flex items-center gap-2">
                <span aria-hidden="true" style={{ background: FUN_BACKGROUNDS[theme].background }} className="h-5 w-5 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" />
                <span>{t(FUN_BACKGROUNDS[theme].label)} · {t(STORY_TOPICS[theme].label)}</span>
            </li>)}
        </ul>
        <p className="mt-3">{t("Le contour coloré indique une histoire non lue. Un contour gris indique une histoire déjà consultée.")}</p>
    </div>;
}
