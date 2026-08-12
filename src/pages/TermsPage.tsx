import {
    ArrowLeft,
    Ban,
    FileText,
    MessageCircle,
    ShieldCheck,
    Users,
} from "lucide-react";
import {useNavigate} from "react-router-dom";


export default function TermsPage() {

    const navigate = useNavigate();
    return (

        <main className="min-h-screen bg-slate-100 pb-10 dark:bg-slate-950">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">

                <div className="mx-auto flex h-16 max-w-3xl items-center px-5">

                    <button onClick={() => navigate(-1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft
                            size={21}
                            className="text-slate-700 dark:text-slate-200"
                        />
                    </button>


                    <h1 className="ml-3 text-lg font-bold text-slate-900 dark:text-white">
                        Conditions d'utilisation
                    </h1>

                </div>

            </header>


            <section className="mx-auto max-w-3xl space-y-5 p-5">

                {/* Introduction */}

                <div className="rounded-[2rem] bg-slate-900 p-7 text-white shadow-sm dark:bg-sky-500">

                    <FileText
                        size={34}
                    />

                    <h2 className="mt-5 text-2xl font-black">
                        Utiliser TellMe
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                        TellMe est un espace de discussion anonyme.
                        L'anonymat ne dispense cependant pas chaque
                        utilisateur de respecter les autres membres.
                    </p>

                </div>


                <TermsCard
                    number="01"
                    icon={
                        <Users size={20}/>
                    }
                    title="Respect des membres"
                >
                    Les comportements destinés à harceler, menacer,
                    intimider ou nuire volontairement aux autres
                    utilisateurs ne sont pas autorisés.
                </TermsCard>


                <TermsCard
                    number="02"
                    icon={
                        <MessageCircle size={20}/>
                    }
                    title="Utilisation responsable"
                >
                    Chaque utilisateur reste responsable du contenu qu'il
                    publie et des interactions qu'il engage dans les groupes
                    auxquels il participe.
                </TermsCard>


                <TermsCard
                    number="03"
                    icon={
                        <Ban size={20}/>
                    }
                    title="Contenus interdits"
                >
                    TellMe ne doit pas être utilisé pour diffuser des contenus
                    illégaux ou pour utiliser l'application dans un objectif
                    contraire à la loi.
                </TermsCard>


                <TermsCard
                    number="04"
                    icon={
                        <ShieldCheck size={20}/>
                    }
                    title="Invitations"
                >
                    Chaque utilisateur peut choisir d'autoriser ou non les
                    invitations privées. Ce choix doit être respecté par les
                    autres membres.
                </TermsCard>


                <p className="px-2 text-center text-xs leading-5 text-slate-400">
                    © 2026 TellMe - Tous droits reservés
                </p>

            </section>

        </main>
    );
}


// Carte des conditions.
function TermsCard({
                       number,
                       icon,
                       title,
                       children,
                   }: {
    number: string;
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {

    return (

        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900">

            <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 dark:bg-sky-950/40">

                    {icon}

                </div>


                <div className="min-w-0 flex-1">

                    <div className="flex items-center justify-between gap-4">

                        <h2 className="font-bold text-slate-900 dark:text-white">
                            {title}
                        </h2>


                        <span className="text-xs font-black text-slate-200 dark:text-slate-700">
                            {number}
                        </span>

                    </div>


                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {children}
                    </p>

                </div>

            </div>

        </div>
    );
}