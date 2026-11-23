import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { t } from "../i18n/runtime";
import { saveImage, shareImage } from "../mobile/sharing";
import { createFunCard } from "../services/funCards";
import { funError, saveSecretReply, type CardTheme, type Secret } from "../services/fun";
import FunDialog from "./FunDialog";
import FunThemePicker from "./FunThemePicker";

export default function SecretCardEditor({ secret, question, link, onClose, onSaved }: {
    secret?: Secret; question?: string; link: string; onClose: () => void; onSaved?: (secret: Secret) => void;
}) {
    const [reply, setReply] = useState(secret?.reply ?? "");
    const [theme, setTheme] = useState<CardTheme>(secret?.card_theme ?? "blue");
    const [preview, setPreview] = useState<{ blob: Blob; url: string; version: string } | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const message = secret?.content ?? question ?? t("Dis-moi quelque chose anonymement.");
    const answer = secret ? reply.trim() : "";

    const fromSecret = !!secret;
    const version = JSON.stringify([message, answer, theme, link, fromSecret]);

    useEffect(() => {
        let active = true;
        let url: string | undefined;
        const timer = window.setTimeout(() => {
            void createFunCard(message, answer, theme, fromSecret).then(blob => {
                if (!active) return;
                url = URL.createObjectURL(blob);
                setPreview({ blob, url, version });
            }).catch(() => { if (active) setError(t("Impossible de préparer l’image.")); });
        }, 180);
        return () => { active = false; clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
    }, [message, answer, theme, link, version, fromSecret]);

    const ready = preview && preview.version === version;

    async function save() {
        if (!secret || !answer) return;
        setBusy(true); setError(""); setNotice("");
        try {
            await saveSecretReply(secret.id, answer, theme);
            onSaved?.({ ...secret, reply: answer, card_theme: theme, replied_at: new Date().toISOString() });
            setNotice(t("Réponse enregistrée."));
        } catch (failure) { setError(funError(failure)); }
        finally { setBusy(false); }
    }

    async function share() {
        if (!preview || !ready) return;
        setBusy(true); setError(""); setNotice("");
        try {
            const outcome = await shareImage(preview.blob, "tellme-secret.png", "TellMe", link);
            if (outcome === "image") setNotice(t("Carte transmise à l’application choisie."));
            else if (outcome !== "cancelled") setNotice(t("Le lien est partagé. Enregistre aussi l’image pour ton Statut/Story."));
        } catch { setError(t("Le partage a échoué. Tu peux enregistrer l’image.")); }
        finally { setBusy(false); }
    }

    async function download() {
        if (!preview || !ready) return;
        setBusy(true); setError(""); setNotice("");
        try {
            const outcome = await saveImage(preview.blob, "tellme-secret.png");
            if (outcome === "saved") setNotice(t("Image enregistrée dans Documents."));
            if (outcome === "download") setNotice(t("Téléchargement de l’image lancé."));
            if (outcome === "shared") setNotice(t("Choisis Enregistrer dans les options de ton appareil."));
        } catch { setError(t("Impossible d’enregistrer l’image.")); }
        finally { setBusy(false); }
    }

    return (
        <FunDialog title={t(secret ? "Répondre au Secret" : "Carte d’invitation")} onClose={onClose} busy={busy}>
            {secret && <label className="block text-sm font-medium">{t("Ma réponse")}
                <textarea aria-label={t("Ma réponse")} value={reply} maxLength={600} rows={3} onChange={event => { setReply(event.target.value); setNotice(""); }}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-transparent p-3 font-normal dark:border-slate-700" />
                <span className="block text-right text-xs text-slate-500 dark:text-slate-400">{reply.length}/600</span>
            </label>}
            <FunThemePicker value={theme} onChange={setTheme} />
            <div className="mx-auto mt-5 aspect-[9/16] w-full max-w-64 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                {preview && <img src={preview.url} alt={t("Aperçu de la carte")} className="h-full w-full object-contain" />}
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
            {notice && <p role="status" className="mt-3 text-sm text-sky-700 dark:text-sky-300">{notice}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
                {secret && <button type="button" disabled={busy || !answer} onClick={() => void save()}
                    className="rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{t("Enregistrer la réponse")}</button>}
                <button type="button" disabled={busy || !ready} onClick={() => void share()}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Share2 size={17} />{t("Partager")}</button>
                <button type="button" disabled={busy || !ready} onClick={() => void download()}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold dark:bg-slate-700 disabled:opacity-50">
                    <Download size={17} />{t("Enregistrer l’image")}
                </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{t("Choisis WhatsApp, Instagram ou Snapchat dans le partage de ton appareil. Tu peux aussi publier l’image enregistrée manuellement.")}</p>
        </FunDialog>
    );
}
