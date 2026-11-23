import type { CardTheme } from "../services/fun";

export const STORY_TOPICS: Record<CardTheme, { label: string; ring: string }> = {
    blue: { label: "Quotidien", ring: "#38BDF8" },
    violet: { label: "Confidences", ring: "#A78BFA" },
    pink: { label: "Amour et relations", ring: "#F472B6" },
    night: { label: "Mystère", ring: "#3B82F6" },
    gradient: { label: "Surprise", ring: "#818CF8" },
    slate: { label: "Réflexion", ring: "#94A3B8" },
};
