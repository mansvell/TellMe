import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.mansvell.tellme",
    appName: "TellMe",
    webDir: "dist",
    loggingBehavior: "debug",
    // Le code est embarqué dans l'app ; Supabase reste le backend commun.
    server: { androidScheme: "https" },
    android: { backgroundColor: "#f8fcff" },
    ios: { backgroundColor: "#f8fcff", contentInset: "automatic" },
    plugins: { SystemBars: { insetsHandling: "native", initialViewportFitValueHint: "contain" }, Keyboard: { resize: "native", resizeOnFullScreen: true } },
};
export default config;
