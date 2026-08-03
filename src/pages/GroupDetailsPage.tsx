import { ArrowLeft, ChevronRight, Users, Images, Palette, Link2, Star, LogOut} from "lucide-react";
import icon from "../assets/icon.png";

export default function GroupDetailsPage() {

    return (

        <main className="min-h-screen bg-slate-100">

            <header className="bg-white shadow-sm">

                <div className="max-w-3xl mx-auto h-16 px-5 flex items-center justify-between">

                    <button>
                        <ArrowLeft />
                    </button>

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

                        <img
                            src={icon}
                            alt=""
                            className="w-28 h-28 rounded-3xl"
                        />

                        <h2 className="mt-5 text-3xl font-bold">
                            Développeurs React
                        </h2>

                        <p className="text-slate-500 mt-2">
                            24 membres
                        </p>

                        <p className="text-sm text-slate-400 mt-1">
                            Créé le 12 août 2026
                        </p>

                    </div>

                </div>

                <div className="mt-6 bg-white rounded-3xl shadow-sm overflow-hidden">

                    <Item icon={<Users size={21}/>} title="Membres"/>
                    <Item icon={<Images size={21}/>} title="Médias"/>
                    <Item icon={<Palette size={21}/>} title="Personnalisation"/>
                    <Item icon={<Link2 size={21}/>} title="Invitation"/>
                    <Item icon={<Star size={21}/>} title="Messages favoris"/>

                </div>

                <button
                    className="mt-8 w-full h-14 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition"
                >

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

function Item({icon,title}:ItemProps){

    return(

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