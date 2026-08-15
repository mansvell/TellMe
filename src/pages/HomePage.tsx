import {
    Search,
    Plus,
    ChevronRight,
    Users,
    X,
    MessageCircle,
} from "lucide-react";

import icon from "../assets/icon.png";
import { useEffect, useMemo, useState } from "react";
import NewGroup from "./NewGroup.tsx";
import BottomNavigation from "../components/BottomNavigation";

import {
    getMyGroups,
    type Group,
} from "../services/group.ts";

import { useNavigate } from "react-router-dom";


export default function HomePage() {

    const [groups, setGroups] = useState<Group[]>([]);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [reloadGroups, setReloadGroups] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();


    // Charge les groupes depuis Supabase.
    useEffect(() => {

        async function fetchGroups() {

            try {

                setLoading(true);

                const data = await getMyGroups();

                setGroups(data);

            } catch (error) {

                console.error(
                    "Erreur chargement groupes :",
                    error,
                );

            } finally {

                setLoading(false);
            }
        }

        void fetchGroups();

    }, [reloadGroups]);


    // Filtre les groupes selon la recherche.
    const filteredGroups = useMemo(() => {

        const value = search.trim().toLowerCase();

        if (!value) {
            return groups;
        }

        return groups.filter((group) =>
            group.name.toLowerCase().includes(value),
        );

    }, [groups, search]);


    // Calcule le nombre total de messages non lus.
    const totalUnread = groups.reduce(
        (total, group) =>
            total + (group.unread_count ?? 0),
        0,
    );


    return (

        <main className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900  duration-500 dark:bg-slate-950 dark:text-white">

            <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 dark:from-sky-950 dark:via-sky-900 dark:to-slate-900" />

            <div className="pointer-events-none absolute inset-x-0 top-[260px] h-[200px] bg-gradient-to-b from-transparent via-slate-50/70 to-slate-50 dark:via-slate-950/70 dark:to-slate-950" />

            <header className="relative z-10 mx-auto max-w-7xl px-5 pt-6">

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                        <div className=" shadow-lg shadow-sky-900/10 backdrop-blur-xl ">
                            <img
                                src={icon}
                                alt="TellMe"
                                className="h-18 w-18 object-contain drop-shadow-md"
                            />
                        </div>

                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white">
                                TellMe
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="mt-7 flex h-15 items-center gap-3 rounded-2xl border border-white/30 bg-white/95 px-4 shadow-xl shadow-sky-900/10 backdrop-blur-xl transition-all duration-300 focus-within:-translate-y-0.5 focus-within:ring-4 focus-within:ring-white/20 dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/20 dark:focus-within:ring-sky-500/10">

                    <Search size={21} className="shrink-0 text-slate-400 dark:text-slate-500"/>

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Rechercher un groupe..."
                        className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    />

                    {/* Efface la recherche */}
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                        >

                            <X size={16} />

                        </button>

                    )}

                </div>

            </header>

            <section className="relative z-10 mx-auto max-w-6xl px-5 pb-32 pt-10">
                <div className="mb-5 flex items-end justify-between">

                    <div>

                        <h2 className="text-2xl font-black tracking-tight text-white dark:text-white">
                            Discussions
                        </h2>

                        <p className="mt-1 text-sm text-white dark:text-slate-400">

                            {search
                                ? `${filteredGroups.length} résultat${
                                    filteredGroups.length !== 1
                                        ? "s"
                                        : ""
                                }`
                                : `${groups.length} groupe${
                                    groups.length !== 1
                                        ? "s"
                                        : ""
                                }`
                            }
                        </p>
                    </div>

                    {/* Messages non lus */}

                    {totalUnread > 0 && (

                        <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl ring-1 ring-white/20">

                            <MessageCircle size={17} />

                            <span>
                                {totalUnread} Messages non lus
                            </span>

                        </div>

                    )}

                </div>

                {loading && (
                    <div className="space-y-3">

                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="h-24 animate-pulse rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            />

                        ))}
                    </div>
                )}

                {!loading && groups.length === 0 && (

                    <div className="mt-8 flex flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white/90 px-8 py-14 text-center shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/20">

                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-100 to-cyan-100 shadow-inner dark:from-sky-950 dark:to-slate-900">

                            <MessageCircle
                                size={34}
                                className="text-sky-500"
                            />

                        </div>

                        <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                            Aucun groupe
                        </h3>

                        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Créez votre premier groupe et commencez à discuter anonymement.
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowNewGroup(true)}
                            className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 font-bold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                        >
                            <Plus size={19} />
                            Créer un groupe

                        </button>
                    </div>

                )}

                {!loading &&
                    groups.length > 0 &&
                    filteredGroups.length === 0 && (

                        <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-12 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">

                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">

                                <Search size={28} className="text-slate-400 dark:text-slate-500" />

                            </div>

                            <h3 className="mt-4 font-bold text-slate-800 dark:text-white">
                                Aucun résultat
                            </h3>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Aucun groupe ne correspond à « {search} ».
                            </p>

                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="mt-5 rounded-xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-400 dark:hover:bg-sky-900"
                            >
                                Effacer la recherche
                            </button>

                        </div>

                    )}

                {!loading && filteredGroups.length > 0 && (

                    <div className="space-y-3">

                        {filteredGroups.map((group) => (

                            <button
                                type="button"
                                key={group.id}
                                onClick={() => navigate(`/chat/${group.id}`)}
                                className="group relative w-full overflow-hidden rounded-3xl border border-white bg-white/95 p-4 text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-xl hover:shadow-slate-200/60 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-700 dark:hover:border-slate-700 dark:hover:shadow-black/20"
                            >

                                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-sky-100 to-cyan-100 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100 dark:from-sky-900/30 dark:to-cyan-900/20" />

                                <div className="relative flex items-center">

                                    <div
                                        className="flex h-17 w-17 shrink-0 items-center justify-center rounded-[1.35rem] shadow-md ring-1 ring-black/5 transition duration-300 group-hover:scale-105 dark:ring-white/10"
                                        style={{
                                            backgroundColor:
                                            group.color,
                                        }}
                                    >

                                        <img
                                            src={icon}
                                            alt=""
                                            className="h-10 w-10 object-contain drop-shadow"
                                        />

                                    </div>

                                    <div className="ml-4 min-w-0 flex-1">

                                        <h3 className="truncate text-lg font-extrabold text-slate-900 transition group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
                                            {group.name}
                                        </h3>

                                        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">

                                            <Users size={15} />

                                            <span>
                                                {group.members_count} membre
                                                {group.members_count !== 1
                                                    ? "s"
                                                    : ""}
                                            </span>

                                        </div>

                                    </div>

                                    {group.unread_count > 0 && (

                                        <div className="mr-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 px-2 shadow-md shadow-sky-500/20">
                                            <span className="text-xs font-black text-white">

                                                {group.unread_count > 99
                                                    ? "99+"
                                                    : group.unread_count}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition duration-300 group-hover:translate-x-1 group-hover:bg-sky-50 group-hover:text-sky-500 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-sky-950 dark:group-hover:text-sky-400">
                                        <ChevronRight size={19} />
                                    </div>

                                </div>
                            </button>
                        ))}
                    </div>
                )}

            </section>

            <button
                type="button"
                onClick={() => setShowNewGroup(true)}
                aria-label="Créer un groupe"
                className="fixed bottom-24 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white shadow-2xl shadow-sky-500/30 transition-all duration-300 hover:-translate-y-1 hover:rotate-6 hover:scale-105 hover:shadow-sky-500/40 active:scale-90 dark:border-slate-950 dark:shadow-sky-900/30"
            >

                <Plus size={30} strokeWidth={2.5} />

            </button>

            <BottomNavigation active="home" />

            <NewGroup
                open={showNewGroup}
                onClose={() => setShowNewGroup(false)}
                onCreated={() =>
                    setReloadGroups(
                        (value) => value + 1,
                    )
                }
            />

        </main>

    );
}