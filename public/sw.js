// Reçoit une notification push.
self.addEventListener("push", (event) => {

    if (!event.data) {
        return;
    }
    let payload;
    try {
        payload =
            event.data.json();

    } catch {
        payload = {
            title: "TellMe",
            body: "Tu as reçu un nouveau message.",
            groupId: null,
        };
    }

    const groupId =
        payload.groupId ?? null;

    const title =
        payload.title ?? "TellMe";

    const options = {
        // Texte principal.
        body:
            payload.body ??
            "Tu as reçu un nouveau message.",

        // Logo principal TellMe.
        icon:
            "/tellme-icon.png",

        // Petite icône système.
        badge:
            "/tellme-icon.png",

        // Regroupe les notifications du même groupe.
        tag:
            groupId
                ? `tellme-chat-${groupId}`
                : "tellme-message",

        // Une nouvelle notification du groupe
        // remplace/actualise la précédente.
        renotify: true,

        // Vibration mobile.
        vibrate: [
            150,
            80,
            150,
        ],

        // Informations utilisées au clic.
        data: {
            groupId,
            url:
                groupId
                    ? `/chat/${groupId}`
                    : "/home",
        },
    };

    event.waitUntil(
        self.registration.showNotification(
            title,
            options,
        ),
    );
});

// CLIC SUR LA NOTIFICATION
self.addEventListener(
    "notificationclick",
    (event) => {
        event.notification.close();
        const targetUrl =
            event.notification.data?.url ??
            "/home";

        // Transforme /chat/... en URL complète.
        const destination =
            new URL(
                targetUrl,
                self.location.origin,
            ).href;

        event.waitUntil(
            clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true,
                })
                .then(
                    async (windowClients) => {
                        // TellMe est déjà ouvert.
                        for (
                            const client
                            of windowClients
                            ) {

                            if (
                                "navigate" in client
                            ) {

                                await client.navigate(
                                    destination,
                                );
                                return client.focus();
                            }
                        }
                        // TellMe n'est pas ouvert.
                        return clients.openWindow(
                            destination,
                        );
                    },
                ),
        );
    },
);