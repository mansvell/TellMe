import {
    ArrowLeft,
    MoreVertical,
    Send,
    Smile,
    Paperclip
} from "lucide-react";
import icon from "../assets/icon.png";

export default function ChatPage() {

    const messages = [
        { me:false, name:"Lucas", text:"Salut tout le monde 👋" },
        { me:true, text:"Salut !" },
        { me:false, name:"Emma", text:"On commence à 20h ?" },
        { me:true, text:"Oui aucun problème." },
    ];

    return (

        <main className="h-screen flex flex-col bg-slate-100">

            <header className="bg-white shadow-sm h-20 px-5 flex items-center justify-between">

                <div className="flex items-center gap-4">

                    <button>
                        <ArrowLeft/>
                    </button>

                    <img
                        src={icon}
                        className="w-12 h-12 rounded-2xl"
                    />

                    <div>

                        <h2 className="font-bold">
                            Développeurs React
                        </h2>

                        <p className="text-sm text-emerald-500">
                            24 membres
                        </p>

                    </div>

                </div>

                <button>

                    <MoreVertical/>

                </button>

            </header>

            {/* Messages */}

            <section className="flex-1 overflow-y-auto p-5 space-y-5">

                {messages.map((m,index)=>(

                    <div
                        key={index}
                        className={`flex ${m.me?"justify-end":"justify-start"}`}
                    >

                        <div
                            className={`max-w-[75%] rounded-3xl px-5 py-3 ${
                                m.me
                                    ? "bg-sky-500 text-white"
                                    : "bg-white"
                            }`}
                        >

                            {!m.me && (

                                <p className="font-bold text-sky-600 mb-1">

                                    {m.name}

                                </p>

                            )}

                            <p>

                                {m.text}

                            </p>

                        </div>

                    </div>

                ))}

            </section>

            {/* Input */}

            <footer className="bg-white p-4">

                <div className="h-14 rounded-full bg-slate-100 flex items-center px-4 gap-3">

                    <button>

                        <Smile/>

                    </button>

                    <button>

                        <Paperclip/>

                    </button>

                    <input
                        placeholder="Écrire un message..."
                        className="flex-1 bg-transparent outline-none"
                    />

                    <button
                        className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center"
                    >

                        <Send size={20}/>

                    </button>

                </div>

            </footer>

        </main>

    );

}