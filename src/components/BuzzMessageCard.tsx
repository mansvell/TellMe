import { Check, Flame, LoaderCircle, Vote } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChatBuzz } from "../services/messages";
import { voteBuzz } from "../services/buzz";
import { supabase } from "../lib/supabase";

type Props = {
    buzz: ChatBuzz;
};

type Result = {
    option_id: string;
    votes: number;
};

export default function BuzzMessageCard({ buzz }: Props) {
    const [selected, setSelected] = useState<string[]>([]);
    const [hasVoted, setHasVoted] = useState(false);
    const [results, setResults] = useState<Result[]>([]);
    const [voting, setVoting] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadVote() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data: vote, error } = await supabase
                .from("buzz_votes")
                .select(`
                    id,
                    buzz_vote_choices (
                        option_id
                    )
                `)
                .eq("buzz_id", buzz.id)
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) {
                console.error("Buzz vote loading error:", error);
                return;
            }

            if (!active || !vote) return;

            setHasVoted(true);
            setSelected(
                (vote.buzz_vote_choices ?? []).map(
                    (choice) => choice.option_id,
                ),
            );

            await loadResults();
        }

        async function loadResults() {
            const { data, error } = await supabase
                .from("buzz_vote_choices")
                .select(`
                    option_id,
                    buzz_votes!inner (
                        buzz_id
                    )
                `)
                .eq("buzz_votes.buzz_id", buzz.id);

            if (error) {
                console.error("Buzz results loading error:", error);
                return;
            }

            if (!active) return;

            const counts = new Map<string, number>();

            for (const choice of data ?? []) {
                counts.set(
                    choice.option_id,
                    (counts.get(choice.option_id) ?? 0) + 1,
                );
            }

            setResults(
                Array.from(counts.entries()).map(
                    ([option_id, votes]) => ({
                        option_id,
                        votes,
                    }),
                ),
            );
        }

        void loadVote();

        return () => {
            active = false;
        };
    }, [buzz.id]);

    function selectOption(optionId: string) {
        if (hasVoted) return;

        if (buzz.vote_type === "single") {
            setSelected([optionId]);
            return;
        }

        setSelected((current) =>
            current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId],
        );
    }

    async function handleVote() {
        if (selected.length === 0 || voting || hasVoted) return;

        try {
            setVoting(true);

            await voteBuzz(
                buzz.id,
                selected,
            );

            setHasVoted(true);

            const { data, error } = await supabase
                .from("buzz_vote_choices")
                .select(`
                    option_id,
                    buzz_votes!inner (
                        buzz_id
                    )
                `)
                .eq("buzz_votes.buzz_id", buzz.id);

            if (error) throw error;

            const counts = new Map<string, number>();

            for (const choice of data ?? []) {
                counts.set(
                    choice.option_id,
                    (counts.get(choice.option_id) ?? 0) + 1,
                );
            }

            setResults(
                Array.from(counts.entries()).map(
                    ([option_id, votes]) => ({
                        option_id,
                        votes,
                    }),
                ),
            );
        } catch (error) {
            console.error("Buzz vote error:", error);
        } finally {
            setVoting(false);
        }
    }

    const totalVotes = results.reduce(
        (total, result) => total + result.votes,
        0,
    );

    function getVotes(optionId: string) {
        return results.find(
            (result) => result.option_id === optionId,
        )?.votes ?? 0;
    }

    return (
        <div className="mx-auto my-4 w-full max-w-xl overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400 px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                    <Flame size={19} />
                    <span className="text-xs font-black tracking-[0.18em]">
                        TELLME BUZZ
                    </span>
                </div>

                <h3 className="mt-3 text-xl font-black leading-snug">
                    {buzz.question}
                </h3>
            </div>

            <div className="p-4 sm:p-5">
                <div className="space-y-2.5">
                    {buzz.options.map((option) => {
                        const isSelected = selected.includes(option.id);
                        const votes = getVotes(option.id);

                        const percentage =
                            totalVotes > 0
                                ? Math.round((votes / totalVotes) * 100)
                                : 0;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={!buzz.is_active || hasVoted}
                                onClick={() => selectOption(option.id)}
                                className={`relative w-full overflow-hidden rounded-2xl border text-left transition ${
                                    isSelected
                                        ? "border-sky-500"
                                        : "border-slate-200 dark:border-slate-700"
                                }`}
                            >
                                {hasVoted && (
                                    <div
                                        className="absolute inset-y-0 left-0 bg-sky-100 transition-all duration-500 dark:bg-sky-900/40"
                                        style={{
                                            width: `${percentage}%`,
                                        }}
                                    />
                                )}

                                <div className="relative flex items-center gap-3 px-4 py-3.5">
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center ${buzz.vote_type === "single" ? "rounded-full" : "rounded-lg"} border ${isSelected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                                        {isSelected && (
                                            <Check size={14} strokeWidth={3} />
                                        )}
                                    </span>

                                    <span className="min-w-0 flex-1 font-semibold text-slate-700 dark:text-slate-200">
                                        {option.label}
                                    </span>

                                    {hasVoted && (
                                        <span className="font-black text-sky-600 dark:text-sky-400">
                                            {percentage}%
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {!hasVoted ? (
                    <button
                        type="button"
                        onClick={() => void handleVote()}
                        disabled={!buzz.is_active || selected.length === 0 || voting}
                        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {voting ? (
                            <LoaderCircle size={18} className="animate-spin" />
                        ) : (
                            <Vote size={18} />
                        )}

                        {voting ? "Vote..." : "Voter"}
                    </button>
                ) : (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="font-bold text-emerald-500">
                            ✓ Vote enregistré
                        </span>

                        <span className="font-semibold text-slate-400">
                            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                        </span>
                    </div>
                )}

                {!hasVoted && (
                    <p className="mt-3 text-center text-xs font-medium text-slate-400">
                        {buzz.vote_type === "single"
                            ? "Une seule réponse autorisée"
                            : "Plusieurs réponses autorisées"}
                    </p>
                )}
            </div>
        </div>
    );
}