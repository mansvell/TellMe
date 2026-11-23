import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Pause, Play, X } from "lucide-react";
import { t } from "../i18n/runtime";
import { elapsedTime, funError, readStorytime, reportStorytime, type Storytime } from "../services/fun";
import { STORY_BACKGROUNDS, STORY_TOPICS } from "../data/storytimes";

export default function StorytimeViewer({ stories, initialId, onRead, onMore, onClose }: {
    stories: Storytime[]; initialId: string; onRead: (id: string) => void;
    onMore: () => Promise<Storytime[]>; onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [playlist, setPlaylist] = useState(stories);
    const [index, setIndex] = useState(() => Math.max(0, stories.findIndex(story => story.id === initialId)));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const advancing = useRef(false);
    const active = useRef(true);
    const story = playlist[index];
    useEffect(() => {
        active.current = true;
        dialog.current?.showModal();
        return () => { active.current = false; };
    }, []);
    const next = useCallback(async () => {
        if (advancing.current) return;
        let following = index + 1;
        while (following < playlist.length && Date.parse(playlist[following].expires_at) <= Date.now()) following++;
        if (following < playlist.length) { setIndex(following); return; }
        advancing.current = true; setLoading(true); setError("");
        try {
            const rows = (await onMore()).filter(row => Date.parse(row.expires_at) > Date.now() && !playlist.some(known => known.id === row.id));
            if (!active.current) return;
            if (!rows.length) { onClose(); return; }
            setPlaylist(current => [...current, ...rows]);
            setIndex(playlist.length);
        } catch (failure) { if (active.current) setError(funError(failure)); }
        finally { advancing.current = false; if (active.current) setLoading(false); }
    }, [index, playlist, onMore, onClose]);
    const previous = () => { if (!loading) setIndex(current => Math.max(0, current - 1)); };
    return <dialog ref={dialog} aria-label={t("Lecture des Storytimes")} onCancel={onClose}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-slate-950 p-0 backdrop:bg-slate-950">
        {story && <StoryScene key={story.id} story={story} position={index} total={playlist.length} loading={loading} error={error}
            onRead={onRead} onNext={() => void next()} onPrevious={previous} onClose={onClose} />}
    </dialog>;
}

function StoryScene({ story, position, total, loading, error, onRead, onNext, onPrevious, onClose }: {
    story: Storytime; position: number; total: number; loading: boolean; error: string;
    onRead: (id: string) => void; onNext: () => void; onPrevious: () => void; onClose: () => void;
}) {
    const title = useId();
    const [progress, setProgress] = useState(0);
    const elapsed = useRef(0);
    const [held, setHeld] = useState(false);
    const [paused, setPaused] = useState(false);
    const [hidden, setHidden] = useState(() => document.hidden);
    const [report, setReport] = useState(false);
    const [reason, setReason] = useState("abuse");
    const [reported, setReported] = useState(false);
    const [sending, setSending] = useState(false);
    const [failure, setFailure] = useState("");
    const [expired, setExpired] = useState(() => Date.parse(story.expires_at) <= Date.now());
    const reader = useRef<HTMLDivElement>(null);
    const touch = useRef<{ x: number; y: number } | null>(null);
    useEffect(() => {
        const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(story.expires_at) - Date.now()));
        return () => clearTimeout(timer);
    }, [story.expires_at]);
    useEffect(() => {
        let active = true;
        void readStorytime(story.id).then(() => { if (active) onRead(story.id); }).catch(error => { if (active) setFailure(funError(error)); });
        return () => { active = false; };
    }, [story.id, onRead]);
    useEffect(() => {
        const changed = () => setHidden(document.hidden);
        document.addEventListener("visibilitychange", changed);
        return () => document.removeEventListener("visibilitychange", changed);
    }, []);
    useEffect(() => {
        if (held || paused || hidden || report || sending || loading || error || failure) return;
        let last = performance.now();
        const timer = setInterval(() => {
            const now = performance.now();
            elapsed.current += now - last; last = now;
            setProgress(Math.min(1, elapsed.current / 5000));
            if (elapsed.current >= 5000) { clearInterval(timer); onNext(); }
        }, 40);
        return () => clearInterval(timer);
    }, [held, paused, hidden, report, sending, loading, error, failure, onNext]);
    async function sendReport() {
        setSending(true); setFailure("");
        try { await reportStorytime(story.id, reason); setReported(true); setReport(false); }
        catch (error) { setFailure(funError(error)); }
        finally { setSending(false); }
    }
    const palette = STORY_BACKGROUNDS[story.theme];
    return <div style={{ background: palette.background, color: palette.color }} className="mx-auto flex h-full w-full max-w-3xl flex-col"
        onKeyDown={event => {
            if (event.target instanceof HTMLElement && ["SELECT", "OPTION"].includes(event.target.tagName)) return;
            if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
            if (event.key === "ArrowLeft") { event.preventDefault(); onPrevious(); }
        }}>
        <header className="shrink-0 bg-gradient-to-b from-black/55 to-transparent px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <div className="mb-3 flex gap-1" aria-label={t("Histoire {current} sur {total}", { current: position + 1, total })}>
                {Array.from({ length: total }, (_, i) => <span key={i} className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/35">
                    <span className="block h-full origin-left bg-white" style={{ transform: `scaleX(${i < position ? 1 : i === position ? progress : 0})` }} />
                </span>)}
            </div>
            <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} aria-label={t("Retour")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15"><ArrowLeft size={23} /></button>
                <div className="flex-1"><h2 id={title} className="text-sm font-semibold">Storytime</h2><p className="mt-0.5 text-xs text-white/85">{elapsedTime(story.created_at)}</p></div>
                <button type="button" onClick={() => setPaused(value => !value)} aria-label={t(paused ? "Reprendre la lecture" : "Mettre en pause")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15">{paused ? <Play size={21} /> : <Pause size={21} />}</button>
                <button type="button" onClick={onClose} aria-label={t("Fermer")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15"><X size={23} /></button>
            </div>
        </header>
        <div ref={reader} aria-labelledby={title} className="min-h-0 flex-1 select-none overflow-y-auto overscroll-contain px-7 py-6 sm:px-12"
            onPointerDown={event => { setHeld(true); event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerUp={() => setHeld(false)} onPointerCancel={() => setHeld(false)} onLostPointerCapture={() => setHeld(false)}
            onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
            onTouchEnd={event => {
                const start = touch.current, end = event.changedTouches[0]; touch.current = null;
                if (!start || !end) return;
                const dx = end.clientX - start.x, dy = end.clientY - start.y;
                if (dy > 110 && Math.abs(dx) < 70 && reader.current?.scrollTop === 0) onClose();
                else if (Math.abs(dx) > 80 && Math.abs(dy) < 70) { if (dx < 0) onNext(); else onPrevious(); }
            }}>
            <div className="flex min-h-full items-center justify-center">
                <p className="whitespace-pre-wrap break-words text-center text-2xl font-medium leading-relaxed [overflow-wrap:anywhere] sm:text-3xl">{expired ? t("Cette Storytime a expiré.") : story.content}</p>
            </div>
        </div>
        <footer className="shrink-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 text-white">
            {loading && <p role="status" className="mb-3 text-sm">{t("Chargement...")}</p>}
            {(error || failure) && <p role="alert" className="mb-3 text-sm">{error || failure}</p>}
            {reported && <p role="status" className="mb-3 text-sm">{t("Signalement envoyé.")}</p>}
            {report && <div className="mb-3 flex flex-wrap gap-2">
                <select aria-label={t("Motif du signalement")} value={reason} onChange={event => setReason(event.target.value)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
                    <option value="abuse">{t("Contenu inapproprié")}</option><option value="spam">{t("Spam")}</option><option value="other">{t("Autre")}</option>
                </select>
                <button type="button" disabled={sending} onClick={() => void sendReport()} className="rounded-lg bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50">{t("Envoyer le signalement")}</button>
            </div>}
            <div className="flex items-center gap-2">
                <button type="button" disabled={sending || reported} onClick={() => setReport(value => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm disabled:opacity-60"><Flag size={17} />{t("Signaler")}</button>
                <span className="min-w-0 flex-1 text-center text-xs text-white/85">{t(STORY_TOPICS[story.theme].label)}</span>
                <button type="button" disabled={loading || position === 0} onClick={onPrevious} aria-label={t("Histoire précédente")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-30"><ChevronLeft size={23} /></button>
                <button type="button" disabled={loading} onClick={onNext} aria-label={t("Histoire suivante")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-30"><ChevronRight size={23} /></button>
            </div>
        </footer>
    </div>;
}
