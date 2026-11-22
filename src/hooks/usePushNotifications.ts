import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n/runtime";
import {
    disablePushNotifications,
    enablePushNotifications,
    getPushStatus,
    initialPushStatus,
    pushDescription,
    type PushStatus,
} from "../services/pushNotifications";

export default function usePushNotifications() {
    const [status, setStatus] = useState<PushStatus>(initialPushStatus);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const action = useRef(false);
    const revision = useRef(0);
    const mounted = useRef(false);

    const refresh = useCallback(() => {
        if (action.current) return;
        const current = revision.current + 1;
        revision.current = current;
        void getPushStatus().then(value => {
            if (mounted.current && current === revision.current) setStatus(value);
        }).catch(() => {
            if (mounted.current && current === revision.current) setStatus("unavailable");
        });
    }, []);

    useEffect(() => {
        mounted.current = true;
        refresh();
        window.addEventListener("focus", refresh);
        window.addEventListener("online", refresh);
        const visible = () => { if (document.visibilityState === "visible") refresh(); };
        document.addEventListener("visibilitychange", visible);
        return () => {
            mounted.current = false;
            window.removeEventListener("focus", refresh);
            window.removeEventListener("online", refresh);
            document.removeEventListener("visibilitychange", visible);
        };
    }, [refresh]);

    async function change(enabled: boolean): Promise<boolean> {
        if (action.current || (status !== "enabled" && status !== "disabled")) return false;
        action.current = true;
        revision.current++;
        setSaving(true);
        setError("");

        try {
            if (enabled) await enablePushNotifications();
            else await disablePushNotifications();
            setStatus(enabled ? "enabled" : "disabled");
            return true;
        } catch {
            if ("Notification" in window && Notification.permission === "denied") {
                setStatus("denied");
            } else {
                setError(t("Impossible de modifier les notifications."));
            }
            return false;
        } finally {
            action.current = false;
            setSaving(false);
        }
    }

    function retry() {
        setError("");
        setStatus("checking");
        refresh();
    }

    return { status, saving, error, change, retry, description: pushDescription(status) };
}
