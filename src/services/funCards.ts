import logo from "../assets/icon.png";
import { t } from "../i18n/runtime";
import type { CardTheme } from "./fun";

export const FUN_BACKGROUNDS: Record<CardTheme, { label: string; background: string; color: string; colors: [string, string] }> = {
    blue: { label: "Bleu clair", background: "#EFF6FF", color: "#17243B", colors: ["#EFF6FF", "#DBEAFE"] },
    violet: { label: "Violet doux", background: "#DDD6FE", color: "#312E81", colors: ["#EDE9FE", "#C4B5FD"] },
    pink: { label: "Rose pastel", background: "#F4A6C4", color: "#4A1831", colors: ["#FCE7F3", "#F4A6C4"] },
    night: { label: "Bleu nuit", background: "#17243B", color: "#F8FAFC", colors: ["#17243B", "#0F172A"] },
    gradient: { label: "Bleu-violet", background: "linear-gradient(145deg,#DBEAFE,#C4B5FD)", color: "#17243B", colors: ["#DBEAFE", "#C4B5FD"] },
    slate: { label: "Gris foncé", background: "#334155", color: "#F8FAFC", colors: ["#334155", "#1E293B"] },
};

function wrap(context: CanvasRenderingContext2D, text: string, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
        let line = "";
        for (const word of paragraph.match(/\S+/gu) ?? []) {
            const candidate = line ? `${line} ${word}` : word;
            if (context.measureText(candidate).width <= width) {
                line = candidate;
                continue;
            }
            if (line) lines.push(line);
            line = "";
            // Split only words that cannot fit on a line of their own.
            for (const character of Array.from(word)) {
                if (line && context.measureText(line + character).width > width) {
                    lines.push(line);
                    line = character;
                } else {
                    line += character;
                }
            }
        }
        lines.push(line);
    }
    return lines;
}

let imagePromise: Promise<HTMLImageElement> | undefined;
function logoImage() {
    imagePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => { imagePromise = undefined; reject(Error("Image unavailable")); };
        image.src = logo;
    });
    return imagePromise;
}

export async function createFunCard(message: string, reply: string, theme: CardTheme, fromSecret = false): Promise<Blob> {
    const image = await logoImage();
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) throw Error("Canvas unavailable");
    const palette = FUN_BACKGROUNDS[theme];
    const background = context.createLinearGradient(0, 0, 1080, 1920);
    background.addColorStop(0, palette.colors[0]);
    background.addColorStop(1, palette.colors[1]);
    context.fillStyle = background;
    context.fillRect(0, 0, 1080, 1920);
    context.drawImage(image, 420, 100, 240, 176);
    context.textAlign = "center";
    context.fillStyle = palette.color;
    context.font = "700 56px system-ui, sans-serif";
    context.fillText("TellMe", 540, 330);

    let size = 58;
    let messageLines: string[] = [], replyLines: string[] = [];
    for (; size >= 20; size -= 2) {
        context.font = `600 ${size}px system-ui, sans-serif`;
        messageLines = wrap(context, message, 880);
        replyLines = reply ? wrap(context, reply, 880) : [];
        if ((messageLines.length + replyLines.length) * size * 1.35 + (reply ? 190 : 70) <= 1110) break;
    }
    size = Math.max(20, size);
    let y = Math.max(470, 1020 - ((messageLines.length + replyLines.length) * size * 1.35 + (reply ? 190 : 70)) / 2);
    context.font = "500 28px system-ui, sans-serif";
    context.fillText(t(fromSecret ? "Message anonyme" : "Réponds-moi anonymement sur TellMe"), 540, y);
    y += 65;
    context.font = `600 ${size}px system-ui, sans-serif`;
    for (const line of messageLines) { context.fillText(line, 540, y); y += size * 1.35; }

    if (reply) {
        y += 65;
        context.font = "500 28px system-ui, sans-serif";
        context.fillText(t("Ma réponse"), 540, y);
        y += 65;
        context.font = `600 ${size}px system-ui, sans-serif`;
        for (const line of replyLines) { context.fillText(line, 540, y); y += size * 1.35; }
    }
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("Export unavailable")), "image/png"));
}
