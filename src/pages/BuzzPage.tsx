import {BarChart3, Check, ChevronRight, CirclePlus, Copy, Flame, Link2, Lock, MessageCircle, MoreHorizontal, Plus,
    Share2, Trash2, Users, Vote, X,Globe } from "lucide-react";

import {
    useEffect,
    useMemo,
    useState, useRef
} from "react";
import {publishBuzzToGroup } from "../services/buzz";
import icon from "../assets/icon.png";

import BottomNavigation from "../components/BottomNavigation";

import {
    getMyGroups,
    type Group,
} from "../services/group";

import {
    createBuzz,
    deleteBuzz,
    getBuzzShareLink,
    getMyBuzzes,
    setBuzzActive,
    type Buzz,
    type VoteType,
} from "../services/buzz";

import BuzzShareCard from "../components/BuzzShareCard";
import { toBlob } from "html-to-image";

type Tab =
    | "create"
    | "mine"
    | "results";

export default function BuzzPage() {

    const [selectedBuzzToShare, setSelectedBuzzToShare] = useState<Buzz | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const shareCardRef = useRef<HTMLDivElement>(null);


    const [tab, setTab] =
        useState<Tab>("create");

    const [buzzes, setBuzzes] =
        useState<Buzz[]>([]);

    const [groups, setGroups] =
        useState<Group[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [creating, setCreating] =
        useState(false);

    const [createdBuzz, setCreatedBuzz] =
        useState<Buzz | null>(null);

    const [menuBuzzId, setMenuBuzzId] =
        useState<string | null>(null);


    // FORMULAIRE

    const [question, setQuestion] =
        useState("");

    const [options, setOptions] =
        useState<string[]>([
            "",
            "",
        ]);

    const [voteType, setVoteType] =
        useState<VoteType>("single");

    const [groupId, setGroupId] =
        useState<string | null>(null);

    const [allowExternal, setAllowExternal] =
        useState(true);

    const [showResults, setShowResults] =
        useState(true);
    const [publishing, setPublishing] =
        useState(false);


    useEffect(() => {
        let cancelled = false;

        Promise.all([
            getMyBuzzes(),
            getMyGroups(),
        ])
            .then(([myBuzzes, myGroups]) => {
                if (cancelled) return;

                setBuzzes(myBuzzes);
                setGroups(myGroups);
                setLoading(false);
            })
            .catch((error) => {
                if (cancelled) return;

                console.error("Buzz loading error:", error);
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // STATS
    async function handlePublishToGroup(
        buzz: Buzz,
    ) {

        try {

            setPublishing(true);

            await publishBuzzToGroup(
                buzz,
            );

            setCreatedBuzz(null);

            console.log(
                "Buzz publié dans le groupe.",
            );

        } catch (error) {

            console.error(
                "Buzz publication error:",
                error,
            );

        } finally {

            setPublishing(false);
        }
    }
    const totalVotes =
        useMemo(
            () =>
                buzzes.reduce(
                    (total, buzz) =>
                        total +
                        (buzz.votes_count ?? 0),
                    0,
                ),
            [buzzes],
        );


    const externalVotes =
        useMemo(
            () =>
                buzzes.reduce(
                    (total, buzz) =>
                        total +
                        (
                            buzz.external_votes_count ??
                            0
                        ),
                    0,
                ),
            [buzzes],
        );


    // OPTIONS
    function updateOption(
        index: number,
        value: string,
    ) {

        setOptions((current) =>
            current.map(
                (option, optionIndex) =>
                    optionIndex === index
                        ? value
                        : option,
            ),
        );
    }
    function getBuzzPublicUrl(buzz: Buzz) {
        return `${window.location.origin}/b/${buzz.share_code}`;
    }

    async function copyBuzzLink(buzz: Buzz) {
        await navigator.clipboard.writeText(
            getBuzzPublicUrl(buzz),
        );

        setLinkCopied(true);

        window.setTimeout(() => {
            setLinkCopied(false);
        }, 2000);
    }

    function addOption() {

        if (options.length >= 8) {
            return;
        }

        setOptions(
            (current) => [
                ...current,
                "",
            ],
        );
    }


    function removeOption(
        index: number,
    ) {

        if (options.length <= 2) {
            return;
        }

        setOptions((current) =>
            current.filter(
                (_, optionIndex) =>
                    optionIndex !== index,
            ),
        );
    }

    async function handleCreate() {

        const validOptions =
            options.filter(
                (option) =>
                    option.trim(),
            );


        if (
            !question.trim() ||
            validOptions.length < 2
        ) {
            return;
        }


        try {

            setCreating(true);


            const buzz =
                await createBuzz({
                    question,
                    options:
                    validOptions,

                    voteType,

                    groupId,

                    allowExternalVotes:
                    allowExternal,

                    showResultsAfterVote:
                    showResults,
                });


            setCreatedBuzz(buzz);

            setBuzzes(
                (current) => [
                    buzz,
                    ...current,
                ],
            );


            setQuestion("");
            setOptions([
                "",
                "",
            ]);

            setVoteType("single");
            setGroupId(null);
            setAllowExternal(true);
            setShowResults(true);

        } catch (error) {

            console.error(
                "Buzz creation error:",
                error,
            );

        } finally {

            setCreating(false);
        }
    }

    async function shareBuzz(
        buzz: Buzz,
    ) {
        if (!shareCardRef.current) {
            return;
        }

        const link =
            getBuzzShareLink(
                buzz.share_code,
            );

        try {
            const blob =
                await toBlob(
                    shareCardRef.current,
                    {
                        pixelRatio: 3,
                        cacheBust: true,
                    },
                );

            if (!blob) {
                throw new Error(
                    "Impossible de créer l'affiche.",
                );
            }

            const file =
                new File(
                    [blob],
                    "tellme-buzz.png",
                    {
                        type: "image/png",
                    },
                );

            if (
                navigator.share &&
                navigator.canShare?.({
                    files: [file],
                })
            ) {
                await navigator.share({
                    title: "TellMe Buzz",
                    text: `🔥 J'ai quelque chose de hot pour toi.\nClique et découvre 👀\n\n${link}`,
                    files: [file],
                });

                return;
            }

            if (navigator.share) {
                await navigator.share({
                    title: "TellMe Buzz",
                    url: link,
                });

                return;
            }

            await navigator.clipboard.writeText(
                link,
            );

        } catch (error) {
            if (
                error instanceof DOMException &&
                error.name === "AbortError"
            ) {
                return;
            }

            console.error(
                "Buzz share error:",
                error,
            );
        }
    }


    async function copyBuzz(
        buzz: Buzz,
    ) {

        await navigator.clipboard
            .writeText(
                getBuzzShareLink(
                    buzz.share_code,
                ),
            );
    }

    async function toggleBuzz(
        buzz: Buzz,
    ) {

        try {

            await setBuzzActive(
                buzz.id,
                !buzz.is_active,
            );


            setBuzzes((current) =>
                current.map((item) =>
                    item.id === buzz.id
                        ? {
                            ...item,
                            is_active:
                                !item.is_active,
                        }
                        : item,
                ),
            );

            setMenuBuzzId(null);

        } catch (error) {

            console.error(
                "Buzz update error:",
                error,
            );
        }
    }


    async function removeBuzz(
        buzz: Buzz,
    ) {

        try {

            await deleteBuzz(
                buzz.id,
            );


            setBuzzes((current) =>
                current.filter(
                    (item) =>
                        item.id !== buzz.id,
                ),
            );

            setMenuBuzzId(null);

        } catch (error) {

            console.error(
                "Buzz delete error:",
                error,
            );
        }
    }

    return (

        <main className="relative min-h-screen overflow-x-hidden bg-slate-50 pb-28 text-slate-900 duration-500 dark:bg-slate-950 dark:text-white">

            <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 dark:from-sky-950 dark:via-sky-900 dark:to-slate-900" />

            <div className="pointer-events-none absolute inset-x-0 top-[250px] h-[220px] bg-gradient-to-b from-transparent via-slate-50/70 to-slate-50 dark:via-slate-950/70 dark:to-slate-950" />

            <div className="pointer-events-none absolute -right-28 top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

            <div className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

            <header className="relative z-10 mx-auto max-w-7xl px-5 pt-6">

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                        <img
                            src={icon}
                            alt="TellMe"
                            className="h-16 w-16 object-contain drop-shadow-md"
                        />

                        <div>

                            <div className="flex items-center gap-2">

                                <h1 className="text-3xl font-black tracking-tight text-white">
                                    TellMe
                                </h1>

                                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl">
                                    Buzz
                                </span>

                            </div>

                            <p className="mt-0.5 text-sm font-medium text-sky-100">
                                Lance la discussion
                            </p>

                        </div>

                    </div>


                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-xl">
                        <Flame size={23} />
                    </div>

                </div>

            </header>

            <section className="relative z-10 mx-auto mt-9 max-w-7xl px-5">

                <div className="rounded-[1.5rem] border border-white/50 bg-white/90 p-1.5 shadow-xl shadow-sky-900/10 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/90">

                    <div className="grid grid-cols-3 gap-1">

                        <TabButton
                            active={
                                tab === "create"
                            }
                            icon={
                                <Plus size={17} />
                            }
                            label="Créer"
                            onClick={() =>
                                setTab("create")
                            }
                        />

                        <TabButton
                            active={
                                tab === "mine"
                            }
                            icon={
                                <Vote size={17} />
                            }
                            label="Mes Buzz"
                            onClick={() =>
                                setTab("mine")
                            }
                        />

                        <TabButton
                            active={
                                tab === "results"
                            }
                            icon={
                                <BarChart3 size={17} />
                            }
                            label="Résultats"
                            onClick={() =>
                                setTab("results")
                            }
                        />

                    </div>

                </div>

                {tab === "create" && (

                    <div className="mx-auto mt-8 max-w-3xl">

                        {/* QUESTION */}
                        <div className="mt-6 rounded-[1.8rem] border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-xl dark:bg-orange-950/30">
                                    <Flame size={25} />
                                </div>

                                <div>

                                    <h4 className="font-bold text-sky-500">
                                        Ta question
                                    </h4>

                                    <p className="text-xs text-slate-400">
                                        Fais-la courte et intéressante.
                                    </p>

                                </div>

                            </div>


                            <textarea
                                value={question}
                                onChange={(event) =>
                                    setQuestion(
                                        event.target.value,
                                    )
                                }
                                maxLength={220}
                                rows={3}
                                placeholder="Ex : Est-ce que tu pourrais pardonner une tromperie ?"
                                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-sky-950"
                            />

                            <div className="mt-1 text-right text-xs text-slate-400">
                                {question.length}/220
                            </div>

                        </div>


                        {/* OPTIONS */}
                        <div className="mt-4 rounded-[1.8rem] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <div className="flex items-center justify-between">

                                <div>

                                    <h4 className="font-bold text-sky-500">
                                        Réponses
                                    </h4>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Entre 2 et 8 choix.
                                    </p>

                                </div>

                                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-500 dark:bg-sky-950/40">
                                    {options.length}/8
                                </span>

                            </div>


                            <div className="mt-5 space-y-3">

                                {options.map(
                                    (
                                        option,
                                        index,
                                    ) => (
                                        <div key={index}
                                            className="flex items-center gap-3"
                                        >

                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                                {String.fromCharCode(
                                                    65 + index,
                                                )}
                                            </div>

                                            <input
                                                value={option}
                                                onChange={(event) =>
                                                    updateOption(
                                                        index,
                                                        event.target.value,
                                                    )
                                                }
                                                maxLength={80}
                                                placeholder={`Réponse ${index + 1}`}
                                                className="h-13 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-medium outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800"
                                            />


                                            {options.length > 2 && (

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeOption(
                                                            index,
                                                        )
                                                    }
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                                                >
                                                    <X size={18} />
                                                </button>

                                            )}

                                        </div>

                                    ),
                                )}

                            </div>


                            {options.length < 8 && (

                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="mt-4 flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-sky-500 transition hover:bg-sky-50 dark:hover:bg-sky-950/30"
                                >

                                    <CirclePlus size={18} />

                                    Ajouter une réponse

                                </button>

                            )}

                        </div>

                        {/* TYPE DE VOTE */}
                        <div className="mt-4 rounded-[1.8rem] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <h4 className="font-bold text-sky-500">
                                Type de vote
                            </h4>


                            <div className="mt-5 grid gap-3 sm:grid-cols-2">

                                <ChoiceCard
                                    selected={
                                        voteType ===
                                        "single"
                                    }
                                    title="Un seul choix"
                                    description="Une seule réponse par participant."
                                    onClick={() =>
                                        setVoteType(
                                            "single",
                                        )
                                    }
                                />

                                <ChoiceCard
                                    selected={
                                        voteType ===
                                        "multiple"
                                    }
                                    title="Plusieurs choix"
                                    description="Plusieurs réponses peuvent être sélectionnées."
                                    onClick={() =>
                                        setVoteType(
                                            "multiple",
                                        )
                                    }
                                />

                            </div>

                        </div>


                        {/* GROUPE */}

                        <div
                            className="mt-4 rounded-[1.8rem] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <div className="flex items-center gap-3">

                                <div
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 dark:bg-violet-950/30">
                                    <Users size={20}/>
                                </div>

                                <div>

                                    <h4 className="font-bold text-sky-500">
                                        Lier le Buzz à un groupe
                                    </h4>

                                    <p className="text-xs text-slate-400">
                                        Facultatif
                                    </p>

                                </div>

                            </div>


                            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Ton Buzz sera visible dans ce groupe
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Les personnes qui découvrent ton Buzz pourront être invitées à rejoindre ce groupe.
                            </p>


                            <select
                                value={
                                    groupId ?? ""
                                }
                                onChange={(event) =>
                                    setGroupId(
                                        event.target.value ||
                                        null,
                                    )
                                }
                                className="mt-4 h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800"
                            >

                                <option value="">
                                    Aucun groupe
                                </option>

                                {groups.map(
                                    (group) => (

                                        <option
                                            key={group.id}
                                            value={group.id}
                                        >
                                            {group.name}
                                        </option>

                                    ),
                                )}

                            </select>

                        </div>


                        {/* SETTINGS */}
                        <div
                            className="mt-4 overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <ToggleRow
                                icon={
                                    <Link2 size={20} />
                                }
                                title="Votes externes"
                                description="Les personnes sans compte TellMe peuvent voter."
                                checked={
                                    allowExternal
                                }
                                onChange={
                                    setAllowExternal
                                }
                            />

                            <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

                            <ToggleRow
                                icon={
                                    <BarChart3 size={20} />
                                }
                                title="Afficher les résultats"
                                description="Les participants voient les résultats après leur vote."
                                checked={
                                    showResults
                                }
                                onChange={
                                    setShowResults
                                }
                            />

                        </div>


                        {/* CREATE BUTTON */}

                        <button
                            type="button"
                            disabled={
                                creating ||
                                !question.trim() ||
                                options.filter(
                                    (option) =>
                                        option.trim(),
                                ).length < 2
                            }
                            onClick={() =>
                                void handleCreate()
                            }
                            className="mt-6 flex h-15 w-full items-center justify-center gap-2 rounded-[1.3rem] bg-sky-500 font-black text-white shadow-xl shadow-sky-500/20 transition duration-300 hover:-translate-y-0.5 hover:bg-sky-600 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                        >

                            <Flame size={20} />

                            {creating
                                ? "Création..."
                                : "Créer le Buzz"}

                        </button>

                    </div>

                )}

                                           {/* MES BUZZ */}
                {tab === "mine" && (

                    <div className="mt-8">

                        <h2 className="text-2xl text-white font-bold"> Activité </h2>


                        {loading ? (

                            <LoadingCards />

                        ) : buzzes.length === 0 ? (

                            <EmptyBuzz
                                onCreate={() =>
                                    setTab("create")
                                }
                            />

                        ) : (

                            <div className="mt-6 grid gap-4 lg:grid-cols-2">

                                {buzzes.map(
                                    (buzz) => {

                                        const group =
                                            groups.find(
                                                (item) =>
                                                    item.id ===
                                                    buzz.group_id,
                                            );


                                        return (

                                            <article
                                                key={buzz.id}
                                                className="relative rounded-[1.8rem] border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                                            >

                                                <div className="flex items-start justify-between gap-3">

                                                    <div className="flex min-w-0 items-start gap-3">

                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-400 text-xl dark:bg-orange-950/30">
                                                            <Flame size={20} />
                                                        </div>

                                                        <div className="min-w-0">

                                                            <div className="flex items-center gap-2">

                                                                <span className={`h-2 w-2 rounded-full ${buzz.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />

                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                    {buzz.is_active
                                                                        ? "Actif"
                                                                        : "Fermé"}
                                                                </span>

                                                            </div>

                                                            <h4 className="mt-1 line-clamp-2 font-black leading-5">
                                                                {buzz.question}
                                                            </h4>

                                                        </div>

                                                    </div>


                                                    <div className="relative">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setMenuBuzzId(
                                                                    menuBuzzId === buzz.id
                                                                        ? null
                                                                        : buzz.id,
                                                                )
                                                            }
                                                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        >
                                                            <MoreHorizontal size={19} />
                                                        </button>


                                                        {menuBuzzId === buzz.id && (

                                                            <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        void toggleBuzz(
                                                                            buzz,
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
                                                                >
                                                                    <Lock size={16} />

                                                                    {buzz.is_active
                                                                        ? "Fermer le Buzz"
                                                                        : "Réactiver"}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        void removeBuzz(
                                                                            buzz,
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                >
                                                                    <Trash2 size={16} />

                                                                    Supprimer
                                                                </button>

                                                            </div>

                                                        )}

                                                    </div>

                                                </div>


                                                {/* OPTIONS PREVIEW */}

                                                <div className="mt-5 space-y-2">

                                                    {buzz.buzz_options
                                                        ?.slice(
                                                            0,
                                                            3,
                                                        )
                                                        .map(
                                                            (
                                                                option,
                                                                index,
                                                            ) => (

                                                                <div
                                                                    key={option.id}
                                                                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70"
                                                                >

                                                                    <span className="text-xs font-black text-sky-500">
                                                                        {String.fromCharCode(
                                                                            65 + index,
                                                                        )}
                                                                    </span>

                                                                    <span className="truncate text-sm font-medium">
                                                                        {option.label}
                                                                    </span>

                                                                </div>

                                                            ),
                                                        )}

                                                    {(buzz.buzz_options?.length ?? 0) > 3 && (

                                                        <p className="pl-2 text-xs text-slate-400">
                                                            + {(buzz.buzz_options?.length ?? 0) - 3} autres réponses
                                                        </p>

                                                    )}

                                                </div>


                                                {/* GROUP */}

                                                {group && (

                                                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-violet-500">

                                                        <MessageCircle size={15} />

                                                        Discussion liée à {group.name}

                                                    </div>

                                                )}


                                                {/* FOOTER */}

                                                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">

                                                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">

                                                        <span>{buzz.votes_count ?? 0} Votes :</span>
                                                        <span> {buzz.tellme_votes_count ?? 0} Internes</span>
                                                        <span>{buzz.external_votes_count ?? 0} Externes</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">

                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedBuzzToShare(buzz)}
                                                            className="flex items-center gap-2 rounded-2xl bg-sky-200 px-4 py-3 font-bold text-sky-600 transition hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300"
                                                        >
                                                            <Share2 size={18}/>
                                                            Partager
                                                        </button>

                                                    </div>

                                                </div>

                                            </article>

                                        );

                                    },
                                )}

                            </div>

                        )}

                    </div>

                )}


                {tab === "results" && (

                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-white">
                            Statistiques des Votes
                        </h2>

                        {/* GLOBAL STATS */}
                        <div className="mt-6 grid grid-cols-3 gap-3">

                            <StatCard
                                icon=<Flame/>
                                value={
                                    buzzes.length
                                }
                                label="Buzz"
                            />

                            <StatCard
                                icon=<Vote/>
                                value={
                                    totalVotes
                                }
                                label="Votes"
                            />

                            <StatCard
                                icon=<Globe/>
                                value={
                                    externalVotes
                                }
                                label="Externes"
                            />

                        </div>

                        {/* RESULTS LIST */}
                        <div className="mt-7 space-y-5">
                            {buzzes.map((buzz) => {
                                const results = buzz.results ?? [];

                                const totalSelections = results.reduce(
                                    (total, option) =>
                                        total + option.votes,
                                    0,
                                );

                                return (
                                    <div key={buzz.id}
                                        className="w-full rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                    >
                                        <div className="mt-6 space-y-4">
                                            {results.map((option) => {
                                                const percentage =
                                                    totalSelections > 0
                                                        ? Math.round(
                                                            (option.votes / totalSelections) * 100,
                                                        )
                                                        : 0;

                                                return (
                                                    <div key={option.option_id}>
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <span className="min-w-0 truncate font-bold text-slate-700 dark:text-slate-200">
                                                                {option.label}
                                                            </span>

                                                            <span className="shrink-0 text-sm font-black text-sky-600 dark:text-sky-400">
                                                                {option.votes} personne{option.votes !== 1 ? "s" : ""} · {percentage}%
                                                            </span>
                                                        </div>

                                                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {results.length === 0 && (
                                                <div className="rounded-2xl bg-slate-50 py-5 text-center dark:bg-slate-800/60">
                                                    <p className="text-2xl">
                                                        🗳️
                                                    </p>

                                                    <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                                                        Aucun résultat pour le moment
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </section>

            {/* card du Buzz crée */}
            {createdBuzz && (

                <div
                    className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-5"
                    onClick={() =>
                        setCreatedBuzz(null)
                    }
                >

                    <div
                        className="w-full max-w-md rounded-t-[2.2rem] bg-white p-6 shadow-2xl dark:bg-slate-900 sm:rounded-[2.2rem]"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30">
                            <Check size={30}/>
                        </div>


                        <h3 className="mt-4 text-center text-2xl font-black">
                            Ton Buzz est prêt !
                        </h3>

                        <p className="mt-2 text-center text-xl leading-6 text-slate-500 dark:text-slate-400">
                            Retrouve le sous l'onglet "Mes Buzz" et partage ton lien
                        </p>

                        {/* GROUPE */}
                        {createdBuzz.group_id && (

                            <button
                                type="button"
                                disabled={publishing}
                                onClick={() =>
                                    void handlePublishToGroup(
                                        createdBuzz,
                                    )
                                }
                                className="mt-6 mb-5 flex h-14 w-full items-center justify-between rounded-2xl bg-violet-50 px-4 text-violet-600 transition hover:bg-violet-100 disabled:opacity-50 dark:bg-violet-950/30 dark:text-violet-300"
                            >

                                <span className="flex items-center gap-3 font-bold">

                                    <MessageCircle size={19}/>

                                    {publishing
                                        ? "Publication..."
                                        : "Publier dans le groupe"}

                                </span>

                                <ChevronRight size={18}/>

                            </button>

                        )}


                        <button
                            type="button"
                            onClick={() =>
                                setCreatedBuzz(null)
                            }
                            className="mx-auto flex items-center justify-center p-4 rounded-xl item-center font-bold text-white bg-sky-400 transition hover:text-slate-600 dark:hover:text-white"
                        >
                            Okay
                        </button>
                    </div>
                </div>
            )}


            {selectedBuzzToShare && (
                <div
                    className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
                    <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 dark:bg-slate-900 sm:max-w-lg sm:rounded-[2rem]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xm font-black">
                                    Partage et obtiens des reponses
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedBuzzToShare(null)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <BuzzShareCard ref={shareCardRef} />
                        </div>

                        <div className="mt-6 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                                Lien du Buzz
                            </p>

                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1 truncate px-2 text-sm font-semibold">
                                    {getBuzzPublicUrl(selectedBuzzToShare)}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => void copyBuzzLink(selectedBuzzToShare)}
                                    className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 font-bold text-sky-600 shadow-sm dark:bg-slate-700 dark:text-sky-300"
                                >
                                    <Copy size={17} />

                                    {linkCopied
                                        ? "Copié ✓"
                                        : "Copier"}
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"  onClick={() =>
                            void shareBuzz(
                                selectedBuzzToShare,
                            )
                        }
                            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 active:scale-[0.98]"
                        >
                            <Share2 size={19} />
                            Partager en statut
                        </button>
                    </div>
                </div>
            )}

            <BottomNavigation active="buzz" />
        </main>
    );
}

function TabButton({active, icon, label, onClick}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {

    return (

        <button
            type="button"
            onClick={onClick}
            className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all duration-300 ${active ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
            {icon}

            <span>
                {label}
            </span>
        </button>

    );
}

function ChoiceCard({selected, title, description, onClick}: {
    selected: boolean;
    title: string;
    description: string;
    onClick: () => void;
}) {

    return (

        <button
            type="button"
            onClick={onClick}
            className={`relative rounded-2xl border p-4 text-left transition-all duration-300 ${selected ? "border-sky-400 bg-sky-50 shadow-sm ring-2 ring-sky-100 dark:bg-sky-950/30 dark:ring-sky-900" : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"}`}
        >

            {selected && (

                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white">
                    <Check size={14} />
                </div>

            )}
            <h5 className="mt-3 text-sky-600 font-bold">
                {title}
            </h5>

            <p className="mt-1 pr-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
            </p>

        </button>

    );
}

function ToggleRow({
                       icon,
                       title,
                       description,
                       checked,
                       onChange,
                   }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {

    return (

        <div className="flex items-center gap-4 p-5">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 dark:bg-sky-950/30">
                {icon}
            </div>


            <div className="min-w-0 flex-1">

                <h4 className="font-bold text-sky-500">
                    {title}
                </h4>

                <p className="mt-0.5 text-xs leading-5 text-slate-400">
                    {description}
                </p>

            </div>


            <button
                type="button"
                onClick={() =>
                    onChange(!checked)
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"}`}
            >

                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${checked ? "left-6" : "left-1"}`} />

            </button>

        </div>

    );
}


function StatCard({icon, value, label}: {
    icon: React.ReactNode;
    value: number;
    label: string;
}) {

    return (

        <div className="rounded-[1.5rem] flex items-center justify-between border border-slate-200/80 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="text-sky-500">
                {icon}
            </div>

            <p className="mt-2 text-xl font-black">
                {value}
            </p>

            <p className="mt-0.5 text-xs font-medium text-slate-400">
                {label}
            </p>

        </div>

    );
}

function EmptyBuzz({
                       onCreate,
                   }: {
    onCreate: () => void;
}) {

    return (

        <div className="mt-7 rounded-[2rem] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-sky-50 text-4xl dark:bg-sky-950/30">
                🗳️
            </div>

            <h4 className="mt-5 text-xl font-black">
                Aucun Buzz pour le moment.
            </h4>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                Pose une question et laisse les autres décider.
            </p>

            <button
                type="button"
                onClick={onCreate}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-sky-500 px-6 font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600"
            >
                <Plus size={18} />

                Créer un Buzz
            </button>

        </div>

    );
}

function LoadingCards() {

    return (

        <div className="mt-6 grid gap-4 lg:grid-cols-2">

            {[1, 2, 3, 4].map(
                (item) => (

                    <div
                        key={item}
                        className="h-52 animate-pulse rounded-[1.8rem] bg-white dark:bg-slate-900"
                    />

                ),
            )}

        </div>

    );
}