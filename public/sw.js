// ============================================================
// TELLME SERVICE WORKER
// Reçoit les notifications même lorsque TellMe n'est pas ouvert.
// ============================================================

self.addEventListener("push", (event) => {

    if (!event.data) {
        return;
    }

    let payload;

    try {

        payload = event.data.json();

    } catch {

        payload = {
            title: "TellMe",
            body: "Tu as reçu un nouveau message.",
            groupId: null,
        };
    }


    const title =
        payload.title ?? "TellMe";


    const options = {

        body:
            payload.body ??
            "Tu as reçu un nouveau message.",

        icon:
            "/icon.png",

        badge:
            "/icon.png",

        tag:
            payload.groupId
                ? `tellme-group-${payload.groupId}`
                : "tellme-message",

        renotify: true,

        data: {

            groupId:
                payload.groupId ?? null,

            url:
                payload.groupId
                    ? `/chat/${payload.groupId}`
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


// ============================================================
// CLIC SUR LA NOTIFICATION
// ============================================================

self.addEventListener(
    "notificationclick",
    (event) => {

        event.notification.close();


        const targetUrl =
            event.notification.data?.url ??
            "/home";


        event.waitUntil(

            clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true,
                })
                .then((windowClients) => {

                    // Si TellMe est déjà ouvert.
                    for (const client of windowClients) {

                        if ("focus" in client) {

                            client.navigate(targetUrl);

                            return client.focus();
                        }
                    }


                    // Sinon on ouvre TellMe.
                    if (clients.openWindow) {

                        return clients.openWindow(
                            targetUrl,
                        );
                    }

                    return undefined;
                }),

        );

    },
);