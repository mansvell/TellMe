import { ArrowLeft, Check, Search, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { SettingsTabContext } from "../components/AppTabsLayout";
import { profileAvatarStyle } from "../utils/profileColors";
import { t } from "../i18n/runtime";
import { findUsers, inviteUser, type DiscoveredUser } from "../services/discovery";

export default function DiscoverPage() {
    const { profile } = useOutletContext<SettingsTabContext>();
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<DiscoveredUser[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [selected, setSelected] = useState<DiscoveredUser | null>(null);
    const [name, setName] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [notice, setNotice] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        let active = true;

        const timer = window.setTimeout(async () => {
            try {
                const result = await findUsers(search, page);
                if (!active) return;
                setUsers(current => {
                    if (page === 0) return result.users;
                    const ids = new Set(current.map(user => user.id));
                    return [...current, ...result.users.filter(user => !ids.has(user.id))];
                });
                setHasMore(result.hasMore);
            } catch (failure) {
                console.error("Erreur chargement utilisateurs :", failure);
                if (active) setError(true);
            } finally {
                if (active) setLoading(false);
            }
        }, page === 0 ? 250 : 0);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [search, page, retry]);

    useEffect(() => {
        if (selected) dialogRef.current?.showModal();
        else dialogRef.current?.close();
    }, [selected]);

    function changeSearch(value: string) {
        setSearch(value);
        setPage(0);
        setUsers([]);
        setHasMore(false);
        setError(false);
        setLoading(true);
    }

    function openInvitation(user: DiscoveredUser) {
        setName("");
        setSendError("");
        setNotice("");
        setSelected(user);
    }

    async function send(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selected || sending || name.trim().length < 2 || name.trim().length > 80) return;

        setSending(true);
        setSendError("");
        try {
            await inviteUser(selected.id, name);
            setUsers(current => current.map(user => user.id === selected.id ? { ...user, invitation_status: "sent" } : user));
            setSelected(null);
            setNotice(t("Invitation envoyée."));
        } catch (failure) {
            const code = (failure as { message?: string })?.message ?? "";
            if (code.includes("INVITATION_PENDING")) setSendError(t("Une invitation est déjà en attente."));
            else if (code.includes("INVITATION_LIMIT")) setSendError(t("Trop d’invitations. Réessaie plus tard."));
            else if (code.includes("USER_UNAVAILABLE")) setSendError(t("Cet utilisateur n’autorise pas les invitations."));
            else setSendError(t("Impossible d’envoyer l’invitation."));
        } finally {
            setSending(false);
        }
    }

    return (
        <main className="min-h-full bg-white pb-6 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            <header className="flex h-16 items-center gap-3 px-4 sm:px-5">
                <Link to="/home" aria-label={t("Retour")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                    <ArrowLeft size={22} />
                </Link>
                <h1 className="text-xl font-bold">{t("Découvrir")}</h1>
            </header>

            <section aria-label={t("Rechercher un utilisateur")} className="mx-auto max-w-3xl px-4 pt-2 sm:px-5">
                <label className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 focus-within:ring-2 focus-within:ring-sky-500 dark:bg-slate-900">
                    <Search size={19} aria-hidden="true" className="text-slate-500 dark:text-slate-400" />
                    <span className="sr-only">{t("Rechercher un utilisateur")}</span>
                    <input ref={searchRef} type="search" value={search} onChange={event => changeSearch(event.target.value)} maxLength={80}
                        placeholder={t("Rechercher un pseudo...")} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>

                {notice && <p role="status" className="mt-3 text-sm text-sky-700 dark:text-sky-300">{notice}</p>}

                <ul aria-busy={loading} className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">
                    {users.map(user => (
                        <li key={user.id} className="flex min-h-16 items-center gap-3 py-2.5">
                            <span aria-hidden="true" style={profileAvatarStyle(user.color)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold">
                                {Array.from(user.display_name)[0]?.toUpperCase()}
                            </span>
                            <h2 className="min-w-0 flex-1 truncate font-semibold">{user.display_name}</h2>
                            {user.invitation_status === "received" ? (
                                <Link to="/invit" className="shrink-0 text-sm font-semibold text-sky-700 dark:text-sky-300">
                                    {t("Invitation reçue")}
                                </Link>
                            ) : (
                                <button type="button" disabled={user.invitation_status === "sent"} onClick={() => openInvitation(user)}
                                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold
                                        text-sky-700 hover:bg-sky-50 disabled:text-slate-500 dark:text-sky-300 dark:hover:bg-slate-700
                                        dark:disabled:text-slate-400">
                                    {user.invitation_status === "sent" ? <Check size={16} /> : <UserPlus size={16} />}
                                    {user.invitation_status === "sent" ? t("Envoyée") : t("Inviter")}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>

                {error && (
                    <div role="alert" className="py-6 text-center text-sm">
                        <p>{t("Impossible de charger les utilisateurs.")}</p>
                        <button type="button" onClick={() => { setError(false); setLoading(true); setRetry(value => value + 1); }}
                            className="mt-2 font-semibold text-sky-700 dark:text-sky-300">
                            {t("Réessayer")}
                        </button>
                    </div>
                )}

                {loading && !hasMore && <p role="status" className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("Chargement...")}</p>}
                {!loading && !error && users.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("Aucun utilisateur trouvé.")}</p>
                )}
                {hasMore && !error && (
                    <button type="button" disabled={loading} onClick={() => { setLoading(true); setPage(value => value + 1); }}
                        className="mx-auto mt-4 block min-h-11 rounded-xl bg-sky-700 px-6 text-sm font-semibold text-white shadow-sm
                            transition-colors hover:bg-sky-800 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500">
                        {loading ? t("Chargement...") : t("Voir plus")}
                    </button>
                )}
            </section>

            <dialog ref={dialogRef} aria-labelledby="discovery-invite-title"
                onCancel={event => { if (sending) event.preventDefault(); else setSelected(null); }}
                onClose={() => { setSelected(null); searchRef.current?.focus({ preventScroll: true }); }}
                className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 text-slate-900
                    shadow-xl backdrop:bg-slate-950/60 dark:bg-slate-900 dark:text-white">
                <form onSubmit={event => void send(event)}>
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="discovery-invite-title" className="text-xl font-bold">{t("Nouvelle conversation")}</h2>
                        <button type="button" disabled={sending} onClick={() => setSelected(null)} aria-label={t("Fermer")} className="p-2">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="mt-3 break-words text-slate-500 dark:text-slate-400">{selected?.display_name}</p>
                    <label htmlFor="discovery-name" className="mt-6 block text-sm font-semibold">{t("Nom de la conversation")}</label>
                    <input autoFocus id="discovery-name" required minLength={2} maxLength={80}
                        value={name} onChange={event => setName(event.target.value)}
                        placeholder={`${profile?.displayName ?? t("Ton pseudo")} & ${selected?.display_name ?? t("Son pseudo")}`}
                        className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" />
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        {t("Une nouvelle conversation n’est créée que lorsque l’invitation est acceptée.")}
                    </p>
                    {sendError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{sendError}</p>}
                    <button type="submit" disabled={sending || name.trim().length < 2}
                        className="mt-6 w-full rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800 disabled:opacity-50">
                        {sending ? t("Envoi...") : t("Envoyer l’invitation")}
                    </button>
                </form>
            </dialog>
        </main>
    );
}
