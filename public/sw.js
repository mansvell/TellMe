self.addEventListener("install", event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});

function notificationPath(data) {
    const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value ?? "");
    if (data?.type === "story" && uuid(data.storyId)) {
        return `/storys?story=${data.storyId}${uuid(data.commentId) ? `&comment=${data.commentId}` : ""}`;
    }
    if (data?.type === "secret" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.secretId ?? "")) {
        return `/fun?secret=${data.secretId}`;
    }
    const groupId = data?.groupId;
    return typeof groupId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId)
        ? `/chat/${groupId}`
        : "/home";
}

self.addEventListener("push", event => {
    let payload = {};
    try {
        payload = event.data?.json() ?? {};
    } catch {
        // Affiche aussi une notification si le serveur n'envoie pas de JSON.
    }

    const { title, body, groupId } = payload;
    const url = notificationPath(payload);
    event.waitUntil((async () => {
        if (payload.type === "story") {
            const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            const visible = windows.filter(client => client.visibilityState === "visible");
            if (visible.length) {
                visible.forEach(client => client.postMessage({ type: "tellme-story-push" }));
                return;
            }
        }
        return self.registration.showNotification(
        typeof title === "string" && title.trim() ? title : "TellMe",
        {
            body: typeof body === "string" && body.trim() ? body : "Tu as reçu un nouveau message.",
            icon: "/tellme-icon-192.png",
            badge: "/tellme-icon-192.png",
            tag: payload.type === "story" ? `tellme-story-${payload.storyId}` : payload.type === "secret" ? "tellme-secret" : url === "/home" ? "tellme-message" : `tellme-chat-${groupId}`,
            renotify: true,
            vibrate: [150, 80, 150],
            silent: false,
            data: { groupId, type: payload.type, secretId: payload.secretId, storyId: payload.storyId, commentId: payload.commentId },
        },
        );
    })());
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    const destination = new URL(notificationPath(event.notification.data), self.location.origin).href;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const match = windows.find(client => client.url === destination);
        if (match) return match.focus();
        for (const client of windows) {
            try {
                const opened = await client.navigate(destination);
                if (opened) return opened.focus();
            } catch {
                // Un onglet déjà fermé ne doit pas empêcher l'ouverture du chat.
            }
        }
        return self.clients.openWindow(destination);
    })());
});
