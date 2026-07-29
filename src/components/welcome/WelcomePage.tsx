import { motion } from "motion/react";
import { ArrowRight, Users, ShieldCheck, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TellMeLogo from "../../components/common/TellMeLogo";

export default function WelcomePage() {
    const navigate = useNavigate();

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100">

            {/* Background */}
            <div className="absolute -top-52 -left-40 w-96 h-96 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="absolute -bottom-44 -right-40 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />

            <div className="relative z-10 flex min-h-screen flex-col px-6">

                {/* Logo */}
                <div className="flex-1 flex items-center justify-center">

                    <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: .7 }}
                        className="text-center"
                    >

                        <motion.div
                            animate={{
                                y: [0, -8, 0]
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity
                            }}
                        >
                            <TellMeLogo size={120} />
                        </motion.div>

                        <h2 className="mt-8 text-4xl font-black text-slate-900">
                            Des conversations
                            <br />
                            authentiques.
                        </h2>

                        <p className="mt-4 text-slate-500 max-w-sm mx-auto">
                            Crée des groupes privés,
                            invite tes proches et échange librement.
                        </p>

                    </motion.div>

                </div>

                {/* Features */}

                <div className="space-y-5 mb-10">

                    <Feature
                        icon={<Users size={22} />}
                        title="Groupes privés"
                        subtitle="Invite qui tu veux."
                    />

                    <Feature
                        icon={<ShieldCheck size={22} />}
                        title="Discussions sécurisées"
                        subtitle="Tes échanges restent privés."
                    />

                    <Feature
                        icon={<Bell size={22} />}
                        title="Notifications instantanées"
                        subtitle="Ne manque jamais un message."
                    />

                </div>

                {/* Button */}

                <motion.button
                    whileTap={{ scale: .97 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate("/register")}
                    className="mb-10 h-16 rounded-2xl bg-sky-500 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3"
                >
                    Commencer
                    <ArrowRight size={22}/>
                </motion.button>

            </div>

        </main>
    );
}

type FeatureProps = {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}

function Feature({icon,title,subtitle}:FeatureProps){

    return(

        <motion.div
            initial={{opacity:0,x:-20}}
            animate={{opacity:1,x:0}}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-sm flex gap-4 items-center"
        >

            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                {icon}
            </div>

            <div>

                <h3 className="font-bold text-slate-800">
                    {title}
                </h3>

                <p className="text-sm text-slate-500">
                    {subtitle}
                </p>

            </div>

        </motion.div>

    )

}