import { ArrowLeft, Search, Shield, Circle } from "lucide-react";

export default function MembersPage() {

    const members = [
        {name:"Lucas",online:true,admin:true},
        {name:"Emma",online:false},
        {name:"David",online:true},
        {name:"Noah",online:false},
        {name:"Sarah",online:true},
        {name:"Tom",online:true},
    ];

    return (

        <main className="min-h-screen bg-slate-100">

            <header className="bg-white shadow-sm">

                <div className="max-w-3xl mx-auto h-16 flex items-center gap-4 px-5">

                    <ArrowLeft className="cursor-pointer"/>

                    <h1 className="font-bold text-xl">
                        Membres
                    </h1>

                </div>

            </header>

            <section className="max-w-3xl mx-auto p-5">

                <div className="bg-white rounded-2xl h-14 flex items-center px-4 gap-3">

                    <Search size={20} className="text-slate-400"/>

                    <input
                        placeholder="Rechercher un membre..."
                        className="flex-1 outline-none"
                    />

                </div>

                <div className="mt-5 bg-white rounded-3xl overflow-hidden shadow-sm">

                    {members.map((m,index)=>(

                        <div
                            key={index}
                            className="flex items-center justify-between p-5 border-b last:border-0"
                        >

                            <div className="flex items-center gap-4">

                                <div className="w-12 h-12 rounded-full bg-sky-500"/>

                                <div>

                                    <div className="flex items-center gap-2">

                                        <h3 className="font-semibold">

                                            {m.name}

                                        </h3>

                                        {m.admin && (

                                            <Shield
                                                size={15}
                                                className="text-sky-500"
                                            />

                                        )}

                                    </div>

                                    <p className="text-sm text-slate-500">

                                        {m.online ? "En ligne" : "Hors ligne"}

                                    </p>

                                </div>

                            </div>

                            <Circle
                                size={12}
                                fill={m.online ? "#22c55e" : "#cbd5e1"}
                                className={m.online ? "text-green-500":"text-slate-300"}
                            />

                        </div>

                    ))}

                </div>

            </section>

        </main>

    );

}