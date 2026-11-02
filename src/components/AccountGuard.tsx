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
    const [result, setResult] = useState<{ path: string; status: Status }>({
        path: pathname, status: "checking",
    });
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        let running = false;
        const update = (status: Status) => {
            if (active) setResult({ path: pathname, status });
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
                        localStorage.setItem(ACCOUNT_KEY, session.user.id);
                        update("missing");
                        return;
                    }
                    throw userError;
                }
                if (!user) { update("missing"); return; }
                const { data: profile, error: profileError } = await supabase
                    .from("profiles").select("id").eq("id", user.id).maybeSingle();
                if (profileError) throw profileError;
                localStorage.setItem(ACCOUNT_KEY, user.id);
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

    const status = result.path === pathname ? result.status : "checking";
    if (status === "allowed") return children;
    return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 text-center text-slate-900 dark:bg-slate-950 dark:text-white">
            <div className="max-w-sm" role="status" aria-live="polite">
                <h1 className="text-2xl font-bold">
                    {status === "missing" ? t("Ce compte est introuvable.") :
                        status === "error" ? t("Impossible de vérifier ton compte.") : t("Vérification du compte…")}
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
