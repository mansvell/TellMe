import { setDevicePreference } from "../mobile/storage";

const KEY = "tellme-notification-sound";
let context: AudioContext | undefined;
let lastSound = 0;
export const notificationSoundEnabled = () => localStorage.getItem(KEY) !== "off";
export function setNotificationSound(enabled: boolean) {
    setDevicePreference(KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("tellme-sound-preference"));
}
export function prepareNotificationSound() {
    let active = true;
    let attached = false;
    let idle: number | undefined;
    let timer: number | undefined;
    let observed: AudioContext | undefined;
    const options = { capture: true, passive: true };
    function listen(enabled: boolean) {
        if (enabled === attached) return;
        attached = enabled;
        if (enabled) {
            window.addEventListener("click", unlock, options);
            window.addEventListener("keydown", unlock, options);
        } else {
            window.removeEventListener("click", unlock, options);
            window.removeEventListener("keydown", unlock, options);
        }
    }
    const changed = () => {
        if (active) listen(notificationSoundEnabled() && context?.state !== "running");
    };
    function observe() {
        if (observed !== context) {
            observed?.removeEventListener("statechange", changed);
            observed = context;
            observed?.addEventListener("statechange", changed);
        }
        changed();
    }
    function initialize() {
        idle = undefined; timer = undefined;
        if (!active || !notificationSoundEnabled() || document.hidden) return;
        try {
            const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (Audio && (!context || context.state === "closed")) context = new Audio();
            observe();
        } catch { /* L'app reste utilisable si le moteur audio est indisponible. */ }
    }
    function prepare() {
        if (!active || !notificationSoundEnabled()) { listen(false); return; }
        if (context && context.state !== "closed") { observe(); return; }
        if (idle !== undefined || timer !== undefined) return;
        // La construction peut ouvrir le périphérique audio : jamais dans un
        // pointerdown/clic, où elle retarderait l'affichage du bouton touché.
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(initialize, { timeout: 1500 });
        else timer = window.setTimeout(initialize, 250);
    }
    const unlock = () => {
        if (!active || !notificationSoundEnabled()) return;
        try {
            // Le geste utilisateur autorise seulement la reprise du contexte
            // déjà préparé ; sa construction ne bloque pas l'interaction.
            if (context && context.state !== "running" && context.state !== "closed") void context.resume().catch(() => {});
        } catch { /* L'audio ne doit jamais bloquer une notification. */ }
    };
    const visible = () => { if (!document.hidden) prepare(); };
    const preference = () => { changed(); prepare(); };
    window.addEventListener("tellme-sound-preference", preference);
    document.addEventListener("visibilitychange", visible);
    prepare();
    return () => {
        active = false; listen(false);
        if (idle !== undefined) window.cancelIdleCallback(idle);
        if (timer !== undefined) window.clearTimeout(timer);
        observed?.removeEventListener("statechange", changed);
        window.removeEventListener("tellme-sound-preference", preference);
        document.removeEventListener("visibilitychange", visible);
    };
}
export function playNotificationSound() {
    if (!notificationSoundEnabled() || document.hidden || !context || context.state !== "running" || Date.now() - lastSound < 1500) return;
    lastSound = Date.now();
    try {
        [659.25, 880].forEach((frequency, index) => {
            const oscillator = context!.createOscillator(), gain = context!.createGain(), start = context!.currentTime + index * .12;
            oscillator.type = "sine"; oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.08, start + .012); gain.gain.exponentialRampToValueAtTime(.001, start + .25);
            oscillator.connect(gain); gain.connect(context!.destination); oscillator.start(start); oscillator.stop(start + .27);
        });
    } catch { /* Appareil en mode silencieux ou audio non disponible. */ }
}
