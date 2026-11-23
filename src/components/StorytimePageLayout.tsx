import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { t } from "../i18n/runtime";

export default function StorytimePageLayout({ title, children, busy = false }: { title: string; children: ReactNode; busy?: boolean }) {
    return <main className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <header className="sticky top-0 z-20 bg-slate-50 pt-[env(safe-area-inset-top)] dark:bg-slate-900">
            <div className="mx-auto flex min-h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
                <Link to="/fun" aria-label={t("Retour")} aria-disabled={busy} onClick={event => { if (busy) event.preventDefault(); }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><ArrowLeft size={23} /></Link>
                <h1 className="text-lg font-semibold">{title}</h1>
            </div>
        </header>
        <div className="mx-auto max-w-3xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">{children}</div>
    </main>;
}
