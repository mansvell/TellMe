import {
    ArrowLeft,
    ChevronRight,
    Bell,
    Languages,
    UserPen,
    Palette,
    Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import BottomNavigation from "../components/BottomNavigation.tsx";

export default function SettingsPage() {

    const colors = [
        "#0EA5E9",
        "#22C55E",
        "#F97316",
        "#EC4899",
        "#8B5CF6",
        "#64748B",
    ];

    return (

        <main className="min-h-screen bg-slate-100 py-12">

            <header className="fixed top-0 left-0 right-0 bg-white shadow-sm">

                <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-5">

                    <Link to="/home">

                        <ArrowLeft/>

                    </Link>

                    <h1 className="text-xl font-bold">
                        Paramètres
                    </h1>

                </div>

            </header>

            <section className="mx-auto max-w-4xl space-y-6 p-5">

                <div className="rounded-3xl bg-white shadow-sm overflow-hidden">

                    <Row
                        icon={<UserPen size={21}/>}
                        title="Pseudo"
                        value="Mansvell"
                    />

                    <div className="px-6 pb-5 text-sm text-slate-500">

                        Tu pourras modifier ton pseudo dans
                        <span className="font-semibold text-sky-600">
                            {" "}4 jours
                        </span>

                    </div>

                </div>

                {/* Couleur */}

                <div className="rounded-3xl bg-white p-6 shadow-sm">

                    <div className="flex items-center gap-3">

                        <Palette
                            className="text-sky-500"
                            size={22}
                        />

                        <h2 className="font-bold">
                            Couleur par défaut
                        </h2>

                    </div>

                    <div className="grid grid-cols-6 gap-4 mt-6">

                        {colors.map(color => (

                            <button
                                key={color}
                                style={{background:color}}
                                className="aspect-square rounded-full border-4 border-white shadow hover:scale-105 transition"
                            />

                        ))}

                    </div>

                </div>

                {/* Notifications */}

                <div className="rounded-3xl bg-white shadow-sm overflow-hidden">

                    <SwitchRow
                        icon={<Bell size={21}/>}
                        title="Notifications"
                        checked={true}
                    />

                </div>

                <div className="rounded-3xl bg-white shadow-sm overflow-hidden">

                    <Row
                        disabled
                        icon={<Languages size={21} />}
                        title="Langue"
                        value="Bientôt"
                    />

                </div>

                <div className="rounded-3xl bg-white shadow-sm overflow-hidden">

                    <SwitchRow
                        icon={<Shield size={21}/>}
                        title="Autoriser les invitations"
                        checked={true}
                    />

                </div>

                {/* A propos */}

                <div className="rounded-3xl bg-white shadow-sm overflow-hidden">

                    <Row
                        title="Version"
                        value="1.0.0"
                    />

                    <Row
                        title="Conditions d'utilisation"
                    />

                    <Row
                        title="Politique de confidentialité"
                    />

                </div>

                <BottomNavigation active="settings"/>

            </section>

        </main>

    );

}

type RowProps = {
    icon?: React.ReactNode;
    title: string;
    value?: string;
    disabled?: boolean;
};

function Row({
                 icon,
                 title,
                 value,
                 disabled = false,
             }: RowProps) {

    return (

        <button
            disabled={disabled}
            className={`w-full flex items-center justify-between px-6 py-5 border-b last:border-0 transition ${
                disabled
                    ? "cursor-not-allowed bg-slate-50 text-slate-400"
                    : "hover:bg-slate-50"
            }`}
        >

            <div className="flex items-center gap-4">

                {icon && (

                    <div className={disabled ? "text-slate-300" : "text-sky-500"}>

                        {icon}

                    </div>

                )}

                <span className="font-medium">

                    {title}

                </span>

            </div>

            <div className="flex items-center gap-3">

                {value && (

                    <span>

                        {value}

                    </span>

                )}

                {!disabled && (

                    <ChevronRight
                        size={18}
                        className="text-slate-400"
                    />

                )}

            </div>

        </button>

    );

}

type SwitchProps={
    icon:React.ReactNode;
    title:string;
    checked:boolean;
}

function SwitchRow({ icon, title, checked }: SwitchProps) {

    const [enabled, setEnabled] = useState(checked);

    return (

        <div className="flex items-center justify-between px-6 py-5">

            <div className="flex items-center gap-4">

                <div className="text-sky-500">

                    {icon}

                </div>

                <span className="font-medium">

                    {title}

                </span>

            </div>

            <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative h-8 w-14 rounded-full transition-all duration-300 ${
                    enabled
                        ? "bg-sky-500"
                        : "bg-slate-300"
                }`}
            >

                <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${
                        enabled
                            ? "left-7"
                            : "left-1"
                    }`}
                />

            </button>

        </div>

    );

}