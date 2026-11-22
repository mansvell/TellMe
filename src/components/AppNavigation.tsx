import { Flame, House, MailPlus, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { t } from "../i18n/runtime";

export default function AppNavigation() {
    const { pathname } = useLocation();
    const current = pathname.toLowerCase().replace(/\/$/, "");
    const items = [
        { to: "/invit", title: t("Invitations"), icon: MailPlus },
        { to: "/home", title: t("Accueil"), icon: House },
        { to: "/buzz", title: "Buzz", icon: Flame },
        { to: "/settings", title: t("Paramètres"), icon: Settings },
    ];

    return (
        <nav aria-label={t("Navigation principale")}
            className="order-last shrink-0 overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] dark:bg-slate-800
                md:order-none md:w-26 md:bg-slate-100 md:pb-3 md:pt-3 md:dark:bg-slate-900">
            <ul className="mx-auto grid min-h-17 max-w-2xl grid-cols-4 items-center gap-1 px-1 py-2 md:grid-cols-1 md:gap-2 md:px-2">
                {items.map(({ to, title, icon: Icon }) => {
                    const active = current === to || (to === "/invit" && current === "/discover");
                    return (
                        <li key={to} className="min-w-0">
                            <Link to={to} aria-current={active ? (current === to ? "page" : "location") : undefined}
                                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-xs font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-600 ${active
                                    ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-sky-300"}`}>
                                <Icon size={22} aria-hidden="true" />
                                {title}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
