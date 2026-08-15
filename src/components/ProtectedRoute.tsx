import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";


type ProtectedRouteProps = {
    children: React.ReactNode;
};


export default function ProtectedRoute({
                                           children,
                                       }: ProtectedRouteProps) {

    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    //Vérifie si une session Supabase existe
    useEffect(() => {

        let active = true;

        async function checkSession() {
            try {

                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (!active) {
                    return;
                }

                if (error) {
                    console.error(
                        "Session check error:",
                        error,
                    );
                    setAuthenticated(false);

                    return;
                }

                setAuthenticated(
                    session !== null,
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void checkSession();
        //Écoute aussi les changements de session
        const {
            data: {
                subscription,
            },
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {

                if (!active) {
                    return;
                }

                setAuthenticated(
                    session !== null,
                );
                setLoading(false);
            },
        );

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    // Attend la vérification Supabase.
    if (loading) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">

                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500 dark:border-slate-800 dark:border-t-sky-500" />

                    <p className="text-sm font-medium text-slate-400">
                        Chargement...
                    </p>
                </div>
            </main>
        );
    }

    //Sans session → Welcome
    if (!authenticated) {

        return (
            <Navigate
                to="/welcome"
                replace
            />
        );
    }

    //Session valide → affiche la page
    return children;
}