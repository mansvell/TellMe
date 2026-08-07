import {ArrowLeft, ChevronRight, Users, Images, Palette, LogOut, Clock3} from "lucide-react";
import icon from "../assets/icon.png";
import {Link} from "react-router-dom";
import {useState} from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {getGroupDetails, type GroupDetails} from "../services/group";

const durations = [
    "5 minutes",
    "30 minutes",
    "1 heure",
    "24 heures",
    "3 jours",
    "Jamais"
];

export default function GroupDetailsPage() {

    const { groupId } = useParams();
    const [group, setGroup] = useState<GroupDetails | null>(null);
    console.log("groupId :", groupId);
    const [isDominus, setIsDominus] = useState(false);
    const [duration, setDuration] = useState("");

    // AJOUT
    useEffect(() => {

        async function loadGroup() {

            if (!groupId) return;

            const data = await getGroupDetails(groupId);
            console.log("Group Details :", data);

            setGroup(data);

            setDuration(data.duration);

            setIsDominus(data.isDominus);

        }

        void loadGroup();

    }, [groupId]);
    return (

        <main className="min-h-screen bg-slate-100">

            <header className="bg-white shadow-sm">

                <div className="max-w-3xl mx-auto h-16 px-5 flex items-center justify-between">

                    <Link to="/home">
                        <ArrowLeft />
                    </Link>

                    <h1 className="font-bold text-lg">
                        Informations
                    </h1>

                    <div className="w-6"/>

                </div>

            </header>

            <section className="max-w-3xl mx-auto p-5">

                {/* Card */}

                <div className="bg-white rounded-3xl shadow-sm p-8">

                    <div className="flex flex-col items-center">

                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl"
                            style={{
                                backgroundColor: group?.color,
                            }}>
                            <img src={icon} alt="" className="h-16 w-16"/>
                        </div>

                        <h2 className="mt-5 text-3xl font-bold">
                            {group?.name}
                        </h2>

                        <p className="text-slate-500 mt-2">
                            {group?.membersCount} membres
                        </p>

                        <p className="text-sm text-slate-400 mt-1">
                            Créé le {group?.createdAt}
                        </p>

                    </div>

                </div>

                <div className="mt-6 bg-white rounded-3xl shadow-sm overflow-hidden">

                    <Item icon={<Users size={21}/>} title="Membres"/>
                    <Item icon={<Images size={21}/>} title="Médias"/>
                    <Item icon={<Palette size={21}/>} title="Personnalisation"/>

                </div>
                <div className="mt-6 bg-white rounded-3xl shadow-sm p-6">

                    <h3 className="font-bold text-lg">
                        Invite tes ami(e)s à la discussion
                    </h3>

                    <div className="mt-5 h-14 rounded-2xl bg-slate-100 flex items-center justify-between px-4 gap-4">

                        <p className="truncate text-slate-700">
                            {group?.inviteLink}
                        </p>

                        <button
                            className="h-9 px-4 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition"
                        >
                            Copier
                        </button>

                    </div>

                </div>
                {isDominus && (
                    <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                                <Clock3 size={21} />
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900">
                                    Durée de vie du groupe
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Visible uniquement par le Dominus-Createur du groupe
                                </p>
                                <p className="text-sm text-gray-400">(une fois le temps ecoulé le groupe sera supprimé
                                    automatiquement et les liens deviendront obselètes)</p>

                            </div>
                        </div>

                        <select
                            value={duration}
                            onChange={(event) =>
                                setDuration(event.target.value)
                            }
                            className="mt-5 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-500"
                        >
                            {durations.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>

                        <p className="mt-3 text-sm text-slate-500">
                            Durée actuelle : {duration}
                        </p>
                    </div>
                )}

                <button
                    className="mt-8 w-full h-14 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition">
                    <div className="flex items-center justify-center gap-3">
                        <LogOut size={20}/>
                        Quitter le groupe
                    </div>
                </button>

            </section>

        </main>

    );

}

type ItemProps = {
    icon: React.ReactNode;
    title: string;
};

function Item({icon, title}: ItemProps) {

    return (

        <button
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition border-b last:border-0"
        >

            <div className="flex items-center gap-4">

                <div className="text-sky-500">

                    {icon}

                </div>

                <span className="font-medium">
                    {title}
                </span>

            </div>

            <ChevronRight
                className="text-slate-400"
                size={20}
            />

        </button>

    )

}