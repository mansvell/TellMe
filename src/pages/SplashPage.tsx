import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import splashlogo from "../assets/Logo.png";


export default function SplashPage() {

    const navigate = useNavigate();

    //Vérifie la session pendant l'affichage du Splash.
    useEffect(() => {

        let active = true;


        async function initializeApp() {

            //Garde le Splash visible un minimum de temps
            const splashDelay =
                new Promise((resolve) =>
                    window.setTimeout(
                        resolve,
                        1800,
                    ),
                );


            //Vérifie la session enregistrée
            const sessionRequest =
                supabase.auth.getSession();


            const [
                ,
                sessionResult,
            ] = await Promise.all([
                splashDelay,
                sessionRequest,
            ]);

            if (!active) {
                return;
            }

            if (sessionResult.data.session) {

                navigate(
                    "/home",
                    {
                        replace: true,
                    },
                );
                return;
            }

            navigate(
                "/welcome",
                {
                    replace: true,
                },
            );
        }


        void initializeApp();


        return () => {
            active = false;
        };

    }, [navigate]);


    return (

        <main className="fixed inset-0 overflow-hidden bg-white dark:bg-slate-950">

            <img
                src={splashlogo}
                alt="TellMe"
                draggable={false}
                className="h-full w-full object-cover"
            />

        </main>

    );
}