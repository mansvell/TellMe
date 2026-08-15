import { useState } from "react";
import {
    Check,
    Clock3,
    LoaderCircle,
    Users,
    X,
} from "lucide-react";
import {
    createGroup,
    type GroupLifetime,
} from "../services/group";
import icon from "../assets/icon.png"; // AJOUT

type NewGroupProps = {
    open: boolean;
    onClose: () => void;

    // Home utilisera cette fonction pour recharger la liste.
    onCreated: () => void;
};

const groupColors = [
    "#0EA5E9",
    "#22C55E",
    "#8B5CF6",
    "#F97316",
    "#EC4899",
    "#64748B",
    "#EF4444",
    "#EAB308",
];

const lifetimes: {
    label: string;
    value: GroupLifetime;
}[] = [
    { label: "5 min", value: 5 },
    { label: "30 min", value: 30 },
    { label: "1 heure", value: 60 },
    { label: "2 heures", value: 120 },
    { label: "1 jour", value: 1440 },
    { label: "3 jours", value: 4320 },
    { label: "7 jours", value: 10080 },
    { label: "Jamais", value: null },
];

export default function NewGroup({
                                     open,
                                     onClose,
                                     onCreated,
                                 }: NewGroupProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(groupColors[0]);
    const [lifetime, setLifetime] =
        useState<GroupLifetime>(null);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const canCreate =
        name.trim().length >= 2 &&
        name.trim().length <= 40 &&
        !loading;

    function resetForm() {
        setName("");
        setColor(groupColors[0]);
        setLifetime(null);
        setErrorMessage("");
    }

    function closeModal() {
        if (loading) return;

        resetForm();
        onClose();
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!canCreate) return;

        setLoading(true);
        setErrorMessage("");

        try {
            const groupId = await createGroup(name, color, lifetime);

            await onCreated();

                //ferme le dialogue.
            resetForm();
            onClose();

                //pour le debug (à enlever plus tard)
            console.log("Groupe créé :", groupId);
        } catch (error) {
            console.error("Create group error:", error);

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible de créer le groupe.",
            );
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
            onClick={closeModal}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white dark:bg-slate-700 p-6 shadow-2xl sm:max-w-lg sm:rounded-[2rem]"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Creer un nouveau groupe
                        </h2>

                        <p className="mt-1 text-sm text-slate-500 dark:text-white">
                            Invitez vos ami(e)s via le lien et discutez librement et en secret
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={closeModal}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
                    >
                        <X size={21} />
                    </button>
                </div>

                <div className="mt-7">

                    <div className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-sky-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                        <img
                            src={icon}
                            alt=""
                            className="w-6 h-6 brightness-0 invert"
                            draggable={false}
                        />

                        <input
                            id="group-name"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            maxLength={40}
                            autoFocus
                            placeholder="Nom du Groupe"
                            className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                        />

                        <span className="text-xs text-slate-400">
                            {name.length}/40
                        </span>
                    </div>
                </div>

                {/* Couleur du groupe */}
                <div className="mt-7">
                    <p className="text-sm font-bold text-slate-700 dark:text-white">
                        Couleur du groupe
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3">
                        {groupColors.map((item) => {
                            const selected = color === item;

                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setColor(item)}
                                    aria-pressed={selected}
                                    className={`flex h-11 w-11 items-center justify-center rounded-full border-4 shadow-sm transition hover:scale-110 active:scale-95 ${
                                        selected
                                            ? "border-sky-200 ring-2 ring-sky-500 ring-offset-2"
                                            : "border-white"
                                    }`}
                                    style={{
                                        backgroundColor: item,
                                    }}
                                >
                                    {selected && (
                                        <Check
                                            size={18}
                                            strokeWidth={3}
                                            className="text-white"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Durée de vie */}
                <div className="mt-7">
                    <div className="flex items-center gap-2">
                        <Clock3
                            size={19}
                            className="text-sky-500"
                        />

                        <p className="text-sm font-bold text-slate-700 dark:text-white">
                            Durée de vie
                        </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {lifetimes.map((item) => {
                            const selected =
                                lifetime === item.value;

                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() =>
                                        setLifetime(item.value)
                                    }
                                    className={`h-11 rounded-xl border text-sm font-semibold transition ${
                                        selected
                                            ? "border-sky-500 bg-sky-500 text-white"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {errorMessage && (
                    <div
                        role="alert"
                        className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                    >
                        {errorMessage}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!canCreate}
                    className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                    {loading ? (
                        <>
                            <LoaderCircle
                                size={20}
                                className="animate-spin"
                            />
                            Création...
                        </>
                    ) : (
                        <>
                            <Users size={20} />
                            Créer le groupe
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}