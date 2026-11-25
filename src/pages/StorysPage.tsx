import StorytimesSection from "../components/StorytimesSection";

export default function StorysPage() {
    return (
        <main className="tellme-tab-surface min-h-full bg-slate-50 pb-8 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            <div className="mx-auto max-w-4xl px-4 pt-3 sm:px-6">
                <StorytimesSection />
            </div>
        </main>
    );
}
