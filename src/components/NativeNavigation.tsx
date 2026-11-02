import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { appPathFromUrl } from "../mobile/links";

export default function NativeNavigation() {
    const navigate = useNavigate();
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        let active = true;
        const listeners: PluginListenerHandle[] = [];
        const add = async (promise: Promise<PluginListenerHandle>) => {
            const handle = await promise;
            if (active) listeners.push(handle);
            else await handle.remove();
        };
        const open = (url: string) => {
            const path = appPathFromUrl(url);
            if (active && path) navigate(path);
        };
        void add(App.addListener("appUrlOpen", event => open(event.url)));
        void App.getLaunchUrl().then(result => { if (result?.url) open(result.url); });
        void add(App.addListener("backButton", () => {
            const modal = document.querySelector<HTMLDialogElement>("dialog[open]");
            if (modal) { modal.requestClose(); return; }
            if (window.history.state?.idx > 0) navigate(-1);
            else if (!["/home", "/welcome", "/"].includes(window.location.pathname)) navigate("/home", { replace: true });
            else void App.minimizeApp();
        }));
        void add(App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) window.dispatchEvent(new Event("focus"));
        }));
        return () => {
            active = false;
            listeners.forEach(listener => { void listener.remove(); });
        };
    }, [navigate]);
    return null;
}
