import { Bell, Search, Plus, ChevronRight
} from "lucide-react";
import icon from "../assets/icon.png";
import { useEffect, useState } from "react";
import NewGroup from "./NewGroup.tsx";
import BottomNavigation from "../components/BottomNavigation";

import {getMyGroups, type Group,} from "../services/group.ts";


export default function HomePage() {

    const [groups, setGroups] = useState<Group[]>([]);
    //const navigate = useNavigate();
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
                                Mansvell
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

                    {groups.map((g)=>(

                        <button key={g.name}
                            className="w-full bg-white rounded-xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition"
                        >

                            <div className="flex items-center gap-4">

                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                    style={{
                                        backgroundColor: g.color,
                                    }}>

                                    <img
                                        src={icon}
                                        alt=""
                                        className="w-10 h-10  "
                                        draggable={false}
                                    />

                                </div>

                                <div className="text-left">

                                    <h3 className="font-bold text-lg">
                                        {g.name}
                                    </h3>

                                    <p className="text-slate-500">
                                        Groupe privé
                                    </p>

                                </div>

                            </div>

                            <ChevronRight className="text-slate-400"/>

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

