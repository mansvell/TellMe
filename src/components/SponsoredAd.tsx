import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Link } from "react-router-dom";
import { t } from "../i18n/runtime";
import { advertisingConfig, hasAdvertisingStarted, loadAdvertising, observeAdvertisingConsent } from "../services/advertising";

export default function SponsoredAd() {
    const config = advertisingConfig();
    const enabled = Boolean(config) && !Capacitor.isNativePlatform();
    const client = config?.client;
    const [allowed, setAllowed] = useState(false);
    const [available, setAvailable] = useState(true);
    const container = useRef<HTMLElement>(null);
    const ad = useRef<HTMLModElement>(null);
    const requested = useRef(false);

    useEffect(() => {
        if (!enabled) return;
        return observeAdvertisingConsent(setAllowed);
    }, [enabled]);
    useEffect(() => {
        if (!allowed || !client || !container.current || !ad.current) return;
        let active = true;
        const element = ad.current;
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting) || requested.current || element.clientWidth === 0) return;
            void loadAdvertising(client).then(() => {
                if (!active || requested.current) return;
                requested.current = true;
                observer.disconnect();
                window.adsbygoogle ??= [] as Record<string, never>[];
                window.adsbygoogle.push({});
            }).catch(() => { if (active) setAvailable(false); });
        });
        observer.observe(container.current);
        return () => { active = false; observer.disconnect(); };
    }, [allowed, client]);

    if (!enabled || !allowed || !available) return null;
    return <aside ref={container} aria-label={t("Publicité")} className="my-6 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{t("Publicité")}</span>
            {window.googlefc?.showRevocationMessage ? <button type="button" onClick={() => window.googlefc?.showRevocationMessage?.()} className="min-h-8 underline">{t("Gérer mes choix publicitaires")}</button> : <Link to="/privacy" className="min-h-8 content-center underline">{t("Confidentialité")}</Link>}
        </div>
        <ins ref={ad} className="adsbygoogle" style={{ display: "block", minHeight: 100 }} data-ad-client={config?.client} data-ad-slot={config?.slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>;
}

// Reste monté pendant les changements de page, y compris après la sortie d’Accueil.
export function AdvertisingConsentGuard() {
    useEffect(() => {
        if (!advertisingConfig() || Capacitor.isNativePlatform()) return;
        return observeAdvertisingConsent(allowed => {
            if (!allowed && hasAdvertisingStarted()) window.location.reload();
        });
    }, []);
    return null;
}
