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
    const unlock = () => {
        if (!notificationSoundEnabled()) return;
        try {
            const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (Audio) context ??= new Audio();
            if (context?.state === "suspended") void context.resume().catch(() => {});
        } catch { /* L'audio ne doit jamais bloquer une notification. */ }
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => { window.removeEventListener("pointerdown", unlock, { capture: true }); window.removeEventListener("keydown", unlock, { capture: true }); };
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
