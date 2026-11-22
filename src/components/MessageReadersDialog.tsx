import { useEffect, useRef, useState } from "react";
import { CheckCheck, Clock3, X } from "lucide-react";
import { getLocale, t } from "../i18n/runtime";
import { getMessageRecipients, type MessageRecipient } from "../services/receipts";

export default function MessageReadersDialog({ messageId, revision, onClose }: { messageId: string; revision: number; onClose: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [rows, setRows] = useState<MessageRecipient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => { dialog.current?.showModal(); }, []);
    useEffect(() => {
        let active = true;
        getMessageRecipients(messageId).then(data => { if (active) { setRows(data); setError(false); } })
            .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [messageId, revision, retry]);
    const sections = [
        { label: t("Lu par"), rows: rows.filter(row => row.isRead), kind: "read" },
        { label: t("Reçu par"), rows: rows.filter(row => !row.isRead && row.deliveredAt), kind: "delivered" },
        { label: t("En attente de réception"), rows: rows.filter(row => !row.isRead && !row.deliveredAt), kind: "pending" },
    ];
    return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="message-info-title"
        onClick={event => { if (event.target === event.currentTarget) onClose(); }}
        className="m-auto max-h-[min(80dvh,640px)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
        <header className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-inherit px-5 py-4 dark:border-slate-800">
            <h2 id="message-info-title" className="font-semibold">{t("Informations du message")}</h2>
            <button type="button" onClick={onClose} aria-label={t("Fermer")} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20}/></button>
        </header>
        <div className="p-5" aria-live="polite">
            {loading ? <p className="py-8 text-center text-sm text-slate-500">{t("Chargement...")}</p> : error ? <div className="py-6 text-center text-sm"><p>{t("Impossible de charger les lecteurs.")}</p><button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 font-medium text-sky-600">{t("Réessayer")}</button></div> : <>
                {sections.map(section => <section key={section.kind} className="mb-5 last:mb-0">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {section.kind === "pending" ? <Clock3 size={15}/> : <CheckCheck size={16} className={section.kind === "read" ? "text-sky-600" : ""}/>}{section.label}
                    </h3>
                    {section.rows.length ? <ul className="space-y-3">{section.rows.map(row => <li key={row.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(row.color) ? row.color : "#64748B" }}>{Array.from(row.name)[0]?.toUpperCase()}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
                        {(row.readAt || row.deliveredAt) && <time className="text-xs text-slate-400">{new Date(row.readAt || row.deliveredAt!).toLocaleTimeString(getLocale(), { hour: "2-digit", minute: "2-digit" })}</time>}
                    </li>)}</ul> : <p className="text-sm text-slate-400">{section.kind === "read" ? t("Pas encore lu") : "—"}</p>}
                </section>)}
            </>}
        </div>
    </dialog>;
}
