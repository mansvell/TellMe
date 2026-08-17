import {
    ArrowRight,
    Check,
    Flame,
    LoaderCircle,
    LockKeyhole,
    MessageCircle,
    Vote,
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import icon from "../assets/icon.png";

import {
    getPublicBuzz,
    getPublicBuzzResults,
    votePublicBuzz,
    type PublicBuzz,
    type PublicBuzzResult,
} from "../services/buzz";


const VISITOR_KEY =
    "tellme-buzz-visitor-id";


function getVisitorId(): string {
    const existing =
        localStorage.getItem(
            VISITOR_KEY,
        );

    if (existing) {
        return existing;
    }

    const id =
        crypto.randomUUID();

    localStorage.setItem(
        VISITOR_KEY,
        id,
    );

    return id;
}


export default function VoteBuzz() {

    const { shareCode } =
        useParams<{
            shareCode: string;
        }>();

    const navigate =
        useNavigate();

    const [buzz, setBuzz] =
        useState<PublicBuzz | null>(
            null,
        );

    const [selected, setSelected] =
        useState<string[]>([]);

    const [results, setResults] =
        useState<PublicBuzzResult[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [voting, setVoting] =
        useState(false);

    const [voted, setVoted] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");


    useEffect(() => {

        if (!shareCode) {
            setLoading(false);
            return;
        }

        let active = true;

        getPublicBuzz(shareCode)
            .then((data) => {

                if (!active) return;

                setBuzz(data);
                setLoading(false);
            })
            .catch((error) => {

                if (!active) return;

                console.error(
                    "Public Buzz error:",
                    error,
                );

                setLoading(false);
            });

        return () => {
            active = false;
        };

    }, [shareCode]);


    function selectOption(
        optionId: string,
    ) {
        if (!buzz || voted) {
            return;
        }

        if (
            buzz.vote_type ===
            "single"
        ) {
            setSelected([
                optionId,
            ]);

            return;
        }

        setSelected((current) =>
            current.includes(
                optionId,
            )
                ? current.filter(
                    (id) =>
                        id !== optionId,
                )
                : [
                    ...current,
                    optionId,
                ],
        );
    }


    async function handleVote() {

        if (
            !buzz ||
            !shareCode ||
            selected.length === 0
        ) {
            return;
        }

        try {

            setVoting(true);
            setErrorMessage("");

            await votePublicBuzz(
                shareCode,
                getVisitorId(),
                selected,
            );

            setVoted(true);

            if (
                buzz.show_results_after_vote
            ) {
                const data =
                    await getPublicBuzzResults(
                        shareCode,
                    );

                setResults(data);
            }

        } catch (error) {

            console.error(
                "Public vote error:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Impossible d'enregistrer ton vote.",
            );

        } finally {

            setVoting(false);
        }
    }


    const totalVotes =
        useMemo(
            () =>
                results.reduce(
                    (total, item) =>
                        total +
                        item.votes,
                    0,
                ),
            [results],
        );


    if (loading) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">

                <LoaderCircle
                    size={34}
                    className="animate-spin text-sky-500"
                />

            </main>
        );
    }


    if (!buzz) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-500 via-white to-white px-5 text-center dark:bg-slate-950">

                <div>
                    <img
                        src={icon}
                        alt="TellMe"
                        className="h-30 w-30 object-contain ml-25"
                    />

                    <h1 className="mt-5 text-2xl font-black dark:text-white">
                        Oups! Ce Buzz n'existe plus...
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Il a été fermé par son créateur
                    </p>

                    <button className="mt-5  p-2 bg-sky-500 text-xm text-white rounded-2xl" onClick={() =>
                        navigate(`/welcome`)}>
                        Rejoins TellMe et partage des moments fun
                    </button>
                </div>

            </main>
        );
    }


    return (

        <main
            className="relative min-h-screen overflow-hidden bg-slate-50 px-5 pb-12 text-slate-900 dark:bg-slate-950 dark:text-white">

            <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 dark:from-sky-950 dark:via-sky-900 dark:to-slate-900" />

            <div className="pointer-events-none absolute inset-x-0 top-[260px] h-[220px] bg-gradient-to-b from-transparent via-slate-50/80 to-slate-50 dark:via-slate-950/80 dark:to-slate-950" />


            <header className="relative z-10 mx-auto flex max-w-xl items-center gap-3 pt-6">

                <img
                    src={icon}
                    alt="TellMe"
                    className="h-14 w-14 object-contain"
                />

                <div>

                    <h1 className="text-2xl font-black text-white">
                        TellMe
                    </h1>

                    <p className="text-xs font-semibold text-sky-100">
                        Buzz
                    </p>

                </div>

            </header>


            <section className="relative z-10 mx-auto mt-10 max-w-xl">

                {!voted ? (

                    <div className="overflow-hidden rounded-[2rem] border border-white/30 bg-white shadow-2xl shadow-sky-900/15 dark:border-slate-700 dark:bg-slate-900">

                        <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400 p-6 text-white">

                            <div className="flex items-center gap-2 text-xs font-black tracking-[0.16em]">

                                <Flame size={17} />

                                QUESTION BUZZ

                            </div>

                            <h2 className="mt-4 text-2xl font-black leading-snug">
                                {buzz.question}
                            </h2>

                        </div>


                        <div className="p-5">

                            <div className="space-y-3">

                                {buzz.options.map(
                                    (option) => {

                                        const active =
                                            selected.includes(
                                                option.id,
                                            );

                                        return (

                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() =>
                                                    selectOption(
                                                        option.id,
                                                    )
                                                }
                                                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${active ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                                            >

                                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${buzz.vote_type === "single" ? "rounded-full" : "rounded-lg"} border ${active ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>

                                                    {active && (
                                                        <Check
                                                            size={15}
                                                            strokeWidth={3}
                                                        />
                                                    )}
                                                </span>
                                                <span className="font-bold">
                                                    {option.label}
                                                </span>
                                            </button>

                                        );
                                    },
                                )}
                            </div>

                            {errorMessage && (
                                <p className="mt-4 text-center text-sm font-semibold text-red-500">
                                    {errorMessage}
                                </p>

                            )}

                            <button
                                type="button"
                                disabled={
                                    voting ||
                                    selected.length === 0
                                }
                                onClick={() =>
                                    void handleVote()
                                }
                                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >

                                {voting ? (
                                    <LoaderCircle
                                        size={19}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Vote size={19} />
                                )}

                                {voting
                                    ? "Vote..."
                                    : "Voter"}
                            </button>


                            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                                <LockKeyhole size={14} />
                                Aucun compte TellMe nécessaire

                            </div>

                        </div>

                    </div>

                ) : (

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl dark:bg-emerald-950/30">
                            ✓
                        </div>

                        <h2 className="mt-4 text-center text-2xl font-black">
                            Vote enregistré
                        </h2>

                        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                            Merci pour ta participation
                        </p>

                                                    {/*les results montrés aux externes */}
                        {buzz.show_results_after_vote &&
                            results.length > 0 && (

                                <div className="mt-7 space-y-4">

                                    {results.map(
                                        (result) => {

                                            const percentage =
                                                totalVotes > 0
                                                    ? Math.round(
                                                        (
                                                            result.votes /
                                                            totalVotes
                                                        ) *
                                                        100,
                                                    )
                                                    : 0;

                                            return (

                                                <div
                                                    key={result.option_id}
                                                >

                                                    <div className="mb-2 flex items-center justify-between text-sm">

                                                    <span className="font-bold">
                                                        {result.label}
                                                    </span>

                                                        <span className="font-black text-sky-500">
                                                        {percentage}%
                                                    </span>

                                                    </div>

                                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                                                        <div
                                                            className="h-full rounded-full bg-sky-500 transition-all duration-700"
                                                            style={{
                                                                width:
                                                                    `${percentage}%`,
                                                            }}
                                                        />

                                                    </div>

                                                </div>

                                            );

                                        },
                                    )}

                                    <p className="pt-2 text-center text-xs font-semibold text-slate-400">
                                        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                                    </p>

                                </div>

                            )}


                        {buzz.group_id &&
                            buzz.group_invite_code && (

                                <div className="mt-8 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">

                                    <div className="flex items-center gap-3">

                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-500 dark:bg-sky-950/50">
                                            <MessageCircle size={20}/>
                                        </div>

                                        <div>
                                            <p className="text-xl font-bold text-slate-400">
                                                La discussion continue dans:
                                                <span
                                                    className="text-xl font-bold text-slate-800"> {buzz.group_name}</span>
                                            </p>
                                        </div>

                                    </div>

                                    <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                        Ce Buzz vient d'un groupe TellMe. Rejoins la discussion pour voir ce que les
                                        autres en pensent.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                `/join/${buzz.group_invite_code}`,
                                            )
                                        }
                                        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white transition hover:bg-sky-600"
                                    >
                                        Rejoindre le groupe
                                        <ArrowRight size={18}/>

                                    </button>
                                    <button className="mt-5 pb-2 pt-1 flex  w-full text-center justify-center gap-2 rounded-2xl bg-gray-500 font-bold text-green-500" onClick={() =>
                                        navigate(`/welcome`)}>
                                        Rejoins TellMe et partage des moments fun
                                    </button>
                                </div>

                            )}

                    </div>

                )}

            </section>

        </main>

    );
}