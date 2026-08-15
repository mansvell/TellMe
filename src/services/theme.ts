export type AppTheme = "light" | "dark";

const THEME_KEY = "tellme-theme";


// Applique le thème à toute l'application.
export function applyTheme(theme: AppTheme) {

    document.documentElement.classList.toggle(
        "dark",
        theme === "dark",
    );

    localStorage.setItem(
        THEME_KEY,
        theme,
    );
}


// Retourne le thème actuellement enregistré.
export function getSavedTheme(): AppTheme {

    const savedTheme =
        localStorage.getItem(THEME_KEY);

    return savedTheme === "dark"
        ? "dark"
        : "light";
}


// Initialise le thème au démarrage de TellMe.
export function initializeTheme() {

    const theme =
        getSavedTheme();

    document.documentElement.classList.toggle(
        "dark",
        theme === "dark",
    );
}