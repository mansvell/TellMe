import { ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";

export default function CustomizationPage() {

    const wallpapers = [
        "#F8FAFC",
        "#DBEAFE",
        "#DCFCE7",
        "#FEF3C7",
        "#FCE7F3",
        "#EDE9FE",
    ];

    const bubbles = [
        "#0EA5E9",
        "#22C55E",
        "#8B5CF6",
        "#F97316",
        "#EC4899",
        "#64748B",
        "#EF4444",
        "#EAB308",
        "#B45309"
    ];

    return (

        <main className="min-h-screen bg-slate-100">

            <header className="bg-white shadow-sm">

                <div className="max-w-5xl mx-auto h-16 px-5 flex items-center gap-4">

                    <Link to="/gdetailp">

                        <ArrowLeft/>

                    </Link>

                    <h1 className="font-bold text-xl">
                        Personnalisation
                    </h1>

                </div>

            </header>

            <section className="max-w-5xl mx-auto p-5 space-y-6">

                <div className="rounded-3xl bg-white shadow-sm p-6">

                    <h2 className="font-bold text-lg mb-5">
                        Aperçu
                    </h2>

                    <div className="rounded-3xl bg-slate-100 p-5 space-y-3">

                        <div className="flex justify-start">

                            <div className="bg-white rounded-2xl px-4 py-3 max-w-xs shadow-sm">

                                Salut !

                            </div>

                        </div>

                        <div className="flex justify-end">

                            <div className="bg-sky-500 text-white rounded-2xl px-4 py-3 max-w-xs shadow-sm">

                                Salut, ça va ?

                            </div>

                        </div>

                    </div>

                </div>

                {/* Wallpaper */}

                <div className="rounded-3xl bg-white shadow-sm p-6">

                    <h2 className="font-bold text-lg">

                        Fond du chat

                    </h2>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-5">

                        {wallpapers.map((c)=>(

                            <button
                                key={c}
                                style={{background:c}}
                                className="aspect-square rounded-2xl border-4 border-white shadow"
                            />

                        ))}

                    </div>

                </div>

                {/* Bubble */}

                <div className="rounded-3xl bg-white shadow-sm p-6">

                    <h2 className="font-bold text-lg">

                        Couleur de mes messages

                    </h2>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-5">

                        {bubbles.map((c)=>(

                            <button
                                key={c}
                                style={{background:c}}
                                className="aspect-square rounded-full flex items-center justify-center"
                            >

                                <Check
                                    className="text-white"
                                    size={20}
                                />

                            </button>

                        ))}

                    </div>

                </div>

                <button className="w-full h-14 rounded-2xl bg-sky-500 text-white font-bold hover:bg-sky-600 transition">

                    Enregistrer

                </button>

            </section>

        </main>

    );

}