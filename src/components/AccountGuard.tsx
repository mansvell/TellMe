import icon from "../assets/icon.png";
import { setDevicePreference } from "../mobile/storage";
import { t } from "../i18n/runtime";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ACCOUNT_KEY = "tellme-known-account";
type Status = "checking" | "allowed" | "missing" | "error";

// Une session locale peut survivre à la suppression du compte sur Supabase.
// Ce contrôle couvre aussi les liens directs et les pages publiques.
export default function AccountGuard({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const [status, setStatus] = useState<Status>("checking");
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        let running = false;
        const update = (status: Status) => {
            if (active) setStatus(current => current === "allowed" && status === "error" ? current : status);
        };
        async function checkAccount() {
            if (running) return;
            running = true;
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (!session) {
                    update(localStorage.getItem(ACCOUNT_KEY) ? "missing" : "allowed");
                    return;
                }
                // L'inscription crée d'abord la session, puis le profil.
                if (pathname === "/register" && !localStorage.getItem(ACCOUNT_KEY)) {
                    update("allowed");
                    return;
                }
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    if ([401, 403].includes(userError.status ?? 0) ||
                        ["user_not_found", "session_not_found", "refresh_token_not_found", "refresh_token_already_used"].includes(userError.code ?? "")) {
                        setDevicePreference(ACCOUNT_KEY, session.user.id);
                        update("missing");
                        return;
                    }
                    throw userError;
                }
                if (!user) { update("missing"); return; }
                const { data: profile, error: profileError } = await supabase
                    .from("profiles").select("id").eq("id", user.id).maybeSingle();
                if (profileError) throw profileError;
                setDevicePreference(ACCOUNT_KEY, user.id);
                update(profile ? "allowed" : "missing");
            } catch (error) {
                const authError = error as { status?: number; code?: string } | null;
                const missing = [401, 403].includes(authError?.status ?? 0) ||
                    ["user_not_found", "session_not_found", "refresh_token_not_found", "refresh_token_already_used"].includes(authError?.code ?? "");
                // Une panne réseau ne signifie pas que le compte a été supprimé.
                update(missing ? "missing" : "error");
            } finally {
                running = false;
            }
        }
        void checkAccount();
        const onFocus = () => { void checkAccount(); };
        const onVisibility = () => {
            if (document.visibilityState === "visible") void checkAccount();
        };
        const interval = window.setInterval(onVisibility, 30_000);
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibility);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            // Ne pas appeler une méthode Auth à l'intérieur du callback Auth.
            window.setTimeout(() => { if (active) void checkAccount(); }, 0);
        });
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisibility);
            subscription.unsubscribe();
        };
    }, [pathname, retry]);

    if (status === "allowed") return children;
    // Un seul chargement initial. Les vérifications de navigation restent en arrière-plan.
    if (status === "checking") return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950" aria-label={t("Chargement...")}>
            <img src={icon} alt="TellMe" className="h-20 w-20 animate-pulse object-contain" />
        </main>
    );
    return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 text-center text-slate-900 dark:bg-slate-950 dark:text-white">
            <div className="max-w-sm" role="status" aria-live="polite">
                <h1 className="text-2xl font-bold">
                    {status === "missing" ? t("Ce compte est introuvable.") :
                        t("Impossible de vérifier ton compte.")}
                </h1>
                {status === "error" && <>
                    <p className="mt-3 text-slate-500">{t("Vérifie ta connexion et réessaie.")}</p>
                    <button type="button" className="mt-5 rounded-xl bg-sky-500 px-5 py-3 font-bold text-white"
                        onClick={() => setRetry((value) => value + 1)}>{t("Réessayer")}</button>
                </>}
            </div>
        </main>
    );
}
