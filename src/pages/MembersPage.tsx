import {
    ArrowLeft,
    LoaderCircle,
    Search,
} from "lucide-react";

import {
    Link,
    useParams,
} from "react-router-dom";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getGroupMembers,
    type GroupMember,
} from "../services/group";


export default function MembersPage() {

    const { groupId } =
        useParams<{ groupId: string }>();

    const [members, setMembers] =
        useState<GroupMember[]>([]);

    const [search, setSearch] =
        useState("");

    const [loading, setLoading] =
        useState(true);


    // Charge uniquement les membres actifs.
    useEffect(() => {

        if (!groupId) return;

        let active = true;

        getGroupMembers(groupId)
            .then((data) => {

                if (!active) return;

                setMembers(data);
                setLoading(false);
            })
            .catch((error) => {

                console.error(
                    "Members error:",
                    error,
                );

                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };

    }, [groupId]);


    // Recherche locale rapide.
    const filteredMembers =
        useMemo(() => {

            const query =
                search
                    .trim()
                    .toLocaleLowerCase();

            if (!query) {
                return members;
            }

            return members.filter(
                (member) =>
                    member.name
                        .toLocaleLowerCase()
                        .includes(query),
            );

        }, [members, search]);


    return (

        <main className="min-h-screen bg-slate-100">

            <header className="bg-white shadow-sm">

                <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-5">

                    <Link
                        to={`/gdetailp/${groupId}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100"
                    >
                        <ArrowLeft />
                    </Link>

                    <div>

                        <h1 className="text-xl font-bold">
                            Membres
                        </h1>

                        <p className="text-xs text-slate-400">
                            {members.length}{" "}
                            {members.length > 1
                                ? "personnes"
                                : "personne"}
                        </p>

                    </div>

                </div>

            </header>


            <section className="mx-auto max-w-3xl p-5">

                <div className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm">

                    <Search
                        size={20}
                        className="text-slate-400"
                    />

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder="Rechercher un membre..."
                        className="min-w-0 flex-1 outline-none"
                    />

                </div>


                {loading ? (

                    <div className="flex min-h-64 items-center justify-center">

                        <LoaderCircle
                            size={30}
                            className="animate-spin text-sky-500"
                        />

                    </div>

                ) : (

                    <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">

                        {filteredMembers.map(
                            (member) => (

                                <div
                                    key={member.id}
                                    className="flex items-center gap-4 border-b p-5 last:border-0"
                                >

                                    {/* Avatar totalement anonyme :
                                        couleur uniquement */}

                                    <div
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm"
                                        style={{
                                            backgroundColor:
                                            member.color,
                                        }}
                                    >
                                        {member.name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="min-w-0">

                                        <h3 className="truncate font-semibold text-slate-900">
                                            {member.name}
                                        </h3>

                                        <p className="mt-0.5 text-xs text-slate-400">
                                            Membre du groupe
                                        </p>

                                    </div>

                                </div>

                            ),
                        )}


                        {filteredMembers.length === 0 && (

                            <div className="p-10 text-center text-sm text-slate-400">
                                Aucun membre trouvé.
                            </div>

                        )}

                    </div>

                )}

            </section>

        </main>
    );
}