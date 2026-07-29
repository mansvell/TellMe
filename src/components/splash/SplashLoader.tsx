import { motion } from "motion/react";

export default function SplashLoader() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
                delay: 0.9,
                duration: 0.4,
            }}
            className="mt-12 flex gap-2"
        >
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-sky-500"
                    animate={{
                        y: [0, -8, 0],
                        opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.18,
                    }}
                />
            ))}
        </motion.div>
    );
}