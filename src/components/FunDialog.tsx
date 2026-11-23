import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { t } from "../i18n/runtime";

export default function FunDialog({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
    const ref = useRef<HTMLDialogElement>(null);
    const headingId = useId();
    useEffect(() => { ref.current?.showModal(); }, []);
    return (
        <dialog ref={ref} aria-labelledby={headingId}
            onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}
            onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }}
            className="fun-dialog m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl bg-slate-50 p-0 text-slate-900
                shadow-xl backdrop:bg-slate-950/60 dark:bg-slate-900 dark:text-slate-100">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-inherit px-5 py-4">
                <h2 id={headingId} className="text-lg font-semibold">{title}</h2>
                <button type="button" disabled={busy} onClick={onClose} aria-label={t("Fermer")} className="rounded-lg p-2 text-slate-500 dark:text-slate-300">
                    <X size={21} />
                </button>
            </header>
            <div className="px-5 pb-5">{children}</div>
        </dialog>
    );
}
