import { ChevronRight, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import icon from "../assets/icon.png";
import TellMeHeader from "../components/TellMeHeader";
import { t } from "../i18n/runtime";
import { supabase } from "../lib/supabase";
import { getMyGroups, type Group } from "../services/group";
import NewGroup from "./NewGroup";

export default function HomePage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [reloadGroups, setReloadGroups] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        let hasLoaded = false;
        let request = 0;
        let timer: number | undefined;
        const latestEvents = new Map<string, number>();

        async function loadGroups() {
            const current = ++request;
            try {
                const data = await getMyGroups();
                if (!active || current !== request) return;
                hasLoaded = true;
                setGroups(data.map(group => ({
                    ...group,
                    lastActivityAt: Math.max(group.lastActivityAt, latestEvents.get(group.id) ?? 0),
                })));
                setFailed(false);
            } catch (error) {
                console.error("Erreur chargement groupes :", error);
                if (active && current === request && !hasLoaded) setFailed(true);
            } finally {
                if (active && current === request) setLoading(false);
            }
        }

        function refresh() {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => void loadGroups(), 150);
        }

        const channel = supabase.channel("home-activity")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, ({ new: message }) => {
                if (!active) return;
                const activity = Date.parse(message.created_at);
                if (message.deleted_at || typeof message.group_id !== "string" || !Number.isFinite(activity)) return;
                const groupId = message.group_id;
                if (activity <= (latestEvents.get(groupId) ?? 0)) return;
                latestEvents.set(groupId, activity);
                setGroups(current => current.map(group => group.id === groupId && activity > group.lastActivityAt
                    ? { ...group, lastActivityAt: activity }
                    : group));
                refresh();
            })
            .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });

        const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);
        void loadGroups();
        return () => {
            active = false;
            window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
            void supabase.removeChannel(channel);
        };
    }, [reloadGroups]);

    const query = search.trim().toLowerCase();
    const visibleGroups = groups.filter(group => group.name.toLowerCase().includes(query))
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    function reload() {
        setLoading(true);
        setReloadGroups(value => value + 1);
    }

    return (
        <main className="tellme-tab-surface flex h-full min-h-0 flex-col bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            <TellMeHeader />

            <section aria-labelledby="discussions-title" className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
                <div className="shrink-0 px-4 pt-4 sm:px-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3
                            focus-within:ring-2 focus-within:ring-sky-500 dark:bg-slate-900">
                            <Search size={18} aria-hidden="true" className="shrink-0 text-slate-500 dark:text-slate-400" />
                            <input type="search" aria-label={t("Rechercher un groupe...")} placeholder={t("Rechercher un groupe...")}
                                value={search} onChange={event => setSearch(event.target.value)}
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none" />
                            {search && (
                                <button type="button" aria-label={t("Effacer la recherche")} onClick={() => setSearch("")}
                                    className="rounded p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                                    <X size={17} />
                                </button>
                            )}
                        </div>
                        <button type="button" onClick={() => setShowNewGroup(true)} aria-label={t("Créer un groupe")} title={t("Créer un groupe")}
                            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-sky-700 px-3 font-semibold text-white hover:bg-sky-800">
                            <Plus size={21} aria-hidden="true" />
                            <span className="hidden text-sm sm:inline">{t("Créer un groupe")}</span>
                        </button>
                    </div>

                    <h2 id="discussions-title" className="pb-2 pt-5 text-lg font-bold">{t("Discussions")}</h2>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5" aria-busy={loading}>
                    {loading ? (
                        <p role="status" className="py-7 text-center text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>
                    ) : failed ? (
                        <div role="alert" className="py-7 text-center text-sm text-slate-600 dark:text-slate-300">
                            <p>{t("Impossible de charger les groupes.")}</p>
                            <button type="button" onClick={reload} className="mt-2 font-semibold text-sky-700 dark:text-sky-300">{t("Réessayer")}</button>
                        </div>
                    ) : visibleGroups.length ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                            {visibleGroups.map(group => (
                                <li key={group.id}>
                                    <Link to={`/chat/${group.id}`}
                                        className="flex min-h-[68px] items-center gap-3 px-2 py-2.5 hover:bg-slate-50 focus-visible:outline-2
                                            focus-visible:-outline-offset-2 focus-visible:outline-sky-600 dark:hover:bg-slate-700/60">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: group.color }}>
                                            <img src={icon} alt="" className="h-8 w-8 object-contain" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold">{group.name}</span>
                                            <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                                                {group.members_count} {t(group.members_count === 1 ? "membre" : "membres")}
                                            </span>
                                        </span>
                                        {group.unread_count > 0 && (
                                            <span aria-label={`${group.unread_count} ${t("Messages non lus")}`}
                                                className="rounded-full bg-sky-700 px-2 py-1 text-xs font-semibold text-white">
                                                {group.unread_count > 99 ? "99+" : group.unread_count}
                                            </span>
                                        )}
                                        <ChevronRight size={17} aria-hidden="true" className="shrink-0 text-slate-400" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="py-7 text-center text-sm text-slate-500 dark:text-slate-400">
                            {t(query ? "Aucun résultat" : "Aucun groupe")}
                        </p>
                    )}
                </div>
            </section>

            <NewGroup open={showNewGroup} onClose={() => setShowNewGroup(false)} onCreated={reload} />
        </main>
    );
}
