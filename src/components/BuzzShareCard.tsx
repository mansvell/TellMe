import { forwardRef } from "react";
import { Flame } from "lucide-react";
import icon from "../assets/icon.png";

type Props = {
    message?: string;
};

const BuzzShareCard = forwardRef<HTMLDivElement, Props>(
    (
        {
            message = "J'ai quelque chose de hot pour toi",
        },
        ref,
    ) => {
        return (
            <div
                ref={ref}
                className="relative aspect-[9/16] w-[360px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-white shadow-2xl"
            >
            <div className="absolute -left-24 top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-24 bottom-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative flex h-full flex-col items-center px-8 py-10 text-center">
                <div className="flex flex-col items-center">
                    <img
                        src={icon}
                        alt="TellMe"
                        className="h-24 w-24 object-contain drop-shadow-xl"
                    />

                    <span className="mt-1 text-2xl font-black tracking-tight">
                        TellMe
                    </span>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
                        <Flame size={27} />
                    </div>

                    <h2 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight">
                        {message}
                        <span className="ml-2">🔥</span>
                    </h2>

                    <p className="mt-5 text-xl font-bold text-sky-50">
                        Clique et découvre
                    </p>
                </div>

                <div className="flex flex-col items-center">
                    <div className="flex items-end gap-6 text-5xl font-light text-white/90">
                        <span >↓</span>
                        <span >↓</span>
                        <span>↓</span>
                    </div>

                </div>
            </div>
        </div>
        );
    },
);

BuzzShareCard.displayName = "BuzzShareCard";

export default BuzzShareCard;