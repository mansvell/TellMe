import { Bell, Search, Plus, ChevronRight
} from "lucide-react";
import icon from "../assets/icon.png";
import { useEffect, useState } from "react";
import NewGroup from "./NewGroup.tsx";
import BottomNavigation from "../components/BottomNavigation";

import {getMyGroups, type Group,} from "../services/group.ts";
import {useNavigate} from "react-router-dom";



export default function HomePage() {

    const [groups, setGroups] = useState<Group[]>([]);
    const navigate = useNavigate();
    const [showNewGroup, setShowNewGroup] = useState(false);

    const [reloadGroups, setReloadGroups] = useState(0);

// Charge les groupes depuis Supabase.
    useEffect(() => {

        async function fetchGroups() {

            try {

                const data = await getMyGroups();

                setGroups(data);

            } catch (error) {

                console.error(error);

            }

        }

        void fetchGroups();

    }, [reloadGroups]);


    return (

        <main className="min-h-screen bg-slate-50 flex flex-col">


            <header className="bg-white px-5 pt-5 pb-4 shadow-sm">

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                        <img
                            src={icon}
                            alt=""
                            className="w-15 h-12 rounded-2xl"
                        />

                        <div>

                            <p className="text-slate-500 text-sm">
                                TellMe
                            </p>

                            <h1 className="font-bold text-2xl">
                                UserName
                            </h1>

                        </div>

                    </div>

                    <button className="relative w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center">

                        <Bell size={22} className="text-sky-600"/>

                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"/>

                    </button>
                </div>


                <div className="mt-5 h-14 rounded-2xl bg-slate-100 flex items-center px-4 gap-3">

                    <Search className="text-slate-400"/>
                    <input placeholder="Rechercher..." className="bg-transparent outline-none flex-1"/>

                </div>

            </header>


            <section className="flex-1 px-1 pt-6 pb-28">

                <h2 className="font-bold text-2xl">
                    Groupes
                </h2>

                <div className="mt-1">

                    {groups.map((group) => (

                        <button onClick={() => navigate(`/chat/${group.id}`)}
                            key={group.id}
                            className="mb-3 w-full rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
                        >

                            <div className="flex items-center">

                                {/* Icône du groupe */}
                                <div
                                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                                    style={{
                                        backgroundColor: group.color,
                                    }}
                                >
                                    <img
                                        src={icon}
                                        alt=""
                                        className="h-9 w-9 object-contain"
                                    />
                                </div>

                                {/* Nom + membres */}
                                <div className="ml-4 min-w-0 flex-1 text-left">

                                    <h3 className="truncate text-lg font-bold text-slate-800">
                                        {group.name}
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {group.members_count} membres
                                    </p>

                                </div>

                                {/* Badge messages non lus */}
                                <div className="mr-4">

                                    {group.unread_count > 0 && (

                                        <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-sky-500 px-2">

                        <span className="text-xs font-bold text-white">
                            {group.unread_count}
                        </span>

                                        </div>

                                    )}

                                </div>

                                {/* Flèche */}
                                <ChevronRight
                                    className="text-slate-400"
                                    size={22}
                                />

                            </div>

                        </button>

                    ))}

                </div>

            </section>

            <button onClick={() => setShowNewGroup(true)} className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-sky-500 text-white shadow-2xl flex
                items-center justify-center active:scale-95 transition">
                <Plus size={30}/>
            </button>



            <BottomNavigation active="home"/>

            <NewGroup
                open={showNewGroup}
                onClose={() => setShowNewGroup(false)}
                onCreated={() => setReloadGroups((value) => value + 1)}
            />
        </main>

    );

}

