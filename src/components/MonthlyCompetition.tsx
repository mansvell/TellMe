import { useEffect, useState } from "react";
import { Award, Trophy } from "lucide-react";
import { getLocale, t } from "../i18n/runtime";
import { funError, getMonthlyStandings, type MonthlyStandings } from "../services/fun";

const places = [
    { title: "Gold", reward: 20, style: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
    { title: "Silver", reward: 15, style: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100" },
    { title: "Bronze", reward: 10, style: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
];
export function CompetitionRules() {
    return <section className="mt-6 border-t border-sky-200 pt-4 dark:border-sky-900">
        <h3 className="flex items-center gap-2 font-semibold"><Trophy size={18} />{t("Le défi du mois")}</h3>
        <p className="mt-2">{t("Chaque action utile vaut 1 point : publier une Story, écrire un commentaire ou une réponse, réagir au commentaire d’une autre personne.")}</p>
        <p className="mt-2">{t("Par jour UTC : jusqu’à 10 publications, 20 commentaires et réponses réunis, et 10 réactions comptabilisés. Une même réaction ne compte qu’une fois, même si tu la modifies.")}</p>
        <p className="mt-2">{t("Un texte identique ne rapporte pas un nouveau point : pour les Storys dans le même mois, et pour les commentaires sous la même Story. Les réactions à tes propres commentaires ne rapportent aucun point.")}</p>
        <p className="mt-2">{t("Supprimer sa Story ou son commentaire, ou retirer sa réaction, retire son point du mois en cours. L’expiration automatique ne retire aucun point. Les résultats des mois clôturés restent fixes.")}</p>
        <ul className="mt-3 grid grid-cols-3 gap-2">
            {places.map((place, i) => <li key={place.title} className={`rounded-xl px-2 py-3 text-center ${place.style}`}><Award size={20} className="mx-auto mb-1" /><strong className="block">{i + 1} · {place.title}</strong><span className="text-base font-bold">{place.reward} €</span></li>)}
        </ul>
        <p className="mt-3">{t("Le classement affiche uniquement les cinq premières positions, sans révéler les pseudos. Ta position réelle et tes points restent visibles, même au-delà du top 5.")}</p>
        <p className="mt-2">{t("Le mois commence le 1er à 00 h UTC et se termine au début du mois suivant. Les points repartent à zéro chaque mois. En cas d’égalité, la personne ayant atteint son score en premier passe devant.")}</p>
        <p className="mt-2">{t("Les trois premiers reçoivent respectivement 20 €, 15 € et 10 €. Le versement est organisé par TellMe après la clôture ; il n’est pas automatique dans l’application.")}</p>
    </section>;
}

export default function MonthlyCompetition() {
    const [data, setData] = useState<MonthlyStandings | null>(null);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true, revision = 0;
        const refresh = () => {
            if (document.hidden) return;
            const current = ++revision;
            void getMonthlyStandings().then(value => { if (active && current === revision) { setData(value); setError(""); } }).catch(failure => { if (active && current === revision) setError(funError(failure)); });
        };
        refresh(); const interval = setInterval(refresh, 20_000);
        window.addEventListener("tellme-activity-changed", refresh); window.addEventListener("focus", refresh);
        return () => { active = false; clearInterval(interval); window.removeEventListener("tellme-activity-changed", refresh); window.removeEventListener("focus", refresh); };
    }, [attempt]);
    return <div className="text-sm">
        {error && <p role="alert" className="mb-4 text-red-600 dark:text-red-300">{error}<button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-2 underline">{t("Réessayer")}</button></p>}
        {!data && !error && <p role="status">{t("Chargement...")}</p>}
        {data && <>
            <p className="mb-3 capitalize text-slate-500 dark:text-slate-400">{new Date(`${data.month}T12:00:00Z`).toLocaleDateString(getLocale(), { month: "long", year: "numeric", timeZone: "UTC" })}</p>
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-sky-100 p-4 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
                <div><p className="font-semibold">{t("Ta position")}</p><p className="mt-1 text-2xl font-bold">{data.mine.position ? `#${data.mine.position}` : "—"}</p></div>
                <div className="text-right"><p className="text-2xl font-bold">{data.mine.points}</p><p>{t("points")}</p></div>
            </div>
            <h3 className="mb-2 font-semibold">{t("Top 5 du mois")}</h3>
            <ol className="divide-y divide-slate-200 dark:divide-slate-700">
                {Array.from({ length: 5 }, (_, index) => {
                    const row = data.leaders.find(leader => leader.position === index + 1), place = places[index];
                    return <li key={index} className="flex items-center gap-3 py-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${place?.style ?? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200"}`}>{index + 1}</span>
                        <div className="min-w-0 flex-1"><p className="font-semibold">{place?.title ?? t("Top 5")}{row?.is_me && <span className="ml-2 text-sky-700 dark:text-sky-300">· {t("Toi")}</span>}</p><p className="text-xs text-slate-500 dark:text-slate-400">{place ? `${place.reward} €` : t("Finaliste")}</p></div>
                        <span className="text-right font-semibold">{row ? t("{count} points", { count: row.points }) : t("Place libre")}</span>
                    </li>;
                })}
            </ol>
            {!data.mine.position && <p className="mt-3 text-slate-500 dark:text-slate-400">{t("Participe pour entrer dans le classement.")}</p>}
            {data.previous_reward && <div className="mt-5 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <p className="font-semibold">{t("Ton dernier résultat")}</p>
                <p className="mt-1">{data.previous_reward.month.slice(0, 7)} · #{data.previous_reward.position} · {t("{count} points", { count: data.previous_reward.points })}</p>
                {data.previous_reward.reward_eur > 0 && <p className="mt-1">{data.previous_reward.reward_eur} € · {t(data.previous_reward.payment_status === "paid" ? "Versé" : "Versement à organiser")}</p>}
            </div>}
        </>}
        <div className="text-slate-500 dark:text-slate-400"><CompetitionRules /></div>
    </div>;
}
