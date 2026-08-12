import {useNavigate} from "react-router-dom";
import logo from "../assets/icon.png";
import {
    Users,
    Share2,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";

export default function WelcomePage() {
    const navigate = useNavigate();
    return (
        <main className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-white to-white">

            <section className="flex-1 flex items-center justify-center px-6 py-10">

                <div className="max-w-6xl grid lg:grid-cols-2 gap-16 items-center">

                    <div className="flex justify-center">
                        <img src={logo} alt="TellMe" className="w-50 lg:w-80 select-none" draggable={false}/>
                    </div>

                    <div>

                        <h1 className="mt-1 text-5xl text-center font-semibold text-sky-500">
                            TellMe
                        </h1>

                        <p className="mt-5 text-lg text-slate-500 leading-8">
                            Exprime-toi librement.
                            Crée des groupes privés,
                            partage un simple lien
                            et échange avec les personnes qui comptent.
                        </p>

                        <div className="flex pb-5 sm:flex-row gap-4 mt-10">

                            <button onClick={() => navigate('/register')}
                                    className="flex-1 h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 transition text-white font-bold">
                                S'enregistrer
                            </button>

                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <Feature
                                icon={<Users size={24}/>}
                                title="Groupes privés"
                                subtitle="Crée tes espaces de discussion"
                            />

                            <Feature
                                icon={<Share2 size={24}/>}
                                title="Partage ton lien"
                                subtitle="invite tes proches et échange librement"
                            />

                            <Feature
                                icon={<ShieldCheck size={24}/>}
                                title="Confidentialité"
                                subtitle="Simple et sécurisée"
                            />

                            <Feature
                                icon={<ArrowRight size={24}/>}
                                title="Un enregistrement"
                                subtitle="Ensuite plus aucun login"
                            />

                        </div>


                    </div>

                </div>

            </section>

            <footer className="bg-sky-500 text-white py-5 text-center">

                <p className="font-medium">
                    © 2026 Nkwanga Mansvell · TellMe
                </p>

            </footer>

        </main>
    );
}

type FeatureProps = {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
};

function Feature({icon, title, subtitle}: FeatureProps) {
    return (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 hover:shadow-md transition">

            <div className="flex justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    {icon}
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                    {title}
                </h3>
            </div>

            <p className="mt-1 text-sm text-slate-500">
                {subtitle}
            </p>

        </div>
    );
}