import { ArrowLeft, Users, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import icon from "../assets/icon.png";

export default function JoinPreviewPage() {

    const hasAccount = false; // plus tard Supabase

    return (

        <main className="min-h-screen bg-slate-100 flex items-center justify-center p-5">

            <div className="w-full max-w-lg rounded-3xl bg-white shadow-sm p-8">

                <Link
                    to="/join"
                    className="inline-flex"
                >
                    <ArrowLeft/>
                </Link>

                <div className="relative rounded-[2rem] bg-white p-5 shadow-xl">
                    <img
                        src={icon}
                        alt="TellMe"
                        className="h-24 w-24 object-contain sm:h-32 sm:w-32"
                        draggable={false}
                    />
                    <p> TellMe</p>
                </div>

                <h1 className="text-3xl font-bold text-center mt-6">

                    Développeurs React

                </h1>

                <div className="flex justify-center items-center gap-2 mt-3 text-slate-500">

                    <Users size={18}/>

                    24 membres

                </div>

                <div className="mt-8 rounded-2xl bg-sky-50 border border-sky-100 p-5">

                    <div className="flex gap-3">

                        <Lock
                            className="text-sky-500"
                            size={22}
                        />

                        <div>

                            <p className="font-semibold">

                                Groupe privé

                            </p>

                            <p className="text-sm text-slate-500 mt-1">

                                Tu as été invité à rejoindre ce groupe.

                            </p>

                        </div>

                    </div>

                </div>

                {hasAccount ? (

                    <button
                        className="mt-8 w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 transition text-white font-bold"
                    >

                        Rejoindre le groupe

                    </button>

                ) : (

                    <Link to="/register" className="mt-8 h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 transition text-white font-bold
                        flex items-center justify-center">
                        Créer mon compte
                    </Link>

                )}

            </div>

        </main>

    );

}