import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Flag, MessageCircle, Pause, Play, X } from "lucide-react";
import { t } from "../i18n/runtime";
import { elapsedTime, funError, readStorytime, reportStorytime, type Storytime } from "../services/fun";
import { STORY_BACKGROUNDS, STORY_TOPICS } from "../data/storytimes";

export default function StorytimeViewer({ stories, initialId, onRead, onMore, onClose, onComment }: {
    stories: Storytime[]; initialId: string; onRead: (id: string) => void;
    onMore: () => Promise<Storytime[]>; onClose: () => void; onComment: (story: Storytime) => void;
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
            setPlaylist(current => [...current, ...rows]); setIndex(playlist.length);
        } catch (failure) { if (active.current) setError(funError(failure)); }
        finally { advancing.current = false; if (active.current) setLoading(false); }
    }, [index, playlist, onMore, onClose]);
    const previous = () => {
        if (loading) return;
        let preceding = index - 1;
        while (preceding >= 0 && Date.parse(playlist[preceding].expires_at) <= Date.now()) preceding--;
        if (preceding >= 0) setIndex(preceding);
    };
    const authorStories = playlist.filter(row => row.group_key === story?.group_key);
    return <dialog ref={dialog} aria-label={t("Lecture des Storytimes")} onCancel={onClose}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-slate-950/90">
        {story && <StoryScene key={story.id} story={story} position={authorStories.findIndex(row => row.id === story.id)} total={authorStories.length} loading={loading} error={error}
            onRead={onRead} onNext={() => void next()} onPrevious={previous} onClose={onClose} onComment={() => onComment(story)} />}
    </dialog>;
}

function StoryScene({ story, position, total, loading, error, onRead, onNext, onPrevious, onClose, onComment }: {
    story: Storytime; position: number; total: number; loading: boolean; error: string;
    onRead: (id: string) => void; onNext: () => void; onPrevious: () => void; onClose: () => void; onComment: () => void;
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
    const [dragY, setDragY] = useState(0);
    const [closing, setClosing] = useState(false);
    const reader = useRef<HTMLDivElement>(null);
    const gesture = useRef<{ x: number; y: number; time: number; top: number; pull: number; moved: boolean } | null>(null);
    useEffect(() => {
        const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(story.expires_at) - Date.now()));
        return () => clearTimeout(timer);
    }, [story.expires_at]);
    useEffect(() => {
        if (!closing) return;
        const timer = setTimeout(onClose, 190);
        return () => clearTimeout(timer);
    }, [closing, onClose]);
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
        if (held || paused || hidden || report || sending || loading || error || failure || closing) return;
        let last = performance.now();
        const timer = setInterval(() => {
            const now = performance.now();
            elapsed.current += now - last; last = now;
            setProgress(Math.min(1, elapsed.current / 5000));
            if (elapsed.current >= 5000) { clearInterval(timer); onNext(); }
        }, 40);
        return () => clearInterval(timer);
    }, [held, paused, hidden, report, sending, loading, error, failure, closing, onNext]);
    async function sendReport() {
        setSending(true); setFailure("");
        try { await reportStorytime(story.id, reason); setReported(true); setReport(false); }
        catch (error) { setFailure(funError(error)); }
        finally { setSending(false); }
    }
    function cancelGesture() { gesture.current = null; setHeld(false); setDragY(0); }
    const palette = STORY_BACKGROUNDS[story.theme];
    return <div style={{ background: palette.background, color: palette.color,
        transform: closing ? "translateY(100dvh) scale(0.88)" : `translateY(${dragY}px) scale(${1 - Math.min(dragY / 2200, .12)})`,
        borderRadius: dragY > 0 || closing ? 24 : 0, opacity: closing ? 0 : 1 - Math.min(dragY / 1400, .3),
    }} className={`mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden motion-reduce:transition-none ${held ? "" : "transition-[transform,opacity,border-radius] duration-200 ease-out"}`}
        onKeyDown={event => {
            if (event.target instanceof HTMLElement && ["SELECT", "OPTION", "BUTTON"].includes(event.target.tagName)) return;
            if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
            if (event.key === "ArrowLeft") { event.preventDefault(); onPrevious(); }
            if (event.key === " ") { event.preventDefault(); setPaused(value => !value); }
        }}>
        <header className="shrink-0 bg-gradient-to-b from-black/55 to-transparent px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <div className="mb-3 flex gap-1" aria-label={t("Histoire {current} sur {total}", { current: position + 1, total })}>
                {Array.from({ length: total }, (_, i) => <span key={i} className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/35">
                    <span className="block h-full origin-left bg-white" style={{ transform: `scaleX(${i < position ? 1 : i === position ? progress : 0})` }} />
                </span>)}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                <button type="button" onClick={onClose} aria-label={t("Retour")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/15"><ArrowLeft size={23} /></button>
                <div className="min-w-0 flex-1"><h2 id={title} className="text-sm font-semibold">Storytime</h2><p className="mt-0.5 text-xs text-white/85">{elapsedTime(story.created_at)}</p></div>
                <button type="button" disabled={sending || reported || expired} onClick={() => setReport(value => !value)} aria-label={t("Signaler")} aria-pressed={report} className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full px-2 text-sm hover:bg-white/15 disabled:opacity-60"><Flag size={19} /><span className="hidden md:inline">{t("Signaler")}</span></button>
                <button type="button" onClick={() => setPaused(value => !value)} aria-label={t(paused ? "Reprendre la lecture" : "Mettre en pause")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/15">{paused ? <Play size={21} /> : <Pause size={21} />}</button>
                <button type="button" onClick={onClose} aria-label={t("Fermer")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/15"><X size={23} /></button>
            </div>
        </header>
        <div ref={reader} tabIndex={0} aria-labelledby={title} style={{ touchAction: "none" }} className="relative min-h-0 flex-1 select-none overflow-y-auto overscroll-contain px-7 py-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 sm:px-12"
            onPointerDown={event => {
                if (closing || (event.target instanceof Element && event.target.closest("button"))) return;
                gesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), top: event.currentTarget.scrollTop, pull: 0, moved: false };
                setHeld(true); event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
                const start = gesture.current;
                if (!start) return;
                const dx = event.clientX - start.x, dy = event.clientY - start.y;
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) start.moved = true;
                if (Math.abs(dy) <= Math.abs(dx)) return;
                const pull = Math.max(0, dy - start.top);
                start.pull = pull;
                if (pull > 0) setDragY(pull * .7);
                else { event.currentTarget.scrollTop = start.top - dy; setDragY(0); }
            }}
            onPointerUp={event => {
                const start = gesture.current; gesture.current = null; setHeld(false);
                if (!start || closing) return;
                const dx = event.clientX - start.x, dy = event.clientY - start.y;
                if (start.pull > 120 && Math.abs(dy) > Math.abs(dx)) { setClosing(true); return; }
                setDragY(0);
                if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) onNext(); else onPrevious(); return; }
                if (start.moved || performance.now() - start.time > 350) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                if (x < .3) onPrevious(); else if (x > .7) onNext(); else setPaused(value => !value);
            }}
            onPointerCancel={cancelGesture} onLostPointerCapture={() => { if (gesture.current) cancelGesture(); }}>
            <div className="flex min-h-full items-center justify-center">
                <p className="whitespace-pre-wrap break-words text-center text-2xl font-medium leading-relaxed [overflow-wrap:anywhere] sm:text-3xl">{expired ? t("Cette Storytime a expiré.") : story.content}</p>
            </div>
            {paused && <span aria-hidden="true" className="pointer-events-none sticky bottom-2 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/15"><Play size={25} /></span>}
            <button type="button" onClick={onPrevious} className="sr-only focus:not-sr-only">{t("Histoire précédente")}</button>
            <button type="button" onClick={() => setPaused(value => !value)} className="sr-only focus:not-sr-only">{t("Pause au centre de la Story")}</button>
            <button type="button" onClick={onNext} className="sr-only focus:not-sr-only">{t("Histoire suivante")}</button>
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
            <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-xs text-white/85">{t(STORY_TOPICS[story.theme].label)}</span>
                <button type="button" disabled={expired} onClick={onComment} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25 disabled:opacity-50"><MessageCircle size={19} />{t("Commentaires")}</button>
            </div>
        </footer>
    </div>;
}
