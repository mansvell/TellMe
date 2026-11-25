import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import webpush from "npm:web-push@3.6.7";

const response = (status: number, data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

async function validSecret(actual: string, expected: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const [left, right] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(actual)),
        crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    ]);
    const a = new Uint8Array(left), b = new Uint8Array(right);
    let different = 0;
    for (let index = 0; index < a.length; index++) different |= a[index] ^ b[index];
    return different === 0;
}

function validEndpoint(value: string): boolean {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
        return ["fcm.googleapis.com", "push.apple.com", "push.services.mozilla.com", "notify.windows.com"]
            .some(host => url.hostname === host || url.hostname.endsWith("." + host));
    } catch { return false; }
}

Deno.serve(async request => {
    const hookSecret = Deno.env.get("FUN_WEBHOOK_SECRET");
    if (!hookSecret || hookSecret.length < 32) return response(503, { error: "WEBHOOK_NOT_CONFIGURED" });
    if (request.method !== "POST") return response(405, { error: "METHOD_NOT_ALLOWED" });
    if (!await validSecret(request.headers.get("x-tellme-hook") ?? "", hookSecret)) return response(401, { error: "UNAUTHORIZED" });

    const raw = await request.text();
    if (raw.length > 16_384) return response(413, { error: "PAYLOAD_TOO_LARGE" });
    let event;
    try { event = JSON.parse(raw); } catch { return response(400, { error: "INVALID_JSON" }); }
    if (event?.type !== "INSERT" || event?.table !== "story_notifications" || event?.schema !== "public" ||
        !/^[0-9a-f-]{36}$/i.test(event?.record?.id ?? "")) return response(400, { error: "INVALID_EVENT" });

    const apiUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT");
    if (!apiUrl || !serviceKey || !publicKey || !privateKey || !subject) return response(503, { error: "PUSH_NOT_CONFIGURED" });

    try {
        const db = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: notification, error } = await db.from("story_notifications").select("id,recipient_id,story_id,comment_id,kind,read_at").eq("id", event.record.id).maybeSingle();
        if (error) throw error;
        if (!notification || notification.read_at) return response(200, { sent: 0 });

        const { data: story, error: storyError } = await db.from("storytimes").select("expires_at").eq("id", notification.story_id).maybeSingle();
        if (storyError) throw storyError;
        if (!story || Date.parse(story.expires_at) <= Date.now()) return response(200, { sent: 0 });
        const [profile, devices] = await Promise.all([
            db.from("profiles").select("notifications_enabled,language").eq("id", notification.recipient_id).maybeSingle(),
            db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", notification.recipient_id).limit(100),
        ]);
        if (profile.error) throw profile.error;
        if (devices.error) throw devices.error;
        if (!profile.data || profile.data.notifications_enabled === false) return response(200, { sent: 0 });

        const messages: Record<string, Record<string, string>> = {
            fr: { comment: "Nouveau commentaire sur ta Story.", reply: "Quelqu’un a répondu à ton commentaire.", story_reply: "Quelqu’un a répondu à ton commentaire en Story." },
            en: { comment: "New comment on your Story.", reply: "Someone replied to your comment.", story_reply: "Someone replied to your comment in a Story." },
            de: { comment: "Neuer Kommentar zu deiner Story.", reply: "Jemand hat auf deinen Kommentar geantwortet.", story_reply: "Jemand hat in einer Story auf deinen Kommentar geantwortet." },
        };
        webpush.setVapidDetails(subject, publicKey, privateKey);
        let sent = 0, failed = 0;
        for (const device of devices.data ?? []) {
            if (!validEndpoint(device.endpoint)) continue;
            try {
                await webpush.sendNotification({
                    endpoint: device.endpoint,
                    keys: { p256dh: device.p256dh, auth: device.auth },
                }, JSON.stringify({
                    title: "TellMe",
                    body: (messages[profile.data.language] ?? messages.fr)[notification.kind] ?? messages.fr.comment,
                    type: "story",
                    storyId: notification.story_id,
                    commentId: notification.comment_id,
                    notificationId: notification.id,
                }), { TTL: 3600, urgency: "normal", timeout: 8000 });
                sent++;
            } catch (failure) {
                const status = (failure as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                    const removed = await db.from("push_subscriptions").delete().eq("user_id", notification.recipient_id).eq("endpoint", device.endpoint);
                    if (removed.error) failed++;
                } else failed++;
            }
        }
        return response(failed ? 503 : 200, { sent, failed });
    } catch {
        return response(503, { error: "DELIVERY_FAILED" });
    }
});
