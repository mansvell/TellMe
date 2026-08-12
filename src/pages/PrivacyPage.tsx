import {
    ArrowLeft,
    Database,
    EyeOff,
    LockKeyhole,
    ShieldCheck,
    UserRoundX,
} from "lucide-react";

import { Link } from "react-router-dom";


export default function PrivacyPage() {

    return (

        <main className="min-h-screen bg-slate-100 pb-10 dark:bg-slate-950">

            {/* Header */}

            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">

                <div className="mx-auto flex h-16 max-w-3xl items-center px-5">

                    <Link
                        to="/settings"
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft
                            size={21}
                            className="text-slate-700 dark:text-slate-200"
                        />
                    </Link>


                    <h1 className="ml-3 text-lg font-bold text-slate-900 dark:text-white">
                        Politique de confidentialité
                    </h1>

                </div>

            </header>


            <section className="mx-auto max-w-3xl space-y-5 p-5">

                {/* Introduction */}

                <div className="rounded-[2rem] bg-sky-500 p-7 text-white shadow-sm">

                    <ShieldCheck
                        size={34}
                    />

                    <h2 className="mt-5 text-2xl font-black">
                        Ta vie privée compte.
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">
                        TellMe est conçu pour permettre des discussions
                        simples et anonymes tout en limitant les informations
                        personnelles visibles par les autres membres.
                    </p>

                </div>


                <PrivacyCard
                    icon={
                        <EyeOff size={21}/>
                    }
                    title="Anonymat"
                >
                    Les autres membres d'un groupe voient uniquement
                    ton pseudo utilisé dans la conversation. Ton adresse
                    e-mail et ton identifiant technique ne sont pas affichés
                    aux autres utilisateurs.
                </PrivacyCard>


                <PrivacyCard
                    icon={
                        <UserRoundX size={21}/>
                    }
                    title="Rôles privés"
                >
                    Les rôles techniques utilisés pour administrer un groupe
                    ne sont pas affichés publiquement dans la liste des
                    membres. Cela permet de conserver le fonctionnement
                    anonyme de TellMe.
                </PrivacyCard>


                <PrivacyCard
                    icon={
                        <Database size={21}/>
                    }
                    title="Données"
                >
                    Certaines informations sont nécessaires au fonctionnement
                    de l'application, notamment ton compte, tes appartenances
                    aux groupes, tes messages et tes préférences.
                </PrivacyCard>


                <PrivacyCard
                    icon={
                        <LockKeyhole size={21}/>
                    }
                    title="Accès aux groupes"
                >
                    Un groupe n'est accessible qu'aux utilisateurs qui en
                    sont membres. Un utilisateur peut notamment rejoindre un
                    groupe grâce à un lien d'invitation valide.
                </PrivacyCard>


                <p className="px-2 text-center text-xs leading-5 text-slate-400">
                    Cette page présente les principes de confidentialité
                    intégrés à TellMe. Une politique juridique complète devra
                    être adaptée avant une publication publique de
                    l'application.
                </p>

            </section>

        </main>
    );
}


// Carte d'information.
function PrivacyCard({
                         icon,
                         title,
                         children,
                     }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {

    return (

        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900">

            <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 dark:bg-sky-950/40">

                    {icon}

                </div>


                <h2 className="font-bold text-slate-900 dark:text-white">
                    {title}
                </h2>

            </div>


            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {children}
            </p>

        </div>
    );
}