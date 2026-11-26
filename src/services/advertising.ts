export type ConsentData = {
    cmpStatus?: string;
    eventStatus?: string;
    gdprApplies?: boolean;
    listenerId?: number;
    vendor?: { consents?: Record<number, boolean>; legitimateInterests?: Record<number, boolean> };
    purpose?: { consents?: Record<number, boolean>; legitimateInterests?: Record<number, boolean> };
    publisher?: { restrictions?: Record<number, Record<number, number>> };
};
type ConsentCallback = (data: ConsentData, success: boolean) => void;
declare global {
    interface Window {
        __tcfapi?: (command: string, version: number, callback: ConsentCallback, parameter?: number) => void;
        googlefc?: { showRevocationMessage?: () => void };
        adsbygoogle?: { push: (request: Record<string, never>) => void };
    }
}

export function advertisingConfig() {
    const client = import.meta.env.VITE_ADSENSE_CLIENT ?? "";
    const slot = import.meta.env.VITE_ADSENSE_HOME_SLOT ?? "";
    // Activation séparée, seulement après validation du domaine et de la CMP.
    return import.meta.env.VITE_ADS_ENABLED === "true" && /^ca-pub-\d{16}$/.test(client) && /^\d{10}$/.test(slot)
        ? { client, slot } : null;
}

export function permitsAdvertising(data: ConsentData, success: boolean): boolean {
    if (!success || data.cmpStatus !== "loaded" || !["tcloaded", "useractioncomplete"].includes(data.eventStatus ?? "")) return false;
    // Consentement finalisé obligatoire ; aucun chargement sur un état inconnu.
    // Google Advertising Products : identifiant GVL 755. Respecte les restrictions éditeur.
    const consent = (purpose: number) => data.purpose?.consents?.[purpose] === true && data.vendor?.consents?.[755] === true;
    const interest = (purpose: number) => data.purpose?.legitimateInterests?.[purpose] === true && data.vendor?.legitimateInterests?.[755] === true;
    return [1, 2, 3, 4, 7, 9, 10].every(purpose => {
        const restriction = data.publisher?.restrictions?.[purpose]?.[755];
        if (restriction === 0) return false;
        if ([1, 3, 4].includes(purpose)) return restriction !== 2 && consent(purpose);
        return restriction === 1 ? consent(purpose) : restriction === 2 ? interest(purpose) : consent(purpose) || interest(purpose);
    });
}

export function observeAdvertisingConsent(onChange: (allowed: boolean) => void): () => void {
    let active = true;
    let attached = false;
    let listenerId: number | undefined;
    let attempts = 0;
    const attach = () => {
        if (attached || !window.__tcfapi) return;
        attached = true;
        window.__tcfapi("addEventListener", 2, (data, success) => {
            listenerId = data.listenerId;
            if (active) onChange(permitsAdvertising(data, success));
            else if (listenerId !== undefined) window.__tcfapi?.("removeEventListener", 2, () => {}, listenerId);
        });
    };
    attach();
    const timer = window.setInterval(() => {
        if (!active || attached || ++attempts >= 120) window.clearInterval(timer);
        else attach();
    }, 500);
    return () => {
        active = false;
        window.clearInterval(timer);
        if (listenerId !== undefined) window.__tcfapi?.("removeEventListener", 2, () => {}, listenerId);
    };
}

let loading: Promise<void> | undefined;
let started = false;
export function hasAdvertisingStarted() { return started; }
export function loadAdvertising(client: string): Promise<void> {
    if (!/^ca-pub-\d{16}$/.test(client)) return Promise.reject(new Error("Invalid publisher"));
    started = true;
    if (!loading) loading = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
        script.onload = () => resolve();
        script.onerror = () => { loading = undefined; script.remove(); reject(new Error("Advertising unavailable")); };
        document.head.appendChild(script);
    });
    return loading;
}
