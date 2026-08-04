import { useState } from "react";
import { X, Users } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function NewGroup({ open, onClose }: Props) {

    const [name, setName] = useState("");


    if (!open) return null;

    return (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-end lg:items-center justify-center">

            <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-3xl p-6">

                <div className="flex items-center justify-between">

                    <h2 className="text-2xl font-bold">
                        Nouveau groupe
                    </h2>

                    <button onClick={onClose}>  <X/>  </button>

                </div>

                <div className="mt-6">

                    <label className="font-semibold">
                        Nom du groupe :
                    </label>

                    <div className="mt-2 h-14 rounded-2xl border px-4 flex items-center gap-3">

                        <Users size={20} className="text-slate-400" />

                        <input
                            value={name}
                            onChange={(e)=>setName(e.target.value)}
                            placeholder="Ex : Famille"
                            className="flex-1 outline-none"
                        />

                    </div>

                </div>


                <button className="mt-8 h-14 w-full rounded-2xl bg-sky-500 text-white font-bold hover:bg-sky-600 transition">

                    Créer le groupe

                </button>

            </div>

        </div>

    );

}