import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, X } from "lucide-react";
import { t } from "../i18n/runtime";
import { invitationPath } from "../utils/invitations";

export default function JoinInvitation() {
    const navigate = useNavigate();
    const dialog = useRef<HTMLDialogElement>(null);
    const [value, setValue] = useState("");
    const [error, setError] = useState(false);
    useEffect(() => {
        const element = dialog.current;
        const onClose = () => { setValue(""); setError(false); };
        element?.addEventListener("close", onClose);
        return () => element?.removeEventListener("close", onClose);
    }, []);
    function submit(event: FormEvent) {
        event.preventDefault();
        const path = invitationPath(value);
        if (!path) { setError(true); return; }
        dialog.current?.close();
        navigate(path);
    }
    return <>
        <button type="button" onClick={() => dialog.current?.showModal()} title={t("Rejoindre avec un lien")}
            aria-label={t("Rejoindre avec un lien")} className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"><Link2 size={20} /><span className="hidden md:inline">{t("Rejoindre")}</span></button>
        <dialog ref={dialog} aria-labelledby="join-invitation-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 backdrop:bg-black/50 dark:bg-slate-800 dark:text-white">
            <div className="flex items-center justify-between gap-4"><h2 id="join-invitation-title" className="text-lg font-semibold">{t("Rejoindre avec un lien")}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label={t("Fermer")} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X size={22} /></button></div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("Colle le lien d’invitation reçu. Tu rejoindras le groupe avec le compte ouvert dans cette version de TellMe.")}</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">{t("Lien ou code d’invitation")}<input type="text" autoCapitalize="none" autoCorrect="off" required value={value} onChange={event => { setValue(event.target.value); setError(false); }} placeholder="https://tellmeall.vercel.app/join/…" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-transparent px-3 outline-none focus:border-sky-600 dark:border-slate-600" /></label>
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{t("Colle un lien d’invitation TellMe valide.")}</p>}
                <button className="min-h-12 w-full rounded-xl bg-sky-700 px-4 font-semibold text-white hover:bg-sky-800">{t("Continuer")}</button>
            </form>
        </dialog>
    </>;
}
