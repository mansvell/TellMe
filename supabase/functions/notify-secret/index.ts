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
    if (event?.type !== "INSERT" || event?.table !== "secrets" || event?.schema !== "public" ||
        !/^[0-9a-f-]{36}$/i.test(event?.record?.id ?? "")) return response(400, { error: "INVALID_EVENT" });

    const apiUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT");
    if (!apiUrl || !serviceKey || !publicKey || !privateKey || !subject) return response(503, { error: "PUSH_NOT_CONFIGURED" });

    try {
        const db = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: secret, error } = await db.from("secrets").select("id,recipient_id,read_at").eq("id", event.record.id).maybeSingle();
        if (error) throw error;
        if (!secret || secret.read_at) return response(200, { sent: 0 });

        const [profile, devices] = await Promise.all([
            db.from("profiles").select("notifications_enabled,language").eq("id", secret.recipient_id).maybeSingle(),
            db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", secret.recipient_id).limit(100),
        ]);
        if (profile.error) throw profile.error;
        if (devices.error) throw devices.error;
        if (!profile.data || profile.data.notifications_enabled === false) return response(200, { sent: 0 });

        const messages: Record<string, string> = {
            fr: "Tu as reçu un nouveau Secret.",
            en: "You received a new Secret.",
            de: "Du hast ein neues Secret erhalten.",
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
                    body: messages[profile.data.language] ?? messages.fr,
                    type: "secret",
                    secretId: secret.id,
                }), { TTL: 3600, urgency: "normal", timeout: 8000 });
                sent++;
            } catch (failure) {
                const status = (failure as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                    const removed = await db.from("push_subscriptions").delete().eq("user_id", secret.recipient_id).eq("endpoint", device.endpoint);
                    if (removed.error) failed++;
                } else failed++;
            }
        }
        return response(failed ? 503 : 200, { sent, failed });
    } catch {
        return response(503, { error: "DELIVERY_FAILED" });
    }
});
