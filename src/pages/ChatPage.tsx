import { useRef, useState } from "react";
import {ArrowLeft, Copy, Paperclip, Send, Settings, Smile, UserPlus, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import icon from "../assets/icon.png";

type Message = {
    id: number;
    date?: string;
    me: boolean;
    name?: string;
    text: string;
    time: string;
    seen?: boolean;
    views?: number;
    color?: string;
};

type ContextMenu = {
    x: number;
    y: number;
    message: Message;
};

const messages: Message[] = [
    {
        id: 1,
        date: "Aujourd’hui",
        me: false,
        name: "Lucas",
        text: "Salut tout le monde !",
        time: "15:42",
        color: "#8B5CF6",
    },
    {
        id: 2,
        me: true,
        text: "Salut !",
        time: "15:43",
        seen: true,
        views: 8,
    },
    {
        id: 3,
        me: false,
        name: "Emma",
        text: "On commence à 20h ?",
        time: "16:08",
        color: "#EC4899",
    },
    {
        id: 4,
        me: true,
        text: "Oui, aucun problème.",
        time: "16:09",
        seen: true,
        views: 5,
    },
];

export default function ChatPage() {
    const [menu, setMenu] = useState<ContextMenu | null>(null);
    const [inviteMessage, setInviteMessage] = useState<Message | null>(null);
    const [conversationName, setConversationName] = useState("");
    const touchTimer = useRef<number | null>(null);

    function openMenu(x: number, y: number, message: Message) {
        const menuWidth = 210;
        const menuHeight = 112;

        setMenu({
            x: Math.min(x, window.innerWidth - menuWidth - 12),
            y: Math.min(y, window.innerHeight - menuHeight - 12),
            message,
        });
    }

    function handleTouchStart(
        event: React.TouchEvent<HTMLDivElement>,
        message: Message,
    ) {
        const touch = event.touches[0];

        touchTimer.current = window.setTimeout(() => {
            openMenu(touch.clientX, touch.clientY, message);
        }, 500);
    }

    function cancelLongPress() {
        if (touchTimer.current !== null) {
            window.clearTimeout(touchTimer.current);
            touchTimer.current = null;
        }
    }

    async function copyMessage() {
        if (!menu) return;

        await navigator.clipboard.writeText(menu.message.text);
        setMenu(null);
    }

    function openInvitation() {
        if (!menu) return;

        setInviteMessage(menu.message);
        setMenu(null);
    }

    function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!conversationName.trim() || !inviteMessage) return;

        console.log({
            targetMessage: inviteMessage,
            conversationName: conversationName.trim(),
        });

        setConversationName("");
        setInviteMessage(null);
    }

    return (
        <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-100">
            <header className="z-20 shrink-0 border-b border-slate-200 bg-white">
                <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <Link
                            to="/home"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
                        >
                            <ArrowLeft size={22} />
                        </Link>

                        <Link to="/gdetailp" className="flex min-w-0 items-center gap-3">
                            <img
                                src={icon}
                                alt="Développeurs React"
                                className="h-11 w-11 shrink-0 rounded-2xl object-contain sm:h-12 sm:w-12"
                                draggable={false}
                            />

                            <div className="min-w-0">
                                <h1 className="truncate font-bold text-slate-900">
                                    Développeurs React
                                </h1>

                                <p className="truncate text-sm text-emerald-500">
                                    24 membres
                                </p>
                            </div>
                        </Link>
                    </div>

                    <Link to="/gdetailp" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100">
                        <Settings size={21} />
                    </Link>
                </div>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
                <div className="mx-auto w-full max-w-4xl space-y-4">
                    {messages.map((message) => (
                        <div key={message.id}>
                            {message.date && (
                                <div className="my-6 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-slate-200" />

                                    <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">
                                        {message.date}
                                    </span>

                                    <div className="h-px flex-1 bg-slate-200" />
                                </div>
                            )}

                            <div className={`flex ${
                                    message.me
                                        ? "justify-end"
                                        : "justify-start"
                                }`}>
                                <div
                                    onContextMenu={(event) => {
                                        event.preventDefault();

                                        openMenu(
                                            event.clientX,
                                            event.clientY,
                                            message,
                                        );
                                    }}
                                    onTouchStart={(event) =>
                                        handleTouchStart(event, message)
                                    }
                                    onTouchEnd={cancelLongPress}
                                    onTouchMove={cancelLongPress}
                                    onTouchCancel={cancelLongPress}
                                    className={`max-w-[86%] cursor-pointer rounded-3xl px-4 py-3 shadow-sm select-none sm:max-w-[70%] sm:px-5 ${
                                        message.me
                                            ? "rounded-br-lg bg-sky-500 text-white"
                                            : "rounded-bl-lg bg-white text-slate-800"
                                    }`}>
                                    {!message.me && message.name && (
                                        <p
                                            className="mb-1 text-sm font-bold"
                                            style={{
                                                color:
                                                    message.color ?? "#0EA5E9",
                                            }}
                                        >
                                            {message.name}
                                        </p>
                                    )}

                                    <p className="whitespace-pre-wrap break-words text-sm leading-6 sm:text-base">
                                        {message.text}
                                    </p>

                                    <div
                                        className={`mt-2 flex items-center justify-end gap-1.5 text-[11px] ${
                                            message.me
                                                ? "text-sky-100"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        <span>{message.time}</span>

                                        {message.me && (
                                            <>
                                                <span className="font-bold tracking-[-3px]">
                                                    {message.seen ? "✓✓" : "✓"}
                                                </span>

                                                {message.seen &&
                                                    typeof message.views ===
                                                    "number" && (
                                                        <span className="ml-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                            {message.views}
                                                        </span>
                                                    )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="z-20 shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
                <div className="mx-auto flex w-full max-w-4xl items-end gap-2 rounded-[1.75rem] bg-slate-100 px-3 py-2">
                    <button
                        type="button"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-sky-500"
                    >
                        <Smile size={21} />
                    </button>

                    <button
                        type="button"
                        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-sky-500 sm:flex"
                    >
                        <Paperclip size={21} />
                    </button>

                    <textarea
                        rows={1}
                        placeholder="Écrire un message..."
                        className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                    />

                    <button type="button"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-200
                        transition hover:bg-sky-600 active:scale-95">
                        <Send size={19} />
                    </button>
                </div>
            </footer>

            {menu && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={() => setMenu(null)}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        setMenu(null);
                    }}
                >
                    <div
                        style={{
                            left: menu.x,
                            top: menu.y,
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="absolute min-w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl"
                    >
                        <button
                            type="button"
                            onClick={copyMessage}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            <Copy size={19} className="text-sky-500" />
                            Copier
                        </button>

                        {!menu.message.me && (
                            <button
                                type="button"
                                onClick={openInvitation}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                                <UserPlus
                                    size={19}
                                    className="text-sky-500"
                                />
                                Inviter
                            </button>
                        )}
                    </div>
                </div>
            )}

            {inviteMessage && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
                    onClick={() => setInviteMessage(null)}
                >
                    <form
                        onSubmit={sendInvitation}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-w-md rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem]"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Nouvelle conversation
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Invitation destinée à{" "}
                                    {inviteMessage.name ?? "ce membre"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setInviteMessage(null)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <label
                            htmlFor="conversationName"
                            className="mt-7 block text-sm font-bold text-slate-700"
                        >
                            Nom de la conversation
                        </label>

                        <input
                            id="conversationName"
                            value={conversationName}
                            onChange={(event) =>
                                setConversationName(event.target.value)
                            }
                            maxLength={40}
                            autoFocus
                            placeholder="Ex. Projet RAG"
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />

                        <button
                            type="submit"
                            disabled={!conversationName.trim()}
                            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                            <UserPlus size={20} />
                            Envoyer l’invitation
                        </button>
                    </form>
                </div>
            )}
        </main>
    );
}