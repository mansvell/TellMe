import { t } from "../i18n/runtime";
import { forwardRef } from "react";
import icon from "../assets/icon.png";

type Props = {
    message?: string;
    footerMessage?: string;
    arrows?: 2 | 3;
};

const BuzzShareCard = forwardRef<HTMLDivElement, Props>(
    (
        {
            message = t("Donne moi ton avis en anonyme sur ce sondage"),
            footerMessage,
            arrows = 3,
        },
        ref,
    ) => {
        return (
            <div
                ref={ref}
                className="relative aspect-[9/16] w-[360px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-300 via-sky-400 to-sky-700 text-white shadow-2xl"
            >

            <div className="relative flex h-full flex-col items-center px-8 py-15 text-center">
                <div className="flex flex-col items-center">
                    <img
                        src={icon}
                        alt="TellMe"
                        className="h-24 w-24 object-contain drop-shadow-xl"
                    />

                    <span className="mt-1 text-4xl font-black tracking-tight">
                        TellMe
                    </span>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center">
                    <h2 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight">
                        {message}
                    </h2>

                    {!footerMessage && <p className="mt-8 text-xl font-bold text-sky-50">
                         {t("Clique et découvre")} </p>}
                </div>

                <div className="flex flex-col items-center">
                    {footerMessage && <p className="mb-3 text-lg font-bold text-sky-50">{footerMessage}</p>}
                    <div className="flex items-end gap-6 text-5xl font-light text-white/90">
                        {Array.from({ length: arrows }, (_, index) => <span key={index}>↓</span>)}
                    </div>

                </div>
            </div>
        </div>
        );
    },
);

BuzzShareCard.displayName = "BuzzShareCard";

export default BuzzShareCard;
