import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { QUESTION_CATEGORIES } from "../data/questions";
import { t } from "../i18n/runtime";

export default function QuestionLibrary({ onSelect }: { onSelect: (question: string) => void }) {
    const [open, setOpen] = useState<string | null>(null);
    return (
        <div className="mt-5 space-y-3">
            {QUESTION_CATEGORIES.map(category => (
                <section key={category.id} className="overflow-hidden rounded-xl bg-white dark:bg-slate-800">
                    <h3>
                        <button type="button" aria-expanded={open === category.id} onClick={() => setOpen(open === category.id ? null : category.id)}
                            className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
                            <span aria-hidden="true" className="text-xl">{category.emoji}</span>
                            <span className="min-w-0 flex-1 font-semibold">{t(category.name)}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-300">{category.questions.length}</span>
                            <ChevronDown size={18} className={open === category.id ? "rotate-180" : ""} />
                        </button>
                    </h3>
                    {open === category.id && <ul className="divide-y divide-slate-100 px-4 pb-2 dark:divide-slate-700">
                        {category.questions.map((question, index) => (
                            <li key={index}>
                                <button type="button" onClick={() => onSelect(t(question))}
                                    className="w-full py-3 text-left text-sm leading-6 text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-300">
                                    {t(question)}
                                </button>
                            </li>
                        ))}
                    </ul>}
                </section>
            ))}
        </div>
    );
}
