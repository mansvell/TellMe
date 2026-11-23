import { t } from "../i18n/runtime";
import SecretsSection from "../components/SecretsSection";
import StorytimesSection from "../components/StorytimesSection";

export default function FunPage() {
    return (
        <main className="tellme-tab-surface min-h-full bg-slate-50 pb-8 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            <header className="mx-auto max-w-4xl px-4 pb-6 pt-5 sm:px-6">
                <h1 className="text-xl font-bold">Fun</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{t("Découvre des histoires et reçois des messages anonymes.")}</p>
            </header>
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
                <StorytimesSection />
                <SecretsSection />
            </div>
        </main>
    );
}
