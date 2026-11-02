import { t } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Search, UserPlus, Users, X } from "lucide-react";
import BottomNavigation from "../components/BottomNavigation";
import { findUsers, inviteUser, type DiscoveredUser } from "../services/discovery";

export default function DiscoverPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<DiscoveredUser[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [selected, setSelected] = useState<DiscoveredUser | null>(null);
    const [name, setName] = useState("");
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(async () => {
            setLoading(true); setError("");
            try {
                const rows = await findUsers(search, page * 24);
                if (!active) return;
                setUsers(current => page === 0 ? rows : [...current, ...rows.filter(row => !current.some(user => user.id === row.id))]);
                setHasMore(rows.length === 24);
            } catch {
                if (active) setError(t("Impossible de charger les utilisateurs."));
            } finally { if (active) setLoading(false); }
        }, 250);
        return () => { active = false; window.clearTimeout(timer); };
    }, [search, page, retry]);
    useEffect(() => {
        if (selected) dialogRef.current?.showModal();
        else dialogRef.current?.close();
    }, [selected]);

    async function send(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selected || sending || name.trim().length < 2 || name.trim().length > 80) return;
        setSending(true); setNotice("");
        try {
            await inviteUser(selected.id, name);
            setUsers(current => current.map(user => user.id === selected.id ? { ...user, invitation_status: "sent" } : user));
            setSelected(null); setNotice(t("Invitation envoyée."));
        } catch (failure) {
            const code = (failure as { message?: string })?.message ?? "";
            setNotice(code.includes("INVITATION_PENDING") ? t("Une invitation est déjà en attente.") :
                code.includes("INVITATION_LIMIT") ? t("Trop d’invitations. Réessaie plus tard.") :
                code.includes("USER_UNAVAILABLE") ? t("Cet utilisateur n’autorise pas les invitations.") : t("Impossible d’envoyer l’invitation."));
        } finally { setSending(false); }
    }
    return <main className="min-h-dvh bg-slate-50 pb-28 text-slate-900 dark:bg-slate-950 dark:text-white">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex max-w-4xl items-center gap-4 px-5 py-5">
                <button type="button" onClick={() => navigate(-1)} aria-label={t("Retour")} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={22}/></button>
                <div><h1 className="text-xl font-black">{t("Trouver d’autres utilisateurs")}</h1><p className="mt-1 text-sm text-slate-500">{t("De nouvelles rencontres, toujours sous pseudo.")}</p></div>
            </div>
        </header>
        <section className="mx-auto max-w-4xl px-5 py-7">
            <div className="rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-500 p-6 text-white">
                <Users size={30}/><h2 className="mt-4 text-2xl font-black">{t("La communauté TellMe")}</h2>
                <p className="mt-2 text-sm leading-6">{t("Envoie une invitation. La conversation commence quand elle est acceptée.")}</p>
            </div>
            <label className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
                <Search size={20} className="text-slate-400"/><span className="sr-only">{t("Rechercher un utilisateur")}</span>
                <input ref={searchRef} value={search} onChange={event => { setLoading(true); setSearch(event.target.value); setPage(0); setUsers([]); }} maxLength={80} placeholder={t("Rechercher un pseudo...")} className="h-14 min-w-0 flex-1 bg-transparent outline-none"/>
            </label>
            {notice && <p role="status" className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm text-sky-700 dark:bg-sky-950 dark:text-sky-200">{notice}</p>}
            {error ? <div role="alert" className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700"><p>{error}</p><button type="button" onClick={() => setRetry(v => v + 1)} className="mt-3 font-bold underline">{t("Réessayer")}</button></div> : <>
                <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-busy={loading}>
                    {users.map(user => <article key={user.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(user.color) ? user.color : '#0EA5E9' }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white">{Array.from(user.display_name)[0]?.toUpperCase()}</div>
                        <div className="min-w-0 flex-1"><h3 className="truncate font-bold">{user.display_name}</h3><p className="mt-1 text-xs text-slate-500">{t("Membre TellMe")}</p></div>
                        {user.invitation_status === "received" ? <Link to="/invit" className="text-xs font-bold text-sky-600">{t("Invitation reçue")}</Link> : <button type="button" disabled={user.invitation_status === "sent"} onClick={() => { setName(""); setNotice(""); setSelected(user); }} className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 disabled:bg-slate-100 disabled:text-slate-400 dark:bg-sky-950 dark:disabled:bg-slate-800">
                            {user.invitation_status === "sent" ? <Check size={16}/> : <UserPlus size={16}/>}{user.invitation_status === "sent" ? t("Envoyée") : t("Inviter")}
                        </button>}
                    </article>)}
                </div>
                {loading && <p role="status" className="py-10 text-center text-slate-500">{t("Chargement...")}</p>}
                {!loading && users.length === 0 && <p className="py-12 text-center text-slate-500">{t("Aucun utilisateur trouvé.")}</p>}
                {!loading && hasMore && <button type="button" onClick={() => setPage(v => v + 1)} className="mx-auto mt-6 block rounded-xl bg-sky-500 px-5 py-3 font-bold text-white">{t("Voir plus")}</button>}
            </>}
        </section>
        <dialog ref={dialogRef} onCancel={event => { if (sending) event.preventDefault(); else setSelected(null); }} onClose={() => { setSelected(null); searchRef.current?.focus(); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:bg-slate-900 dark:text-white">
            <form onSubmit={event => void send(event)}>
                <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">{t("Nouvelle conversation")}</h2><button type="button" disabled={sending} onClick={() => setSelected(null)} aria-label={t("Fermer")} className="p-2"><X size={20}/></button></div>
                <p className="mt-3 break-words text-slate-500">{selected?.display_name}</p>
                <label className="mt-6 block text-sm font-bold" htmlFor="discovery-name">{t("Nom de la conversation")}</label>
                <input autoFocus id="discovery-name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 dark:border-slate-700"/>
                <p className="mt-3 text-sm text-slate-500">{t("Une nouvelle conversation n’est créée que lorsque l’invitation est acceptée.")}</p>
                {selected && notice && <p role="alert" className="mt-3 text-sm text-red-600">{notice}</p>}
                <button type="submit" disabled={sending || name.trim().length < 2} className="mt-6 w-full rounded-xl bg-sky-500 px-4 py-3 font-bold text-white disabled:opacity-40">{sending ? t("Envoi...") : t("Envoyer l’invitation")}</button>
            </form>
        </dialog>
        <BottomNavigation active="invitations"/>
    </main>;
}
