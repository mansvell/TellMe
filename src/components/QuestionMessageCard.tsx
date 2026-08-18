import { MessageCircle, Sparkles } from "lucide-react";
//carte de Question envoyé dans les groupes

type Props = {
    question: string;
};

export default function QuestionMessageCard({
                                                question,
                                            }: Props) {
    return (
        <div className="my-5 flex w-full justify-center px-3">
            <div className="group relative w-full max-w-md overflow-hidden rounded-[2rem] border border-sky-200/70 bg-gradient-to-br from-sky-500 via-sky-500 to-cyan-400 p-[1px] shadow-xl shadow-sky-500/10 dark:border-sky-800/50">
                <div className="relative overflow-hidden rounded-[1.95rem] bg-white p-6 text-center dark:bg-slate-900">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-100 blur-3xl dark:bg-sky-900/30" />

                    <div className="relative">

                        <div className="mt-3 flex items-center justify-center gap-1.5">
                            <Sparkles
                                size={13}
                                className="text-sky-500"
                            />

                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-500">
                                Question TellMe
                            </p>

                            <Sparkles
                                size={13}
                                className="text-sky-500"
                            />
                        </div>

                        <p className="mx-auto mt-4 max-w-sm text-lg font-black leading-7 text-slate-900 dark:text-white">
                            {question}
                        </p>

                        <div className="mx-auto my-5 h-px w-40 bg-gradient-to-r from-transparent via-sky-300 to-transparent dark:via-sky-700" />

                        <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                            <MessageCircle
                                size={16}
                                className="text-sky-500"
                            />

                            Répondre dans le chat
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}