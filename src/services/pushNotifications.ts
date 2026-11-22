import { Capacitor } from "@capacitor/core";
import { t } from "../i18n/runtime";
import { supabase } from "../lib/supabase";

type UnsupportedPush = "native" | "install" | "unsupported";
export type PushStatus = UnsupportedPush | "checking" | "unavailable" | "denied" | "disabled" | "enabled";

let readyWorker: ServiceWorkerRegistration | undefined;
let preparingWorker: Promise<ServiceWorkerRegistration> | undefined;

function unsupportedReason(): UnsupportedPush | undefined {
    if (Capacitor.isNativePlatform()) return "native";

    const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const isAppleMobile = isIPad || /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone;
    if (isAppleMobile && !standalone) return "install";
    if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return;
    return "unsupported";
}

export function initialPushStatus(): PushStatus {
    return unsupportedReason() ?? "checking";
}

export function pushDescription(status: PushStatus): string | undefined {
    switch (status) {
        case "native": return t("Les notifications ne sont pas encore disponibles sur cette version mobile.");
        case "install": return t("Sur iPhone ou iPad, ajoute TellMe à l’écran d’accueil depuis Partager, puis ouvre son icône.");
        case "unsupported": return t("Les notifications ne sont pas prises en charge par ce navigateur.");
        case "unavailable": return t("Impossible de préparer les notifications. Réessaie.");
        case "denied": return t("Autorise les notifications pour TellMe dans les réglages de ton appareil ou de ton navigateur.");
    }
}

function applicationServerKey(): ArrayBuffer {
    const key = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
    if (!key) throw new Error(t("Les notifications sont indisponibles pour le moment."));
    const base64 = key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "=");
    return Uint8Array.from(window.atob(base64), character => character.charCodeAt(0)).buffer;
}

async function registerWorker(): Promise<ServiceWorkerRegistration> {
    let deadline: number | undefined;
    const ready = navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .then(() => navigator.serviceWorker.ready);
    try {
        return await Promise.race([
            ready,
            new Promise<never>((_, reject) => {
                deadline = window.setTimeout(() => reject(new Error("Service worker not ready")), 8_000);
            }),
        ]);
    } finally {
        window.clearTimeout(deadline);
    }
}

function prepareWorker(): Promise<ServiceWorkerRegistration> {
    if (!preparingWorker) {
        preparingWorker = registerWorker().then(registration => {
            readyWorker = registration;
            return registration;
        }).catch(error => {
            preparingWorker = undefined;
            throw error;
        });
    }
    return preparingWorker;
}

export function prepareWebPush(): void {
    if (!unsupportedReason()) void prepareWorker().catch(() => { /* Le réglage permet de réessayer. */ });
}

async function currentUserId(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) throw new Error(t("Utilisateur introuvable."));
    return session.user.id;
}

export async function getPushStatus(): Promise<PushStatus> {
    const unsupported = unsupportedReason();
    if (unsupported) return unsupported;
    if (Notification.permission === "denied") return "denied";
    applicationServerKey();

    const registration = await prepareWorker();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription || Notification.permission !== "granted") return "disabled";

    const userId = await currentUserId();
    const [device, profile] = await Promise.all([
        supabase.from("push_subscriptions").select("endpoint").eq("user_id", userId).eq("endpoint", subscription.endpoint).maybeSingle(),
        supabase.from("profiles").select("notifications_enabled").eq("id", userId).maybeSingle(),
    ]);
    if (device.error) throw device.error;
    if (profile.error) throw profile.error;
    return device.data && profile.data?.notifications_enabled !== false ? "enabled" : "disabled";
}

export async function enablePushNotifications(): Promise<void> {
    const unsupported = unsupportedReason();
    if (unsupported) throw new Error(pushDescription(unsupported));
    if (!readyWorker) throw new Error(pushDescription("unavailable"));

    // L'inscription doit démarrer dans le même geste que l'appui sur le bouton.
    const subscription = await readyWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(),
    });
    const { endpoint, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error(t("Abonnement push invalide."));

    const userId = await currentUserId();
    const { error: profileError } = await supabase.from("profiles").update({ notifications_enabled: true }).eq("id", userId);
    if (profileError) throw profileError;

    const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (subscriptionError) throw subscriptionError;
}

export async function disablePushNotifications(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const userId = await currentUserId();
    const { error } = await supabase.from("push_subscriptions").delete()
        .eq("user_id", userId)
        .eq("endpoint", subscription.endpoint);
    if (error) throw error;

    // L'abonnement des autres appareils reste valide.
    await subscription.unsubscribe();
}
