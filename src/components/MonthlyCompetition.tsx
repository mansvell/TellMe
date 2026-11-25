import { useEffect, useState } from "react";
import { Award, Trophy } from "lucide-react";
import { getLocale, t } from "../i18n/runtime";
import { funError, getMonthlyStandings, type MonthlyStandings } from "../services/fun";

const places = [
    { title: "Gold", reward: 30, style: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
    { title: "Silver", reward: 20, style: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100" },
    { title: "Bronze", reward: 15, style: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
];
export function CompetitionRules() {
    return <section className="mt-6 border-t border-sky-200 pt-4 dark:border-sky-900">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100"><Trophy size={18} />{t("Récompenses")}</h2>
        <ul className="mt-3 grid grid-cols-3 gap-2">
            {places.map((place, i) => <li key={place.title} className={`rounded-xl px-2 py-3 text-center ${place.style}`}><Award size={20} className="mx-auto mb-1" /><strong className="block">{i + 1} · {place.title}</strong><span className="text-base font-bold">{place.reward} €</span></li>)}
        </ul>
        <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">{t("Minimum 200 points pour être éligible à un gain.")}</p>
        <p className="mt-2">{t("1 point par Story, commentaire, réponse ou réaction au commentaire d’autrui. Limites par jour UTC : 10 Storys, 20 commentaires/réponses et 10 réactions.")}</p>
        <p className="mt-2">{t("Doublons et réactions à soi-même : 0 point. Supprimer son action retire son point ; l’expiration automatique le conserve.")}</p>
        <p className="mt-2">{t("Les Storytimes doivent respecter le thème de TellMe et les règles de la communauté.")}</p>
        <p className="mt-2">{t("Classement renouvelé chaque mois UTC. Égalités : score atteint en premier. Top 5 anonyme et position personnelle réelle. Versement manuel après clôture.")}</p>
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
            <h3 className="mb-2 font-semibold">{t("Top 5 du mois")}</h3>
            <ol className="space-y-2">
                {Array.from({ length: 5 }, (_, index) => {
                    const row = data.leaders.find(leader => leader.position === index + 1), place = places[index];
                    return <li key={index} className={`flex items-center gap-3 rounded-2xl border p-3.5 ${row?.is_me ? "border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/50" : index === 0 ? "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/15" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50"}`}>
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold ${place?.style ?? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200"}`}>{index + 1}</span>
                        <div className="min-w-0 flex-1"><p className="font-semibold">{place?.title ?? t("Top 5")}{row?.is_me && <span className="ml-2 text-sky-700 dark:text-sky-300">· {t("Toi")}</span>}</p><p className="text-xs text-slate-500 dark:text-slate-400">{place ? `${place.reward} €` : t("Finaliste")}</p></div>
                        <span className="text-right text-base font-bold tabular-nums">{row ? t("{count} points", { count: row.points }) : t("Place libre")}</span>
                    </li>;
                })}
            </ol>
            {!data.mine.position && <p className="mt-3 text-slate-500 dark:text-slate-400">{t("Participe pour entrer dans le classement.")}</p>}
            {!!data.mine.position && data.mine.position > 5 && <div className="mt-4 flex items-center justify-between rounded-xl bg-sky-100 px-4 py-3 text-sky-900 dark:bg-sky-950 dark:text-sky-100"><span>{t("Ta position")} <strong>#{data.mine.position}</strong></span><strong>{t("{count} points", { count: data.mine.points })}</strong></div>}
        </>}
    </div>;
}
