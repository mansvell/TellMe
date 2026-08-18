import { forwardRef } from "react";
import icon from "../assets/icon.png";



const QuestionShareCard = forwardRef<HTMLDivElement>(
    (_, ref) => {
        return (
            <div ref={ref} className="relative aspect-[9/16] w-[360px] overflow-hidden bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-white">
                <div className="absolute -left-24 top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

                <div className="relative flex h-full flex-col items-center px-8 py-15 text-center">
                    <div className="flex flex-col items-center">
                        <img src={icon} alt="TellMe" className="h-24 w-24 object-contain drop-shadow-xl" />

                        <span className="mt-1 text-4xl font-black tracking-tight">
                            ✦ TellMe ✦
                        </span>
                    </div>

                    <div className="flex flex-1 flex-col items-center justify-center">

                        <p className="mt-5 text-xl py-2 font-black  rounded-2xl bg-white text-sky-400">
                            une nouveau sujet palpitant t'attends dans le groupe
                        </p>

                        <p className="mt-6 text-lg font-bold text-sky-50">
                            Come on, and let's have fun!
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="mt-1 text-sm font-bold text-white/80">
                            Rejoins la discussion
                        </p>

                        <div className="mt-3 flex gap-5 text-4xl font-black">
                            <span>↓</span>
                            <span>↓</span>
                            <span>↓</span>
                        </div>


                    </div>
                </div>
            </div>
        );
    },
);

QuestionShareCard.displayName = "QuestionShareCard";

export default QuestionShareCard;