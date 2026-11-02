import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import LanguageRoot from "./components/LanguageRoot";
import App from "./App";
import AccountGuard from "./components/AccountGuard";
import "./index.css";
import { initializeTheme } from "./services/theme";

//ca Charge le thème enregistré avant l'affichage
initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <LanguageRoot><AccountGuard><App /></AccountGuard></LanguageRoot>
        </BrowserRouter>
    </React.StrictMode>
);
