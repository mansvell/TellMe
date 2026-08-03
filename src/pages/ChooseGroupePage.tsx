import { Plus, Link2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ChooseGroupPage() {

    const navigate = useNavigate();

    return (

        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-6">

            <div className="w-full max-w-5xl">

                <div className="text-center">

                    <h1 className="text-5xl font-extrabold text-slate-900">
                        Que souhaites-tu faire ?
                    </h1>

                    <p className="mt-4 text-slate-500 text-lg">
                        Commence une nouvelle conversation ou rejoins un groupe.
                    </p>

                </div>

                <div className="grid md:grid-cols-2 gap-8 mt-14">

                    <button
                        onClick={() => navigate("/create-group")}
                        className="rounded-3xl bg-white border border-slate-200 p-10 shadow-sm hover:shadow-xl transition text-left"
                    >

                        <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">

                            <Plus size={34}/>

                        </div>

                        <h2 className="mt-8 text-3xl font-bold text-slate-900">
                            Créer un groupe
                        </h2>

                        <p className="mt-3 text-slate-500">
                            Crée ton propre espace privé et invite tes proches.
                        </p>

                        <div className="mt-10 flex items-center gap-2 text-sky-600 font-semibold">

                            Commencer

                            <ArrowRight size={18}/>

                        </div>

                    </button>

                    <button
                        onClick={() => navigate("/join")}
                        className="rounded-3xl bg-white border border-slate-200 p-10 shadow-sm hover:shadow-xl transition text-left"
                    >

                        <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">

                            <Link2 size={34}/>

                        </div>

                        <h2 className="mt-8 text-3xl font-bold text-slate-900">
                            Rejoindre un groupe
                        </h2>

                        <p className="mt-3 text-slate-500">
                            Colle un lien ou ouvre une invitation reçue.
                        </p>

                        <div className="mt-10 flex items-center gap-2 text-sky-600 font-semibold">

                            Rejoindre

                            <ArrowRight size={18}/>

                        </div>

                    </button>

                </div>

            </div>

        </main>

    );

}