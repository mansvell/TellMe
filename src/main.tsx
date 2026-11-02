import { Capacitor } from "@capacitor/core";
import NativeNavigation from "./components/NativeNavigation";
import { restoreDevicePreferences } from "./mobile/storage";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import LanguageRoot from "./components/LanguageRoot";
import App from "./App";
import AccountGuard from "./components/AccountGuard";
import "./index.css";
import { initializeTheme } from "./services/theme";

//ca Charge le thème enregistré avant l'affichage
await restoreDevicePreferences().catch(() => { console.error("Could not restore app preferences."); });
initializeTheme();
document.documentElement.classList.toggle("native-app", Capacitor.isNativePlatform());

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <NativeNavigation />
            <LanguageRoot><AccountGuard><App /></AccountGuard></LanguageRoot>
        </BrowserRouter>
    </React.StrictMode>
);
