import { Check, CheckCheck, Clock3 } from "lucide-react";
import { t } from "../i18n/runtime";
import type { ReceiptSummary } from "../services/receipts";

function receiptState(receipt?: ReceiptSummary): "sent" | "delivered" | "read" {
    if (receipt?.expected && receipt.read >= receipt.expected) return "read";
    if (receipt?.expected && receipt.delivered >= receipt.expected) return "delivered";
    return "sent";
}

export default function MessageStatus({ pending, receipt, onClick, onDark = false }: { pending?: boolean; receipt?: ReceiptSummary; onClick?: () => void; onDark?: boolean }) {
    if (pending) return <span className="inline-flex" aria-label={t("Envoi en cours")}><Clock3 size={14}/></span>;
    const status = receiptState(receipt);
    const label = status === "read" ? t("Lu par tous") : status === "delivered" ? t("Reçu par tous") : t("Envoyé");
    return <button type="button" onClick={onClick} aria-label={`${label} · ${t("Informations du message")}`} title={label}
        className={`inline-flex min-h-6 min-w-7 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${status === "read" ? onDark ? "text-sky-200" : "text-sky-900" : onDark ? "text-white/70" : "text-slate-700/75"}`}>
        {status === "sent" ? <Check size={16} strokeWidth={2}/> : <CheckCheck size={17} strokeWidth={2}/>}
    </button>;
}
