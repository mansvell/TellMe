import { motion } from "motion/react";

type SplashLogoProps = {
    className?: string;
};

export default function SplashLogo({ className = "" }: SplashLogoProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
            }}
            className={`flex flex-col items-center ${className}`}
        >

            <div className="w-28 h-28 rounded-full bg-sky-500 shadow-xl flex items-center justify-center">
                <span className="text-5xl">👍</span>
            </div>

            <h1 className="mt-8 text-5xl font-extrabold tracking-tight">
                <span className="text-slate-900">Tell</span>
                <span className="text-sky-500">Me</span>
            </h1>

            <p className="mt-3 text-slate-500 text-center text-lg">
                Le vrai. Le bon.
                <br />
                Ta liberté d'expression.
            </p>
        </motion.div>
    );
}