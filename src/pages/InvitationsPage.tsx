import { ArrowLeft, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNavigation from "../components/BottomNavigation";


export default function InvitationsPage() {

    const invitations = [
        {
            id: 1,
            sender: "Lucas",
            group: "Projet RAG",
            date: "Aujourd'hui",
            time: "15:24",
        },
        {
            id: 2,
            sender: "Emma",
            group: "Vacances Espagne",
            date: "Hier",
            time: "20:42",
        },
    ];

    return (

        <main className="min-h-screen bg-slate-100">

            {/* Header */}

            <header className="bg-white shadow-sm">

                <div className="max-w-4xl mx-auto h-16 flex items-center gap-4 px-5">

                    <Link to="/home">

                        <ArrowLeft/>

                    </Link>

                    <h1 className="text-xl font-bold">
                        Invitations
                    </h1>

                </div>

            </header>

            <section className="max-w-4xl mx-auto p-5">

                {invitations.length === 0 ? (

                    <div className="h-[70vh] flex flex-col items-center justify-center text-center">

                        <h2 className="text-2xl font-bold">
                            Aucune invitation
                        </h2>

                        <p className="mt-3 text-slate-500">
                            Les invitations que tu recevras
                            apparaîtront ici.
                        </p>

                    </div>

                ) : (

                    <div className="space-y-5">

                        {invitations.map((invite)=>(

                            <div
                                key={invite.id}
                                className="bg-white rounded-3xl shadow-sm p-6"
                            >

                                <div className="flex justify-between">

                                    <div>

                                        <h3 className="text-xl font-bold">

                                            {invite.group}

                                        </h3>

                                        <p className="text-slate-500 mt-1">

                                            Invité par <span className="font-semibold">{invite.sender}</span>

                                        </p>

                                    </div>

                                    <div className="text-right text-sm text-slate-400">

                                        <p>{invite.date}</p>

                                        <p>{invite.time}</p>

                                    </div>

                                </div>

                                <div className="flex gap-3 mt-6">

                                    <button
                                        className="flex-1 h-12 rounded-2xl bg-red-100 text-red-600 font-semibold flex items-center justify-center gap-2"
                                    >

                                        <X size={18}/>

                                        Refuser

                                    </button>

                                    <button
                                        className="flex-1 h-12 rounded-2xl bg-sky-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-sky-600"
                                    >

                                        <Check size={18}/>

                                        Accepter

                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>
                )}
            </section>

            <BottomNavigation active="invitations"/>
        </main>

    );

}