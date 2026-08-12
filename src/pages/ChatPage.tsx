import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    ArrowLeft,
    Copy,
    FileText,
    LoaderCircle,
    Paperclip,
    Reply,
    Send,
    Settings,
    UserPlus,
    X,
} from "lucide-react";

import {
    Link,
    useParams,
} from "react-router-dom";

import icon from "../assets/icon.png";
import { supabase } from "../lib/supabase";

import {
    formatMessageDate,
    getMessageById,
    getMessages,
    getUnreadMessageIds,
    markGroupMessagesAsRead,
    markMessageAsRead,
    sendMessage,
    type ChatMessage,
} from "../services/messages";


// ======================================================
// TYPES
// ======================================================

type ContextMenu = {
    x: number;
    y: number;
    message: ChatMessage;
};

type ChatGroup = {
    id: string;
    name: string;
    color: string;
    members: number;
};


// ======================================================
// CHAT PAGE
// ======================================================

export default function ChatPage() {

    const { groupId } =
        useParams<{ groupId: string }>();

    // Messages du groupe.
    const [messages, setMessages] =
        useState<ChatMessage[]>([]);

    // Informations du groupe.
    const [group, setGroup] =
        useState<ChatGroup | null>(null);

    // Menu contextuel sur un message.
    const [menu, setMenu] =
        useState<ContextMenu | null>(null);

    // Invitation privée depuis un message.
    const [inviteMessage, setInviteMessage] =
        useState<ChatMessage | null>(null);

    const [conversationName, setConversationName] =
        useState("");

    // Message auquel l'utilisateur répond.
    const [replyingTo, setReplyingTo] =
        useState<ChatMessage | null>(null);

    // Texte du nouveau message.
    const [messageText, setMessageText] =
        useState("");

    // Envoi en cours.
    const [sending, setSending] =
        useState(false);

    // Chargement initial des messages.
    const [loadingMessages, setLoadingMessages] =
        useState(true);

    // Fichier sélectionné.
    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    // Premier message qui était non lu
    // au moment où le user entre dans le chat.
    const [
        firstUnreadMessageId,
        setFirstUnreadMessageId,
    ] = useState<string | null>(null);

    const touchTimer =
        useRef<number | null>(null);

    const fileInputRef =
        useRef<HTMLInputElement | null>(null);

    const messagesEndRef =
        useRef<HTMLDivElement | null>(null);


    // ======================================================
    // CHARGE LES INFORMATIONS DU GROUPE
    // ======================================================

    useEffect(() => {

        async function loadGroup() {

            if (!groupId) return;

            const { data, error } = await supabase
                .from("groups")
                .select(`
                    id,
                    name,
                    color,
                    group_members(count)
                `)
                .eq("id", groupId)
                .single();

            if (error) {

                console.error(
                    "Erreur chargement groupe :",
                    error,
                );

                return;
            }

            setGroup({
                id: data.id,
                name: data.name,
                color: data.color,

                // Nombre réel de membres.
                members:
                    data.group_members?.[0]?.count ??
                    0,
            });
        }

        void loadGroup();

    }, [groupId]);


    // ======================================================
    // RECALCULE LES SÉPARATEURS DE DATE
    // "Aujourd'hui" apparaît uniquement au premier message.
    // ======================================================

    function updateMessageDates(
        currentMessages: ChatMessage[],
    ): ChatMessage[] {

        return currentMessages.map(
            (message, index) => {

                const currentDate =
                    new Date(
                        message.created_at,
                    );

                const previousDate =
                    index > 0
                        ? new Date(
                            currentMessages[
                            index - 1
                                ].created_at,
                        )
                        : null;

                return {
                    ...message,

                    date:
                        !previousDate ||
                        previousDate.toDateString() !==
                        currentDate.toDateString()
                            ? formatMessageDate(
                                currentDate,
                            )
                            : null,
                };
            },
        );
    }


    // ======================================================
    // CHARGEMENT INITIAL + REALTIME
    // ======================================================

    useEffect(() => {

        if (!groupId) return;

        let active = true;


        // --------------------------------------------------
        // Charge les messages + détecte les non lus.
        // --------------------------------------------------

        Promise.all([
            getMessages(groupId),
            getUnreadMessageIds(groupId),
        ])
            .then(
                async ([
                           loadedMessages,
                           unreadMessageIds,
                       ]) => {

                    if (!active) return;

                    // Affiche tous les messages.
                    setMessages(
                        updateMessageDates(
                            loadedMessages,
                        ),
                    );

                    // Enregistre uniquement le premier
                    // message non lu pour placer la barre.
                    setFirstUnreadMessageId(
                        unreadMessageIds[0] ??
                        null,
                    );

                    setLoadingMessages(false);


                    // Dès que le chat est ouvert,
                    // les anciens messages reçus deviennent lus.
                    if (
                        unreadMessageIds.length >
                        0
                    ) {

                        await markGroupMessagesAsRead(
                            groupId,
                        );
                    }
                },
            )
            .catch((error) => {

                console.error(
                    "Erreur chargement messages :",
                    error,
                );

                if (active) {
                    setLoadingMessages(false);
                }
            });


        // --------------------------------------------------
        // CHANNEL REALTIME DU CHAT
        // --------------------------------------------------

        const channel = supabase
            .channel(
                `chat:${groupId}`,
            )


            // ----------------------------------------------
            // NOUVEAU MESSAGE
            // ----------------------------------------------

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",

                    filter:
                        `group_id=eq.${groupId}`,
                },

                async (payload) => {

                    try {

                        const realtimeMessage =
                            await getMessageById(
                                String(
                                    payload.new.id,
                                ),
                            );


                        setMessages(
                            (current) => {

                                // Évite le doublon entre
                                // l'ajout immédiat et Realtime.
                                if (
                                    current.some(
                                        (item) =>
                                            item.id ===
                                            realtimeMessage.id,
                                    )
                                ) {
                                    return current;
                                }

                                return updateMessageDates([
                                    ...current,
                                    realtimeMessage,
                                ]);
                            },
                        );


                        // Si un autre membre envoie un message
                        // pendant que ce chat est ouvert,
                        // il est immédiatement considéré comme lu.
                        if (
                            !realtimeMessage.me
                        ) {

                            await markMessageAsRead(
                                groupId,
                                realtimeMessage.id,
                            );
                        }

                    } catch (error) {

                        console.error(
                            "Erreur Realtime message :",
                            error,
                        );
                    }
                },
            )


            // ----------------------------------------------
            // UN MEMBRE A LU UN MESSAGE
            // ----------------------------------------------

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table:
                        "message_reads",
                },

                (payload) => {

                    const messageId =
                        String(
                            payload.new
                                .message_id ??
                            "",
                        );

                    if (!messageId) return;


                    setMessages(
                        (current) =>
                            current.map(
                                (message) => {

                                    if (
                                        message.id !==
                                        messageId
                                    ) {
                                        return message;
                                    }

                                    return {
                                        ...message,

                                        // Realtime :
                                        // une personne supplémentaire
                                        // a lu ce message.
                                        readCount:
                                            message.readCount +
                                            1,
                                    };
                                },
                            ),
                    );
                },
            )


            // ----------------------------------------------
            // ACTIVE LE CHANNEL
            // ----------------------------------------------

            .subscribe(
                (status, error) => {

                    if (error) {

                        console.error(
                            "Erreur Realtime :",
                            status,
                            error,
                        );
                    }
                },
            );


        // --------------------------------------------------
        // CLEANUP
        // --------------------------------------------------

        return () => {

            active = false;

            void supabase.removeChannel(
                channel,
            );
        };

    }, [groupId]);


    // ======================================================
    // SCROLL AUTOMATIQUE
    // ======================================================

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });

    }, [messages]);


    // ======================================================
    // MENU CONTEXTUEL
    // ======================================================

    function openMenu(
        x: number,
        y: number,
        message: ChatMessage,
    ) {

        const menuWidth = 210;
        const menuHeight = 150;

        setMenu({
            x: Math.min(
                x,
                window.innerWidth -
                menuWidth -
                12,
            ),

            y: Math.min(
                y,
                window.innerHeight -
                menuHeight -
                12,
            ),

            message,
        });
    }


    // ======================================================
    // APPUI LONG MOBILE
    // ======================================================

    function handleTouchStart(
        event: React.TouchEvent<HTMLDivElement>,
        message: ChatMessage,
    ) {

        const touch =
            event.touches[0];

        touchTimer.current =
            window.setTimeout(
                () => {

                    openMenu(
                        touch.clientX,
                        touch.clientY,
                        message,
                    );
                },
                500,
            );
    }


    // Annule le long appui.
    function cancelLongPress() {

        if (
            touchTimer.current !==
            null
        ) {

            window.clearTimeout(
                touchTimer.current,
            );

            touchTimer.current =
                null;
        }
    }


    // ======================================================
    // RÉPONDRE À UN MESSAGE
    // ======================================================

    function answerMessage() {

        if (!menu) return;

        setReplyingTo(
            menu.message,
        );

        setMenu(null);
    }


    // ======================================================
    // COPIER UN MESSAGE
    // ======================================================

    async function copyMessage() {

        if (!menu) return;

        await navigator.clipboard.writeText(
            menu.message.content,
        );

        setMenu(null);
    }


    // ======================================================
    // INVITATION PRIVÉE
    // ======================================================

    function openInvitation() {

        if (!menu) return;

        setInviteMessage(
            menu.message,
        );

        setMenu(null);
    }


    // Pour l'instant garde ton frontend d'invitation.
    function sendInvitation(
        event: React.FormEvent<HTMLFormElement>,
    ) {

        event.preventDefault();

        if (
            !conversationName.trim() ||
            !inviteMessage
        ) {
            return;
        }

        console.log({
            targetMessage:
            inviteMessage,

            conversationName:
                conversationName.trim(),
        });

        setConversationName("");

        setInviteMessage(null);
    }


    // ======================================================
    // ENVOIE UN MESSAGE
    // ======================================================

    async function handleSendMessage() {

        if (!groupId) return;

        if (
            !messageText.trim() &&
            !selectedFile
        ) {
            return;
        }

        setSending(true);

        try {

            const createdMessage =
                await sendMessage(
                    groupId,
                    messageText,
                    replyingTo?.id ??
                    null,
                    selectedFile,
                );


            // Affichage immédiat sans attendre Realtime.
            setMessages(
                (current) => {

                    if (
                        current.some(
                            (item) =>
                                item.id ===
                                createdMessage.id,
                        )
                    ) {
                        return current;
                    }

                    return updateMessageDates([
                        ...current,
                        createdMessage,
                    ]);
                },
            );


            setMessageText("");

            setSelectedFile(null);

            setReplyingTo(null);

        } catch (error) {

            console.error(
                "Erreur envoi message :",
                error,
            );

        } finally {

            setSending(false);
        }
    }


    // ======================================================
    // JSX
    // ======================================================

    return (

        <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-100">


            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="z-20 shrink-0 border-b border-slate-200 bg-white">

                <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-3 sm:px-5">

                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">

                        <Link
                            to="/home"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
                        >
                            <ArrowLeft
                                size={22}
                            />
                        </Link>


                        <Link
                            to={`/gdetailp/${groupId}`}
                            className="flex min-w-0 items-center gap-3"
                        >

                            {/* Couleur du groupe */}

                            <div
                                className="flex h-14 w-14 items-center justify-center rounded-2xl sm:h-12 sm:w-12"
                                style={{
                                    backgroundColor:
                                        group?.color ??
                                        "#0EA5E9",
                                }}
                            >

                                <img
                                    src={icon}
                                    alt=""
                                    className="h-10 w-10"
                                    draggable={false}
                                />

                            </div>


                            {/* Nom + membres */}

                            <div className="min-w-0">

                                <h1 className="truncate font-bold text-slate-900">

                                    {group?.name ??
                                        "Chargement..."}

                                </h1>

                                <p className="truncate text-sm text-emerald-500">

                                    {group?.members ??
                                        0}{" "}

                                    {group?.members ===
                                    1
                                        ? "membre"
                                        : "membres"}

                                </p>
                            </div>
                        </Link>

                    </div>


                    <Link to={`/gdetailp/${groupId}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
                    >
                        <Settings
                            size={21}
                        />
                    </Link>
                </div>

            </header>

            {/* MESSAGES*/}
            <section className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">

                <div className="mx-auto w-full max-w-4xl space-y-4">

                    {messages.map(
                        (message) => (
                            <div key={message.id }>

                                                         {/* DATE*/}
                                {message.date && (
                                    <div className="my-6 flex items-center gap-3">
                                        <div className="h-px flex-1 bg-slate-200" />

                                        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">
                                            {
                                                message.date
                                            }
                                        </span>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                )}


                                                           {/* BARRE NON LUS*/}
                                {message.id ===
                                    firstUnreadMessageId && (

                                        <div className="my-5 flex items-center gap-3">
                                            <div className="h-px flex-1 bg-sky-300" />
                                            <span className="rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold text-sky-600">
                                            Non lus
                                        </span>
                                            <div className="h-px flex-1 bg-sky-300" />
                                        </div>
                                    )}


                                                 {/* POSITION GAUCHE / DROITE*/}
                                <div
                                    className={`flex ${
                                        message.me
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >

                                    {/* BULLE */}
                                    <div
                                        onContextMenu={(
                                            event,
                                        ) => {

                                            event.preventDefault();

                                            openMenu(
                                                event.clientX,
                                                event.clientY,
                                                message,
                                            );
                                        }}

                                        onTouchStart={(
                                            event,
                                        ) =>
                                            handleTouchStart(
                                                event,
                                                message,
                                            )
                                        }
                                        onTouchEnd={cancelLongPress }
                                        onTouchMove={cancelLongPress}
                                        onTouchCancel={cancelLongPress }
                                        className={`max-w-[86%] cursor-pointer rounded-3xl px-4 py-3 text-white shadow-sm select-none sm:max-w-[70%] sm:px-5 ${
                                            message.me
                                                ? "rounded-br-lg"
                                                : "rounded-bl-lg"
                                        }`}
                                        // Couleur personnelle du membre.
                                        style={{
                                            backgroundColor:
                                                message.color ??
                                                "#0EA5E9",
                                        }}
                                    >

                                        {/* NOM DE L'AUTEUR */}
                                        {!message.me &&
                                            message.name && (
                                                <p className="mb-1 text-sm font-bold text-white">
                                                    {
                                                        message.name
                                                    }
                                                </p>
                                            )}

                                        {/* MESSAGE CITÉ */}
                                        {message.replyTo && (

                                            <div className="mb-2 rounded-xl border-l-4 border-white/80 px-3 py-2"
                                                // La réponse reprend la couleur de l'auteur cité
                                                style={{
                                                    backgroundColor:
                                                    message
                                                        .replyTo
                                                        .color,
                                                }}
                                            >
                                                <p className="text-xs font-bold text-white">
                                                    {
                                                        message
                                                            .replyTo
                                                            .name
                                                    }
                                                </p>
                                                <p className="mt-0.5 line-clamp-2 text-xs text-white/90">
                                                    {
                                                        message
                                                            .replyTo
                                                            .text
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {/*TEXTE*/}
                                        <p className="whitespace-pre-wrap break-words text-sm leading-6 sm:text-base">

                                            {
                                                message.content
                                            }

                                        </p>

                                        {/* ATTACHMENTS*/}

                                        {message.attachments.map(
                                            (
                                                attachment,
                                            ) => {

                                                const isImage =
                                                    attachment.fileType.startsWith(
                                                        "image/",
                                                    );


                                                // IMAGE
                                                if (isImage) {

                                                    return (
                                                        <a
                                                            key={
                                                                attachment.id
                                                            }
                                                            href={
                                                                attachment.signedUrl
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-3 block overflow-hidden rounded-2xl"
                                                        >

                                                            <img
                                                                src={
                                                                    attachment.signedUrl
                                                                }
                                                                alt={
                                                                    attachment.fileName
                                                                }
                                                                className="max-h-80 w-full object-cover"
                                                            />

                                                        </a>

                                                    );
                                                }


                                                // FICHIER

                                                return (

                                                    <a
                                                        key={
                                                            attachment.id
                                                        }
                                                        href={
                                                            attachment.signedUrl
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-3 flex items-center gap-3 rounded-xl bg-white/15 p-3"
                                                    >

                                                        <FileText
                                                            size={
                                                                21
                                                            }
                                                        />

                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">

                                                            {
                                                                attachment.fileName
                                                            }

                                                        </span>

                                                    </a>

                                                );
                                            },
                                        )}


                                        {/* ==================
                                            HEURE + LECTURE
                                        ================== */}

                                        <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-white/80">

                                            <span>

                                                {
                                                    message.time
                                                }

                                            </span>


                                            {/* Seulement sur mes messages */}

                                            {message.me && (

                                                <>

                                                    {/*
                                                        ✓  = personne n'a encore lu
                                                        ✓✓ = au moins une personne a lu
                                                    */}

                                                    <span
                                                        className={`font-bold ${
                                                            message.readCount >
                                                            0
                                                                ? "tracking-[-3px]"
                                                                : ""
                                                        }`}
                                                    >

                                                        {message.readCount >
                                                        0
                                                            ? "✓✓"
                                                            : "✓"}

                                                    </span>

                                                    {/* Nombre de lecteurs */}

                                                    {message.readCount >
                                                        0 && (

                                                            <span className="ml-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">

                                                            {
                                                                message.readCount
                                                            }

                                                        </span>

                                                        )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        ),
                    )}

                    {/* Cible du scroll automatique */}
                    <div ref={ messagesEndRef } />

                                         {/* Chargement */}
                    {loadingMessages && (
                        <div className="flex justify-center py-10">

                            <LoaderCircle size={28} className="animate-spin text-sky-500"
                            />
                        </div>
                    )}
                </div>

            </section>

                                 {/* APERÇU RÉPONSE*/}
            {replyingTo && (

                <div className="mx-auto mb-2 flex w-full max-w-4xl items-center gap-3 rounded-2xl border-l-4 border-sky-500 bg-sky-50 px-4 py-3">

                    <Reply size={18} className="shrink-0 text-sky-500" />

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-sky-600">
                            Réponse à{" "}

                            {replyingTo.me
                                ? "vous"
                                : replyingTo.name}
                        </p>

                        <p className="truncate text-sm text-slate-500">
                            {
                                replyingTo.content
                            }
                        </p>
                    </div>

                    <button type="button" onClick={() =>
                            setReplyingTo(
                                null,
                            )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* FOOTER / INPUT */}
            <footer className="z-20 shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">


                {/* FICHIER SÉLECTIONNÉ */}
                {selectedFile && (

                    <div className="mx-auto mb-2 flex w-full max-w-4xl items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">

                        <FileText size={19} className="shrink-0 text-sky-500" />

                        <p className="min-w-0 flex-1 truncate text-sm text-slate-600">
                            {
                                selectedFile.name
                            }
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setSelectedFile(
                                    null,
                                )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="mx-auto flex w-full max-w-4xl items-end gap-2 rounded-[1.75rem] bg-slate-100 px-3 py-2">

                    {/* INPUT FILE CACHÉ */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt"

                        onChange={(
                            event,
                        ) => {

                            const file =
                                event.target
                                    .files?.[0] ??
                                null;

                            setSelectedFile(
                                file,
                            );

                            // Permet de sélectionner deux fois le même fichier
                            event.target.value =
                                "";
                        }}
                    />


                    {/* TROMBONE */}

                    <button type="button" onClick={() => fileInputRef.current?.click() }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-sky-500"
                    >
                        <Paperclip size={21}/>
                    </button>


                    {/* MESSAGE */}

                    <textarea
                        rows={1}
                        value={messageText}

                        onChange={(
                            event,
                        ) =>
                            setMessageText(
                                event.target
                                    .value,
                            )
                        }
                        onKeyDown={(
                            event,
                        ) => {

                            // Entrée = envoyer.
                            // Shift + Entrée = nouvelle ligne.
                            if (
                                event.key ===
                                "Enter" &&
                                !event.shiftKey
                            ) {
                                event.preventDefault();
                                void handleSendMessage();
                            }
                        }}
                        placeholder="Écrire un message..."
                        className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                    />

                    {/* ENVOYER */}

                    <button type="button" onClick={() => void handleSendMessage() }
                        disabled={
                            sending ||
                            (!messageText.trim() &&
                                !selectedFile)
                        }
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                        {sending ? (
                            <LoaderCircle size={19} className="animate-spin"/>
                        ) : (
                            <Send size={19}/>
                        )}
                    </button>
                </div>
            </footer>

            {/* MENU CONTEXTUEL */}
            {menu && (
                <div className="fixed inset-0 z-50" onClick={() => setMenu(null)}

                    onContextMenu={(
                        event,
                    ) => {
                        event.preventDefault();
                        setMenu(null);
                    }}
                >
                    <div style={{
                            left: menu.x,
                            top: menu.y,
                        }}
                        onClick={(event,) => event.stopPropagation() }
                        className="absolute min-w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl"
                    >

                        {/* RÉPONDRE */}
                        <button type="button" onClick={ answerMessage }
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            <Reply size={19} className="text-sky-500" />
                            Répondre
                        </button>

                        {/* COPIER */}

                        <button type="button" onClick={copyMessage}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            <Copy size={19} className="text-sky-500"/>
                            Copier
                        </button>

                        {!menu.message.me && (

                            <button type="button" onClick={openInvitation}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                                <UserPlus size={19} className="text-sky-500"/>
                                Inviter
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/*DIALOGUE INVITATION PRIVÉE*/}

            {inviteMessage && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
                    onClick={() => setInviteMessage(
                            null,
                        )
                    }>
                    <form onSubmit={sendInvitation} onClick={(event,) =>
                            event.stopPropagation() }
                        className="w-full max-w-md rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem]"
                    >

                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Nouvelle conversation
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Invitation destinée à{" "}
                                    {inviteMessage.name ??
                                        "ce membre"}
                                </p>
                            </div>

                            <button type="button" onClick={() => setInviteMessage(null,)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
                            >
                                <X size={21}/>
                            </button>
                        </div>

                        <label htmlFor="conversationName" className="mt-7 block text-sm font-bold text-slate-700">
                            Nom de la conversation
                        </label>
                        <input id="conversationName" value={conversationName}
                            onChange={(event,) =>
                                setConversationName(
                                    event.target
                                        .value,)
                            }
                            maxLength={40}
                            autoFocus
                            placeholder="Ex. Projet RAG"
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />

                        <button type="submit" disabled={ !conversationName.trim()}
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