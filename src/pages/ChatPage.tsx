import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, Copy, FileText, Info, LoaderCircle, MoreHorizontal, Paperclip, Reply, Send, Settings, UserPlus, X } from "lucide-react";
import { copyText } from "../mobile/sharing";
import { getLocale, t } from "../i18n/runtime";
import icon from "../assets/icon.png";
import { supabase } from "../lib/supabase";
import BuzzMessageCard from "../components/BuzzMessageCard";
import QuestionMessageCard from "../components/QuestionMessageCard";
import MessageStatus from "../components/MessageStatus";
import MessageReadersDialog from "../components/MessageReadersDialog";
import { formatMessageDate, getMessageById, getMessages, getUnreadMessageIds, isAnonymousGroupPrompt, markMessageAsRead, sendMessage, type ChatMessage } from "../services/messages";
import { acknowledgeDelivery, getReceiptSummaries, type ReceiptSummary } from "../services/receipts";
import { getMyMessageColor } from "../services/group";
import { sendChatInvitation } from "../services/invitations";

type ChatItem = ChatMessage & { pending?: boolean };
type ChatGroup = { id: string; name: string; color: string; members: number };
type Menu = { x: number; y: number; message: ChatItem };

function mergeMessages(current: ChatItem[], incoming: ChatItem[], confirmed = false): ChatItem[] {
    const map = new Map(current.map(message => [message.id, message]));
    incoming.forEach(message => map.set(message.id, { ...map.get(message.id), ...message,
        pending: confirmed ? false : map.get(message.id)?.pending ?? message.pending }));
    return [...map.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id));
}

function lightText(color: string) {
    const hex = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : "0EA5E9";
    const [r, g, b] = [0, 2, 4].map(start => parseInt(hex.slice(start, start + 2), 16));
    const [red, green, blue] = [r, g, b].map(value => {
        const srgb = value / 255;
        return srgb <= .04045 ? srgb / 12.92 : ((srgb + .055) / 1.055) ** 2.4;
    });
    return red * .2126 + green * .7152 + blue * .0722 < .179;
}

export default function ChatPage() {
    const { groupId } = useParams<{ groupId: string }>();
    return <ChatConversation key={groupId} groupId={groupId}/>;
}

function ChatConversation({ groupId }: { groupId: string | undefined }) {
    const [group, setGroup] = useState<ChatGroup | null>(null);
    const [messages, setMessages] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadError, setLoadError] = useState(false);
    const [error, setError] = useState("");
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [reply, setReply] = useState<ChatItem | null>(null);
    const [sending, setSending] = useState(false);
    const [menu, setMenu] = useState<Menu | null>(null);
    const [invitation, setInvitation] = useState<ChatItem | null>(null);
    const [conversationName, setConversationName] = useState("");
    const [inviting, setInviting] = useState(false);
    const [notice, setNotice] = useState("");
    const [firstUnread, setFirstUnread] = useState<string | null>(null);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const [receipts, setReceipts] = useState<Map<string, ReceiptSummary>>(new Map());
    const [readerMessageId, setReaderMessageId] = useState<string | null>(null);
    const [receiptRevision, setReceiptRevision] = useState(0);
    const shell = useRef<HTMLElement>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const textarea = useRef<HTMLTextAreaElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const nearBottom = useRef(true);
    const didInitialScroll = useRef(false);
    const ownColor = useRef("#0EA5E9");
    const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sendingRef = useRef(false);
    const acknowledgedReads = useRef(new Set<string>());
    const messagesRef = useRef(messages);
    useLayoutEffect(() => { messagesRef.current = messages; }, [messages]);
    const messageKey = messages.filter(message => !message.pending).map(message => message.id).join(",");
    const ownMessageKey = messages.filter(message => message.me && !message.pending).map(message => message.id).join(",");

    // La fenêtre du chat suit aussi le clavier iOS ; seul le fil possède un défilement.
    useEffect(() => {
        const viewport = window.visualViewport;
        const resize = () => {
            if (!shell.current || (viewport && viewport.scale !== 1)) return;
            shell.current.style.height = `${viewport?.height ?? window.innerHeight}px`;
            shell.current.style.top = `${viewport?.offsetTop ?? 0}px`;
            if (nearBottom.current) requestAnimationFrame(() => {
                scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
            });
        };
        document.documentElement.classList.add("chat-open");
        const sizeObserver = new ResizeObserver(() => {
            if (nearBottom.current && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
        });
        if (scroller.current) sizeObserver.observe(scroller.current);
        resize(); viewport?.addEventListener("resize", resize); viewport?.addEventListener("scroll", resize);
        window.addEventListener("resize", resize);
        return () => { sizeObserver.disconnect(); document.documentElement.classList.remove("chat-open"); viewport?.removeEventListener("resize", resize); viewport?.removeEventListener("scroll", resize); window.removeEventListener("resize", resize); };
    }, []);

    useEffect(() => {
        if (!groupId) return;
        let active = true;
        didInitialScroll.current = false;
        const receive = async (id: string) => {
            try {
                const message = await getMessageById(id);
                if (!active || message.group_id !== groupId) return;
                setMessages(current => mergeMessages(current, [message]));
                if (!message.me) {
                    if (!nearBottom.current) setHasNewMessages(true);
                    await acknowledgeDelivery(groupId, [id]);
                }
            } catch (failure) { console.error("Message update failed", failure); }
        };
        async function load() {
            try {
                const [loaded, unread, groupResult, color] = await Promise.all([
                    getMessages(groupId!), getUnreadMessageIds(groupId!),
                    supabase.from("groups").select("id,name,color,group_members(count)").eq("id", groupId!).single(),
                    getMyMessageColor(groupId!).catch(() => "#0EA5E9"),
                ]);
                if (!active) return;
                if (groupResult.error) throw groupResult.error;
                const data = groupResult.data;
                setGroup({ id: data.id, name: data.name, color: data.color, members: data.group_members?.[0]?.count ?? 0 });
                ownColor.current = color;
                setMessages(current => mergeMessages(current.filter(message => message.group_id === groupId), loaded));
                setFirstUnread(unread[0] ?? null); setLoadError(false); setLoading(false);
                void acknowledgeDelivery(groupId!, loaded.filter(message => !message.me).map(message => message.id)).catch(console.error);
            } catch (failure) {
                console.error("Chat loading failed", failure);
                if (active) { setLoadError(true); setLoading(false); }
            }
        }
        void load();
        const channel = supabase.channel(`chat:${groupId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` }, payload => { void receive(String(payload.new.id)); })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "attachments" }, payload => {
                const id = String(payload.new.message_id);
                if (messagesRef.current.some(message => message.id === id)) void receive(id);
            }).subscribe();
        return () => { active = false; void supabase.removeChannel(channel); };
    }, [groupId, loadAttempt]);

    // Pas de faux « lu » : une bulle reçue doit être visible dans un onglet actif.
    useEffect(() => {
        if (!groupId || !scroller.current || readerMessageId || invitation || menu) return;
        const read = acknowledgedReads.current;
        const timers = new Map<string, ReturnType<typeof setTimeout>>();
        let active = true;
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const id = (entry.target as HTMLElement).dataset.messageId!;
                const timer = timers.get(id);
                if (timer) { clearTimeout(timer); timers.delete(id); }
                if (!entry.isIntersecting || document.visibilityState !== "visible" || read.has(id)) return;
                timers.set(id, setTimeout(() => {
                    timers.delete(id);
                    if (!active || document.visibilityState !== "visible") return;
                    read.add(id);
                    void markMessageAsRead(groupId, id).catch(() => { read.delete(id); });
                }, 350));
            });
        }, { root: scroller.current, threshold: 0.15 });
        const observe = () => {
            observer.disconnect();
            timers.forEach(clearTimeout); timers.clear();
            if (document.visibilityState === "visible") {
                scroller.current?.querySelectorAll<HTMLElement>('[data-incoming="true"]').forEach(element => observer.observe(element));
            }
        };
        observe(); document.addEventListener("visibilitychange", observe);
        return () => { active = false; observer.disconnect(); timers.forEach(clearTimeout); document.removeEventListener("visibilitychange", observe); };
    }, [groupId, messageKey, readerMessageId, invitation, menu]);

    // Realtime + reprise au premier plan : événements dédupliqués côté SQL.
    useEffect(() => {
        if (!groupId || !ownMessageKey) return;
        const ids = ownMessageKey.split(",");
        let active = true;
        let debounce: ReturnType<typeof setTimeout> | undefined;
        async function refresh() {
            try {
                const summary = await getReceiptSummaries(ids);
                if (active) { setReceipts(new Map(summary.map(row => [row.messageId, row]))); setReceiptRevision(value => value + 1); }
            } catch (failure) { console.error("Receipt update failed", failure); }
        }
        const update = () => { clearTimeout(debounce); debounce = setTimeout(() => { void refresh(); }, 150); };
        const channel = supabase.channel(`receipts:${groupId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "message_recipient_receipts" }, payload => {
                const row = payload.new as { message_id?: string };
                if (row.message_id && ids.includes(row.message_id)) update();
            })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reads" }, payload => {
                if (ids.includes(String(payload.new.message_id))) update();
            }).subscribe();
        const focus = () => { if (document.visibilityState === "visible") void refresh(); };
        void refresh(); window.addEventListener("focus", focus);
        const interval = setInterval(focus, 20_000);
        return () => { active = false; clearTimeout(debounce); clearInterval(interval); window.removeEventListener("focus", focus); void supabase.removeChannel(channel); };
    }, [groupId, ownMessageKey]);

    useLayoutEffect(() => {
        if (loading || !scroller.current) return;
        if (!didInitialScroll.current) {
            didInitialScroll.current = true;
            const unread = firstUnread ? scroller.current.querySelector<HTMLElement>(`[data-message-id="${firstUnread}"]`) : null;
            if (unread) unread.scrollIntoView({ block: "center" });
            else scroller.current.scrollTop = scroller.current.scrollHeight;
        } else if (nearBottom.current) {
            scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages.length, firstUnread, loading]);

    const scrollBottom = useCallback(() => {
        nearBottom.current = true; setHasNewMessages(false);
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }, []);
    const cancelLongPress = () => { if (touchTimer.current) clearTimeout(touchTimer.current); };
    useEffect(() => () => { if (touchTimer.current) clearTimeout(touchTimer.current); }, []);
    const openMenu = (x: number, y: number, message: ChatItem) => {
        if (message.pending) return;
        const height = window.visualViewport?.height ?? window.innerHeight;
        setMenu({ x: Math.max(8, Math.min(x, window.innerWidth - 220)), y: Math.max(8, Math.min(y, height - 215)), message });
    };

    async function submit(event?: React.FormEvent) {
        event?.preventDefault();
        if (!groupId || sendingRef.current || (!text.trim() && !file)) return;
        sendingRef.current = true; setSending(true); setError("");
        const id = crypto.randomUUID();
        const savedText = text.trim();
        const savedFile = file;
        const pending: ChatItem = { id, group_id: groupId, sender_membership_id: null, content: savedText || `📎 ${file?.name}`, reply_to_id: reply?.id ?? null,
            created_at: new Date().toISOString(), me: true, name: "", color: ownColor.current, time: new Date().toLocaleTimeString(getLocale(), { hour: "2-digit", minute: "2-digit" }), date: null,
            replyTo: reply ? { id: reply.id, name: reply.name, text: reply.content, color: reply.color } : null, attachments: [], readCount: 0, buzz_id: null, buzz: null, message_type: "text", question: null, pending: true };
        nearBottom.current = true; setHasNewMessages(false);
        setMessages(current => mergeMessages(current, [pending]));
        try {
            const message = await sendMessage(groupId, savedText, reply?.id ?? null, savedFile, id);
            setMessages(current => mergeMessages(current, [message], true));
            setText(""); setFile(null); setReply(null);
            if (textarea.current) textarea.current.style.height = "40px";
        } catch (failure) {
            console.error("Send failed", failure);
            try {
                const saved = await getMessageById(id);
                setMessages(current => mergeMessages(current, [saved], true));
                setText(""); setReply(null);
                if (textarea.current) textarea.current.style.height = "40px";
                if (savedFile && saved.attachments.length === 0) setError(t("Le message est envoyé, mais la pièce jointe n’a pas pu être confirmée."));
                else setFile(null);
            } catch {
                setMessages(current => current.filter(message => message.id !== id));
                setError(t("Envoi non confirmé. Ton message est conservé dans la zone de saisie."));
            }
        } finally { sendingRef.current = false; setSending(false); }
    }

    async function invite(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!invitation?.sender_membership_id || !conversationName.trim() || inviting) return;
        setInviting(true); setError("");
        try {
            await sendChatInvitation(invitation.sender_membership_id, conversationName.trim());
            setInvitation(null); setConversationName(""); setNotice(t("Invitation envoyée."));
        } catch { setError(t("Impossible d’envoyer l’invitation.")); }
        finally { setInviting(false); }
    }

    return <main ref={shell} className="chat-shell fixed inset-x-0 top-0 flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header data-testid="chat-header" className="relative z-20 shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-3 sm:h-[68px] sm:px-6">
                <Link to="/home" aria-label={t("Retour")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft size={21}/></Link>
                <Link to={`/gdetailp/${groupId}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: group?.color ?? "#0EA5E9" }}><img src={icon} alt="" className="h-8 w-8 object-contain"/></span>
                    <div className="min-w-0"><h1 className="truncate text-base font-semibold">{group?.name ?? t("Chargement...")}</h1><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{group?.members ?? 0} {t(group?.members === 1 ? "membre" : "membres")}</p></div>
                </Link>
                <Link to={`/gdetailp/${groupId}`} aria-label={t("Informations")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Settings size={21}/></Link>
            </div>
        </header>
        <section className="relative min-h-0 flex-1" aria-label={t("Messages")}>
            <div ref={scroller} data-testid="message-scroll" onScroll={() => {
                const element = scroller.current!;
                nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
                if (nearBottom.current) setHasNewMessages(false);
            }} className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
                <div className="mx-auto max-w-4xl space-y-2.5">
                    {loading && <p role="status" className="py-10 text-center text-sm text-slate-500">{t("Chargement...")}</p>}
                    {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-center text-sm dark:border-red-900 dark:bg-slate-900"><p>{t("Impossible de charger la conversation.")}</p><button type="button" onClick={() => setLoadAttempt(n => n + 1)} className="mt-3 font-medium text-sky-600">{t("Réessayer")}</button></div>}
                    {!loading && !loadError && messages.length === 0 && <div className="py-16 text-center"><p className="text-sm text-slate-500">{t("La conversation commence ici.")}</p></div>}
                    {messages.map((message, index) => {
                        const showDate = index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString();
                        const whiteText = lightText(message.color);
                        return <div key={message.id} data-message-id={message.id}>
                            {showDate && <div className="my-5 flex justify-center"><span className="rounded-md border border-slate-200/70 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{formatMessageDate(new Date(message.created_at))}</span></div>}
                            {message.id === firstUnread && <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-sky-200 dark:bg-sky-900"/><span className="text-xs font-medium text-sky-600 dark:text-sky-400">{t("Non lus")}</span><span className="h-px flex-1 bg-sky-200 dark:bg-sky-900"/></div>}
                            {isAnonymousGroupPrompt(message) ? <article data-message-id={message.id} data-incoming={!message.me ? "true" : undefined}
                                aria-label={t(message.message_type === "question" ? "Question anonyme" : "Sondage anonyme")}
                                className="mx-auto w-full max-w-xl">
                                {message.buzz ? <BuzzMessageCard buzz={message.buzz} /> : message.message_type === "question" ? <QuestionMessageCard question={message.question ?? message.content} /> : <p className="my-5 rounded-xl bg-white px-5 py-4 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">{t("Ce sondage n’est plus disponible.")}</p>}
                            </article> : <div className={`group flex items-end gap-1 ${message.me ? "justify-end" : "justify-start"}`}>
                                <article data-message-id={message.id} data-incoming={!message.me ? "true" : undefined} onContextMenu={event => { event.preventDefault(); openMenu(event.clientX, event.clientY, message); }}
                                    onTouchStart={event => {
                                        if ((event.target as HTMLElement).closest("button,a")) return;
                                        const touch = event.touches[0];
                                        touchTimer.current = setTimeout(() => openMenu(touch.clientX, touch.clientY, message), 500);
                                    }} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress} onTouchCancel={cancelLongPress}
                                    className={`min-w-[80px] max-w-[86%] rounded-xl px-3 py-2 shadow-sm sm:max-w-[72%] ${message.me ? "rounded-br-sm" : "rounded-bl-sm"} ${whiteText ? "text-white" : "text-slate-950"}`}
                                    style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(message.color) ? message.color : "#0EA5E9" }}>
                                    {!message.me && <p className="mb-1 text-xs font-semibold">{message.name}</p>}
                                    {message.replyTo && <button type="button" onClick={() => scroller.current?.querySelector<HTMLElement>(`[data-message-id="${message.replyTo!.id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" })} className="mb-2 block w-full rounded-md border-l-[3px] border-current bg-black/10 px-2.5 py-1.5 text-left text-xs"><span className="block font-semibold">{message.replyTo.name}</span><span className="mt-0.5 line-clamp-2 opacity-80">{message.replyTo.text}</span></button>}
                                    {message.buzz ? <BuzzMessageCard buzz={message.buzz}/> : message.message_type === "question" && message.question ? <QuestionMessageCard question={message.question}/> : <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[15px] leading-[1.5]">{message.content}</p>}
                                    {message.attachments.map(attachment => <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-lg">
                                        {attachment.fileType.startsWith("image/") ? <img src={attachment.signedUrl} alt={attachment.fileName} onLoad={() => { if (nearBottom.current) scrollBottom(); }} className="max-h-80 max-w-full object-contain"/> : <span className="flex items-center gap-2 rounded-lg bg-black/10 p-3 text-sm"><FileText size={20}/><span className="min-w-0 break-all">{attachment.fileName}</span></span>}
                                    </a>)}
                                    <div className="mt-1 flex min-h-5 items-center justify-end gap-1.5 text-[10px]"><time className="opacity-75">{message.time}</time>{message.me && <MessageStatus onDark={whiteText} pending={message.pending} receipt={receipts.get(message.id)} onClick={() => setReaderMessageId(message.id)}/>}</div>
                                </article>
                                {!message.pending && <button type="button" aria-label={t("Actions du message")} onClick={event => { const bounds = event.currentTarget.getBoundingClientRect(); openMenu(bounds.left - 170, bounds.top, message); }} className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 opacity-60 hover:bg-slate-200 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-slate-800"><MoreHorizontal size={17}/></button>}
                            </div>}
                        </div>;
                    })}
                </div>
            </div>
            {hasNewMessages && <button type="button" onClick={scrollBottom} aria-label={t("Derniers messages")} className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-600 shadow-md dark:border-slate-700 dark:bg-slate-800"><ArrowDown size={19}/></button>}
        </section>
        <footer data-testid="chat-composer" className="relative z-20 shrink-0 border-t border-slate-200 bg-slate-50 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-3">
            <div className="mx-auto w-full max-w-4xl">
                {error && <div role="alert" className="mb-2 flex items-start justify-between gap-2 text-xs text-red-600 dark:text-red-400"><p>{error}</p><button type="button" onClick={() => setError("")} aria-label={t("Fermer")}><X size={16}/></button></div>}
                {notice && <div role="status" className="mb-2 flex items-center justify-between text-xs text-sky-600"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label={t("Fermer")}><X size={16}/></button></div>}
                {reply && <div className="mb-2 flex items-center gap-3 rounded-lg border-l-[3px] border-sky-500 bg-slate-100 px-3 py-2 dark:bg-slate-800"><Reply size={16} className="shrink-0 text-slate-400"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{reply.name || t("Vous")}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{reply.content}</p></div><button type="button" onClick={() => setReply(null)} aria-label={t("Annuler la réponse")} className="p-1 text-slate-400"><X size={18}/></button></div>}
                {file && <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800"><FileText size={17} className="shrink-0 text-slate-400"/><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" disabled={sending} onClick={() => setFile(null)} aria-label={t("Retirer le fichier")} className="p-1 text-slate-400"><X size={17}/></button></div>}
                <form onSubmit={event => { void submit(event); }} className="flex items-end gap-2">
                    <input ref={fileInput} type="file" hidden accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={event => { setFile(event.target.files?.[0] ?? null); event.target.value = ""; }}/>
                    <div className="flex min-w-0 flex-1 items-end rounded-lg border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-800">
                        <button type="button" disabled={sending} aria-label={t("Joindre un fichier")} onClick={() => fileInput.current?.click()} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:text-sky-600 dark:text-slate-400"><Paperclip size={21}/></button>
                        <textarea ref={textarea} rows={1} value={text} readOnly={sending} aria-label={t("Écrire un message...")} placeholder={t("Écrire un message...")} onChange={event => {
                            setText(event.target.value);
                            event.target.style.height = "40px";
                            event.target.style.height = `${Math.min(event.target.scrollHeight, 144)}px`;
                        }} onKeyDown={event => {
                            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { event.preventDefault(); void submit(); }
                        }} className="my-0.5 min-h-10 max-h-36 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2 text-base leading-6 outline-none placeholder:text-slate-400"/>
                    </div>
                    <button type="submit" disabled={sending || (!text.trim() && !file)} aria-label={t("Envoyer")} className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white transition-colors hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600">{sending ? <LoaderCircle size={19} className="animate-spin"/> : <Send size={19}/>}</button>
                </form>
            </div>
        </footer>
        {menu && <div className="fixed inset-0 z-50" onClick={() => setMenu(null)} onContextMenu={event => { event.preventDefault(); setMenu(null); }}>
            <div role="menu" aria-label={t("Actions du message")} style={{ left: menu.x, top: menu.y }} onClick={event => event.stopPropagation()} className="absolute min-w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <MenuItem icon={<Reply size={17}/>} onClick={() => { setReply(menu.message); setMenu(null); textarea.current?.focus(); }}>{t("Répondre")}</MenuItem>
                <MenuItem icon={<Copy size={17}/>} onClick={() => { void copyText(menu.message.content).catch(() => setError(t("Impossible de copier le message."))); setMenu(null); }}>{t("Copier")}</MenuItem>
                {menu.message.me ? <MenuItem icon={<Info size={17}/>} onClick={() => { setReaderMessageId(menu.message.id); setMenu(null); }}>{t("Informations du message")}</MenuItem> : menu.message.sender_membership_id && <MenuItem icon={<UserPlus size={17}/>} onClick={() => { setInvitation(menu.message); setConversationName(""); setMenu(null); }}>{t("Inviter")}</MenuItem>}
            </div>
        </div>}
        {invitation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => { if (!inviting) setInvitation(null); }}>
            <form onSubmit={event => { void invite(event); }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between"><h2 id="invite-title" className="text-lg font-semibold">{t("Nouvelle conversation")}</h2><button type="button" disabled={inviting} onClick={() => setInvitation(null)} aria-label={t("Fermer")} className="p-2 text-slate-400"><X size={19}/></button></div>
                <p className="mt-2 text-sm text-slate-500">{t("Invitation destinée à")} {invitation.name}</p>
                <label htmlFor="conversation-name" className="mb-2 mt-5 block text-sm font-medium">{t("Nom de la conversation")}</label>
                <input id="conversation-name" autoFocus required maxLength={40} value={conversationName} onChange={event => setConversationName(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3 outline-none focus:border-sky-500 dark:border-slate-700"/>
                <button type="submit" disabled={inviting || !conversationName.trim()} className="mt-5 w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{inviting ? t("Envoi...") : t("Envoyer l’invitation")}</button>
            </form>
        </div>}
        {readerMessageId && <MessageReadersDialog key={readerMessageId} messageId={readerMessageId} revision={receiptRevision} onClose={() => setReaderMessageId(null)}/>}
    </main>;
}

function MenuItem({ icon: itemIcon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
    return <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"><span className="text-slate-400">{itemIcon}</span>{children}</button>;
}
