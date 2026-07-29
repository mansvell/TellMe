import { motion } from "motion/react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function RegisterPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirm: "",
    });

    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex items-center justify-center px-6 py-10">

            <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8"
            >

                <h1 className="text-4xl font-black text-slate-900">
                    Bienvenue 👋
                </h1>

                <p className="text-slate-500 mt-2">
                    Créons ton compte TellMe.
                </p>

                <div className="space-y-5 mt-8">

                    <Input
                        icon={<User size={20} />}
                        placeholder="Nom"
                        value={form.name}
                        onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                        }
                    />

                    <Input
                        icon={<Mail size={20} />}
                        placeholder="Email"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
                    />

                    <Input
                        icon={<Lock size={20} />}
                        placeholder="Mot de passe"
                        type="password"
                        value={form.password}
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                    />

                    <Input
                        icon={<Lock size={20} />}
                        placeholder="Confirmer le mot de passe"
                        type="password"
                        value={form.confirm}
                        onChange={(e) =>
                            setForm({ ...form, confirm: e.target.value })
                        }
                    />

                </div>

                <button
                    onClick={() => navigate("/profile")}
                    className="mt-8 h-14 w-full rounded-2xl bg-sky-500 hover:bg-sky-600 transition text-white font-bold flex items-center justify-center gap-2"
                >
                    Continuer
                    <ArrowRight size={20} />
                </button>

                <p className="text-center text-sm text-slate-500 mt-6">
                    Déjà un compte ?{" "}
                    <Link
                        to="/login"
                        className="font-semibold text-sky-600"
                    >
                        Se connecter
                    </Link>
                </p>

            </motion.div>

        </main>
    );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    icon: React.ReactNode;
};

function Input({ icon, ...props }: InputProps) {
    return (
        <div className="flex items-center gap-3 h-14 rounded-2xl border border-slate-200 px-4 focus-within:border-sky-500 transition">
            <div className="text-slate-400">{icon}</div>

            <input
                {...props}
                className="flex-1 outline-none bg-transparent"
            />
        </div>
    );
}