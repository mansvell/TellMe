import { supabase } from "../lib/supabase";


// ============================================================
// TYPES
// ============================================================

export type PushStatus =
    | "unsupported"
    | "denied"
    | "disabled"
    | "enabled";


// ============================================================
// CONVERTIT LA CLÉ VAPID POUR PUSHMANAGER
// ============================================================

// Convertit la clé VAPID en ArrayBuffer compatible avec PushManager.
function urlBase64ToArrayBuffer(
    base64String: string,
): ArrayBuffer {

    const padding =
        "=".repeat(
            (4 - base64String.length % 4) % 4,
        );

    const base64 =
        (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const rawData =
        window.atob(base64);

    const buffer =
        new ArrayBuffer(rawData.length);

    const bytes =
        new Uint8Array(buffer);

    for (
        let index = 0;
        index < rawData.length;
        index++
    ) {
        bytes[index] =
            rawData.charCodeAt(index);
    }

    return buffer;
}


// ============================================================
// VÉRIFIE SI LE NAVIGATEUR SUPPORTE WEB PUSH
// ============================================================

export function supportsPushNotifications():
    boolean {

    return (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}


// ============================================================
// ENREGISTRE LE SERVICE WORKER
// ============================================================

async function getServiceWorkerRegistration():
    Promise<ServiceWorkerRegistration> {

    if (!supportsPushNotifications()) {

        throw new Error(
            "Les notifications push ne sont pas supportées sur cet appareil.",
        );
    }


    const registration =
        await navigator.serviceWorker.register(
            "/sw.js",
        );


    await navigator.serviceWorker.ready;


    return registration;
}


// ============================================================
// ÉTAT ACTUEL DES NOTIFICATIONS
// ============================================================

export async function getPushStatus():
    Promise<PushStatus> {

    if (!supportsPushNotifications()) {

        return "unsupported";
    }


    if (
        Notification.permission ===
        "denied"
    ) {

        return "denied";
    }


    const registration =
        await getServiceWorkerRegistration();


    const subscription =
        await registration.pushManager
            .getSubscription();


    if (!subscription) {

        return "disabled";
    }


    return "enabled";
}


// ============================================================
// ACTIVE LES NOTIFICATIONS
// ============================================================

export async function enablePushNotifications():
    Promise<void> {

    if (!supportsPushNotifications()) {

        throw new Error(
            "Les notifications push ne sont pas supportées par ce navigateur.",
        );
    }


    // Demande l'autorisation système.
    const permission =
        await Notification.requestPermission();


    if (
        permission !==
        "granted"
    ) {

        throw new Error(
            "L'autorisation des notifications a été refusée.",
        );
    }


    const publicKey =
        import.meta.env
            .VITE_VAPID_PUBLIC_KEY;


    if (!publicKey) {

        throw new Error(
            "VITE_VAPID_PUBLIC_KEY est manquante.",
        );
    }


    const registration =
        await getServiceWorkerRegistration();


    // Vérifie d'abord s'il existe déjà.
    let subscription =
        await registration.pushManager
            .getSubscription();


    if (!subscription) {
        subscription =
            await registration.pushManager
                .subscribe({
                    userVisibleOnly: true,

                    applicationServerKey:
                        urlBase64ToArrayBuffer(
                            publicKey,
                        ),
                });
    }


    const subscriptionJson =
        subscription.toJSON();


    const endpoint =
        subscriptionJson.endpoint;

    const p256dh =
        subscriptionJson.keys?.p256dh;

    const auth =
        subscriptionJson.keys?.auth;


    if (
        !endpoint ||
        !p256dh ||
        !auth
    ) {

        throw new Error(
            "Abonnement push invalide.",
        );
    }


    const {
        data: { user },
        error: userError,
    } =
        await supabase.auth.getUser();


    if (userError) {
        throw userError;
    }


    if (!user) {

        throw new Error(
            "Utilisateur introuvable.",
        );
    }


    // Sauvegarde cet appareil.
    const {
        error: subscriptionError,
    } =
        await supabase
            .from("push_subscriptions")
            .upsert(
                {
                    user_id:
                    user.id,

                    endpoint,

                    p256dh,

                    auth,

                    updated_at:
                        new Date()
                            .toISOString(),
                },
                {
                    onConflict:
                        "endpoint",
                },
            );


    if (subscriptionError) {
        console.error(
            "Push subscription save error:",
            subscriptionError,
        );

        throw subscriptionError;
    }


    // Active les notifications pour le compte.
    const {
        error: profileError,
    } =
        await supabase
            .from("profiles")
            .update({
                notifications_enabled:
                    true,
            })
            .eq(
                "id",
                user.id,
            );


    if (profileError) {
        throw profileError;
    }
}


// ============================================================
// DÉSACTIVE LES NOTIFICATIONS SUR CET APPAREIL
// ============================================================

export async function disablePushNotifications():
    Promise<void> {

    const {
        data: { user },
        error: userError,
    } =
        await supabase.auth.getUser();


    if (userError) {
        throw userError;
    }


    if (!user) {

        throw new Error(
            "Utilisateur introuvable.",
        );
    }


    if (
        "serviceWorker" in navigator
    ) {

        const registration =
            await navigator.serviceWorker
                .getRegistration();


        const subscription =
            await registration
                ?.pushManager
                .getSubscription();


        if (subscription) {

            const endpoint =
                subscription.endpoint;


            // Supprime l'abonnement Supabase.
            const {
                error,
            } =
                await supabase
                    .from(
                        "push_subscriptions",
                    )
                    .delete()
                    .eq(
                        "user_id",
                        user.id,
                    )
                    .eq(
                        "endpoint",
                        endpoint,
                    );


            if (error) {
                throw error;
            }


            await subscription.unsubscribe();
        }
    }


    // Désactive les notifications du compte.
    const {
        error: profileError,
    } =
        await supabase
            .from("profiles")
            .update({
                notifications_enabled:
                    false,
            })
            .eq(
                "id",
                user.id,
            );


    if (profileError) {
        throw profileError;
    }
}