import { Capacitor } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export type ShareOutcome = "image" | "link" | "copied" | "cancelled";

export async function copyText(text: string): Promise<void> {
    if (Capacitor.isNativePlatform()) await Clipboard.write({ string: text });
    else await navigator.clipboard.writeText(text);
}

function isCancellation(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
    return /cancelled|canceled|user cancel|share canceled/i.test(message);
}

export async function shareLink(title: string, text: string, url: string): Promise<ShareOutcome> {
    try {
        if (Capacitor.isNativePlatform()) {
            await Share.share({ title, text, url });
            return "link";
        }
        if (navigator.share) {
            await navigator.share({ title, text, url });
            return "link";
        }
        await copyText(url);
        return "copied";
    } catch (error) {
        if (isCancellation(error)) return "cancelled";
        throw error;
    }
}

export async function shareImage(blob: Blob, filename: string, title: string, link: string): Promise<ShareOutcome> {
    if (Capacitor.isNativePlatform()) {
        // Nettoie uniquement les anciens exports, jamais une image encore ouverte par WhatsApp.
        const old = await Filesystem.readdir({ directory: Directory.Cache, path: "tellme-share" }).catch(() => ({ files: [] }));
        await Promise.all(old.files.filter(file => file.mtime && file.mtime < Date.now() - 86_400_000).map(file =>
            Filesystem.deleteFile({ directory: Directory.Cache, path: `tellme-share/${file.name}` }).catch(() => {}),
        ));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let start = 0; start < bytes.length; start += 8192) {
            binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
        }
        const path = `tellme-share/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { uri } = await Filesystem.writeFile({ directory: Directory.Cache, path, data: btoa(binary), recursive: true });
        try {
            // Le lien est du texte pour servir de légende, avec le fichier PNG.
            await Share.share({ title, text: link, files: [uri] });
            return "image";
        } catch (error) {
            if (isCancellation(error)) {
                await Filesystem.deleteFile({ directory: Directory.Cache, path }).catch(() => {});
                return "cancelled";
            }
            throw error;
        }
    }
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ title, text: link, files: [file] });
            return "image";
        } catch (error) {
            if (isCancellation(error)) return "cancelled";
            throw error;
        }
    }
    return shareLink(title, "", link);
}
