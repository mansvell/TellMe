import {
    ArrowLeft,
    Image,
    Video,
    FileText
} from "lucide-react";

export default function MediaPage() {

    const medias = Array.from({ length: 12 });

    return (

        <main className="min-h-screen bg-slate-100">

            <header className="bg-white shadow-sm">

                <div className="max-w-6xl mx-auto h-16 flex items-center gap-4 px-5">

                    <ArrowLeft className="cursor-pointer"/>

                    <h1 className="font-bold text-xl">
                        Médias
                    </h1>

                </div>

            </header>

            <section className="max-w-6xl mx-auto p-5">

                {/* Tabs */}

                <div className="flex gap-3 overflow-x-auto pb-3">

                    <button className="h-11 px-5 rounded-full bg-sky-500 text-white flex items-center gap-2">

                        <Image size={18}/>

                        Photos

                    </button>

                    <button className="h-11 px-5 rounded-full bg-white">

                        <Video size={18}/>

                        Vidéos

                    </button>

                    <button className="h-11 px-5 rounded-full bg-white">

                        <FileText size={18}/>

                        Fichiers

                    </button>

                </div>

                {/* Grid */}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">

                    {medias.map((_,index)=>(

                        <div
                            key={index}
                            className="aspect-square rounded-3xl bg-sky-100 hover:scale-[1.02] transition cursor-pointer"
                        />

                    ))}

                </div>

            </section>

        </main>

    );

}