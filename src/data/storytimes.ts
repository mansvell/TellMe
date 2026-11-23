import type { CardTheme } from "../services/fun";
import { FUN_BACKGROUNDS } from "../services/funCards";

// Les clés restent compatibles avec les histoires déjà enregistrées.
// La palette des cartes Secrets est indépendante de celle des Storytimes.
export const STORY_BACKGROUNDS: Record<CardTheme, { label: string; background: string; color: string }> = {
    blue: { label: "Vert", background: "#DCFCE7", color: "#14532D" },
    violet: FUN_BACKGROUNDS.violet,
    pink: FUN_BACKGROUNDS.pink,
    night: { label: "Bleu", background: "#DBEAFE", color: "#1E3A8A" },
    gradient: { label: "Rouge", background: "#FEE2E2", color: "#7F1D1D" },
    slate: { label: "Jaune", background: "#FEF3C7", color: "#78350F" },
};

export const STORY_TOPICS: Record<CardTheme, { label: string; ring: string }> = {
    blue: { label: "Quotidien", ring: "#22C55E" },
    violet: { label: "Confidences", ring: "#A78BFA" },
    pink: { label: "Amour et relations", ring: "#F472B6" },
    night: { label: "Mystère", ring: "#3B82F6" },
    gradient: { label: "Drôle", ring: "#EF4444" },
    slate: { label: "Privé", ring: "#EAB308" },
};
