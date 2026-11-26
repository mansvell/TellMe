import { Trophy } from "lucide-react";
import { t } from "../i18n/runtime";

export default function RewardsPreview() {
    return <div className="mt-7" role="img" aria-label={t("Aperçu des récompenses mensuelles : Gold 30 €, Silver 20 €, Bronze 15 €.")}>
        <div aria-hidden="true" className="flex items-end justify-center gap-3">
            {[{ title: "Silver", position: 2, reward: 20, color: "bg-slate-200 text-slate-800", height: "h-24" }, { title: "Gold", position: 1, reward: 30, color: "bg-amber-200 text-amber-950", height: "h-32" }, { title: "Bronze", position: 3, reward: 15, color: "bg-orange-200 text-orange-950", height: "h-20" }].map(place => <div key={place.title} className="min-w-0 flex-1 text-center"><span className="mb-2 block text-sm font-semibold text-white/90">{place.title}</span><div className={`flex flex-col items-center justify-center gap-1 rounded-t-2xl ${place.height} ${place.color}`}><Trophy size={20} /><span className="text-2xl font-bold">{place.reward} €</span><span className="text-xs font-semibold">{t("Place {number}", { number: place.position })}</span></div></div>)}
        </div>
        <p className="mt-4 text-center text-sm leading-6 text-sky-100">{t("Chaque mois · 500 points minimum pour être éligible")}</p>
    </div>;
}
