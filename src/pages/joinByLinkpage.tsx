import { ArrowLeft, Link2, Clipboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function JoinByLinkPage() {

    const [link, setLink] = useState("");

    async function pasteLink() {

        try {
            const text = await navigator.clipboard.readText();
            setLink(text);
        } catch (err) {
            console.error("Erreur lors de la lecture du presse-papiers:", err);
        }

    }

    return (

        <main className="min-h-screen bg-slate-100 flex items-center justify-center p-5">

            <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm p-8">

                <Link
                    to="/welcome"
                    className="inline-flex mb-8"
                >
                    <ArrowLeft/>
                </Link>

                <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-500 flex items-center justify-center mx-auto">

                    <Link2 size={30}/>

                </div>

                <h1 className="text-3xl font-bold text-center mt-6">

                    Rejoindre un groupe

                </h1>

                <p className="text-slate-500 text-center mt-3">

                    Colle le lien d'invitation reçu
                    pour rejoindre un groupe TellMe.

                </p>

                <div className="mt-8">

                    <label className="font-semibold">

                        Lien d'invitation

                    </label>

                    <div className="mt-2 flex gap-2">

                        <input
                            value={link}
                            onChange={(e)=>setLink(e.target.value)}
                            placeholder="https://tellme.app/invite/..."
                            className="flex-1 h-14 rounded-2xl border border-slate-200 px-4 outline-none focus:border-sky-500"
                        />

                        <button
                            onClick={pasteLink}
                            className="w-14 rounded-2xl bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center"
                        >

                            <Clipboard size={21}/>

                        </button>

                    </div>

                </div>

                <button
                    disabled={!link}
                    className="mt-8 w-full h-14 rounded-2xl bg-sky-500 disabled:bg-slate-300 text-white font-bold hover:bg-sky-600 transition"
                >

                    Continuer

                </button>

            </div>

        </main>

    );

}