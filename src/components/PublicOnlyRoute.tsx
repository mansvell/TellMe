import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";


type PublicOnlyRouteProps = {
    children: React.ReactNode;
};


export default function PublicOnlyRoute({
                                            children,
                                        }: PublicOnlyRouteProps) {

    const [loading, setLoading] = useState(true);

    const [authenticated, setAuthenticated] =
        useState(false);


    // Vérifie si l'utilisateur possède déjà une session.
    useEffect(() => {

        let active = true;


        async function checkSession() {

            const {
                data: { session },
            } = await supabase.auth.getSession();


            if (!active) {
                return;
            }


            setAuthenticated(
                session !== null,
            );

            setLoading(false);
        }


        void checkSession();


        return () => {
            active = false;
        };

    }, []);


    if (loading) {
        return null;
    }


    // Utilisateur déjà connecté → Home.
    if (authenticated) {

        return (
            <Navigate
                to="/home"
                replace
            />
        );
    }


    return children;
}