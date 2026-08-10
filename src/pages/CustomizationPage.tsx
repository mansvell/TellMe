import {
    ArrowLeft,
    Check,
    LoaderCircle,
    Palette,
} from "lucide-react";

import {
    Link,
    useParams,
} from "react-router-dom";

import {
    useEffect,
    useState,
} from "react";

import {
    getMyMessageColor,
    updateMyMessageColor,
} from "../services/group";


const messageColors = [
    "#0EA5E9",
    "#22C55E",
    "#8B5CF6",
    "#F97316",
    "#EC4899",
    "#64748B",
    "#EF4444",
    "#EAB308",
    "#B45309",
];


export default function CustomizationPage() {

    const { groupId } =
        useParams<{ groupId: string }>();

    const [selectedColor, setSelectedColor] =
        useState("#0EA5E9");

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [saved, setSaved] =
        useState(false);


    // Charge la couleur personnelle actuelle.
    useEffect(() => {

        if (!groupId) return;

        let active = true;

        getMyMessageColor(groupId)
            .then((color) => {

                if (!active) return;

                setSelectedColor(color);
                setLoading(false);
            })
            .catch((error) => {

                console.error(
                    "Customization error:",
                    error,
                );

                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };

    }, [groupId]);


    // Enregistre uniquement la couleur du user dans ce groupe.
    async function saveColor() {

        if (!groupId) return;

        setSaving(true);
        setSaved(false);

        try {

            await updateMyMessageColor(
                groupId,
                selectedColor,
            );

            setSaved(true);

            window.setTimeout(
                () => setSaved(false),
                1800,
            );

        } catch (error) {

            console.error(
                "Save color error:",
                error,
            );

        } finally {

            setSaving(false);
        }
    }


    return (

        <main className="min-h-screen bg-slate-100">

            <header className="bg-white shadow-sm">

                <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5">

                    <Link
                        to={`/gdetailp/${groupId}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100"
                    >
                        <ArrowLeft />
                    </Link>

                    <h1 className="text-xl font-bold">
                        Personnalisation
                    </h1>

                </div>

            </header>


            <section className="mx-auto max-w-3xl space-y-6 p-5">

                {/* Aperçu */}

                <div className="rounded-3xl bg-white p-6 shadow-sm">

                    <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">

                            <Palette size={20} />

                        </div>

                        <div>

                            <h2 className="font-bold text-slate-900">
                                Aperçu
                            </h2>

                            <p className="text-sm text-slate-400">
                                Cette couleur s’applique uniquement dans ce groupe.
                            </p>

                        </div>

                    </div>


                    <div className="mt-6 space-y-4 rounded-3xl bg-slate-100 p-5">

                        <div className="flex justify-start">

                            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-slate-800 shadow-sm">
                                Salut ! Tu viens ce soir ?
                            </div>

                        </div>

                        <div className="flex justify-end">

                            <div
                                className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-white shadow-sm"
                                style={{
                                    backgroundColor:
                                    selectedColor,
                                }}
                            >
                                Oui, je serai là 👌
                            </div>

                        </div>

                    </div>

                </div>


                {/* Couleurs */}

                <div className="rounded-3xl bg-white p-6 shadow-sm">

                    <h2 className="text-lg font-bold text-slate-900">
                        Couleur de mes messages
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Les autres membres verront tes messages avec cette couleur.
                    </p>


                    {loading ? (

                        <div className="flex h-40 items-center justify-center">

                            <LoaderCircle
                                size={28}
                                className="animate-spin text-sky-500"
                            />

                        </div>

                    ) : (

                        <div className="mt-6 grid grid-cols-5 gap-4 sm:grid-cols-9">

                            {messageColors.map(
                                (color) => {

                                    const selected =
                                        color
                                        === selectedColor;

                                    return (

                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() =>
                                                setSelectedColor(
                                                    color,
                                                )
                                            }
                                            aria-pressed={
                                                selected
                                            }
                                            className={`flex aspect-square items-center justify-center rounded-full border-4 transition hover:scale-110 active:scale-95 ${
                                                selected
                                                    ? "border-sky-200 ring-2 ring-sky-500 ring-offset-2"
                                                    : "border-white shadow-md"
                                            }`}
                                            style={{
                                                backgroundColor:
                                                color,
                                            }}
                                        >

                                            {selected && (

                                                <Check
                                                    className="text-white"
                                                    size={20}
                                                    strokeWidth={3}
                                                />

                                            )}

                                        </button>

                                    );
                                },
                            )}

                        </div>

                    )}

                </div>


                <button
                    type="button"
                    disabled={
                        loading || saving
                    }
                    onClick={() =>
                        void saveColor()
                    }
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >

                    {saving ? (

                        <>
                            <LoaderCircle
                                size={20}
                                className="animate-spin"
                            />
                            Enregistrement...
                        </>

                    ) : saved ? (

                        <>
                            <Check size={20} />
                            Enregistré
                        </>

                    ) : (

                        "Enregistrer"

                    )}

                </button>

            </section>

        </main>
    );
}