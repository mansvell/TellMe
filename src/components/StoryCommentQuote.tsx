import { Quote } from "lucide-react";
import { t } from "../i18n/runtime";
import type { CommentQuote } from "../services/fun";
import { profileAvatarStyle } from "../utils/profileColors";

export default function StoryCommentQuote({ quote, compact = false }: { quote: CommentQuote; compact?: boolean }) {
    const style = profileAvatarStyle(quote.color);
    return <blockquote aria-label={t("Commentaire cité")} className={`rounded-xl border-l-[3px] border-sky-500 bg-white/90 text-slate-900 shadow-sm ${compact ? "px-3 py-2 text-sm" : "px-5 py-4 text-base sm:text-lg"}`}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span style={style} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">{quote.display_prefix}</span>
            <span>{t("Commentaire")}</span><Quote size={15} className="ml-auto text-sky-600" />
        </div>
        <p className={`whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere] ${compact ? "line-clamp-3" : ""}`}>{quote.content}</p>
    </blockquote>;
}
