// N'accepte que le code opaque ou un lien TellMe de l'origine actuelle/production.
// Aucun jeton de connexion n'est transporté dans une invitation.
export function invitationPath(input: string, origin = window.location.origin): string | null {
    const value = input.trim();
    if (/^[a-zA-Z0-9_-]{1,160}$/.test(value)) return `/join/${value}`;
    try {
        if (/\/(?:\.|%2e){1,2}(?:\/|$)/i.test(value)) return null;
        const url = new URL(value, origin);
        if (![origin, "https://tellmeall.vercel.app"].includes(url.origin) || !["https:", "http:"].includes(url.protocol)) return null;
        const code = url.pathname === "/join/preview" ? url.searchParams.get("token") : /^\/join\/([a-zA-Z0-9_-]{1,160})\/?$/.exec(url.pathname)?.[1];
        return code && /^[a-zA-Z0-9_-]{1,160}$/.test(code) ? `/join/${code}` : null;
    } catch { return null; }
}
