const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const id = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

function fixture({ enabled = true, expired = false, read = false, kind = "reply", deadDevice = false } = {}) {
    const deliveries = [], removed = [];
    let handler;
    const env = { FUN_WEBHOOK_SECRET: "a".repeat(40), SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-only", VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private", VAPID_SUBJECT: "mailto:test@example.com" };
    const client = { from(table) {
        const filters = [];
        const query = {
            select() { return query; }, eq(key, value) { filters.push([key, value]); return query; },
            delete() { removed.push({ table, filters }); return query; }, limit() { return query; },
            async maybeSingle() {
                return { error: null, data: table === "story_notifications" ? { id: id(1), recipient_id: "saved-owner", story_id: id(2), comment_id: id(3), kind, read_at: read ? new Date().toISOString() : null }
                    : table === "storytimes" ? { expires_at: new Date(Date.now() + (expired ? -1000 : 100000)).toISOString() } : { notifications_enabled: enabled, language: "de" } };
            },
            then(resolve, reject) { return Promise.resolve({ error: null, data: table === "push_subscriptions" ? [
                { endpoint: "https://web.push.apple.com/device", p256dh: "device", auth: "auth" },
                { endpoint: "https://push.apple.com.attacker.example/device", p256dh: "invalid", auth: "invalid" },
            ] : null }).then(resolve, reject); },
        };
        return query;
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync("supabase/functions/notify-story/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
        exports: {}, Response, Request, TextEncoder, Uint8Array, URL, crypto: globalThis.crypto,
        Deno: { env: { get: key => env[key] }, serve: callback => { handler = callback; } },
        require(name) {
            if (name.startsWith("npm:@supabase")) return { createClient: () => client };
            if (name.startsWith("npm:web-push")) return { __esModule: true, default: { setVapidDetails() {}, async sendNotification(device, payload) { if (deadDevice) throw { statusCode: 410 }; deliveries.push({ device, payload: JSON.parse(payload) }); } } };
            throw Error(name);
        },
    });
    const invoke = (secret = env.FUN_WEBHOOK_SECRET) => handler(new Request("https://edge.example/notify-story", { method: "POST", headers: { "x-tellme-hook": secret }, body: JSON.stringify({ type: "INSERT", schema: "public", table: "story_notifications", record: { id: id(1), recipient_id: "forged-owner", content: "Private comment", display_name: "Hidden nickname" } }) }));
    return { invoke, deliveries, removed };
}

test("Story push authenticates the hook, reads the actual recipient, and never sends comment text or identity", async () => {
    const server = fixture();
    assert.equal((await server.invoke("invalid")).status, 401);
    assert.equal((await server.invoke()).status, 200);
    assert.equal(server.deliveries.length, 1);
    const result = server.deliveries[0];
    assert.equal(result.payload.body, "Jemand hat auf deinen Kommentar geantwortet.");
    assert.deepEqual(result.payload, { title: "TellMe", body: "Jemand hat auf deinen Kommentar geantwortet.", type: "story", storyId: id(2), commentId: id(3), notificationId: id(1) });
    assert(!JSON.stringify(result).includes("Private comment")); assert(!JSON.stringify(result).includes("Hidden nickname"));
});
test("Story push respects opt-out, read state and expiry, and removes dead subscriptions for their saved owner", async () => {
    for (const config of [{ enabled: false }, { expired: true }, { read: true }]) {
        const server = fixture(config); assert.equal((await server.invoke()).status, 200); assert.equal(server.deliveries.length, 0);
    }
    const dead = fixture({ deadDevice: true }); assert.equal((await dead.invoke()).status, 200);
    assert.equal(dead.removed.length, 1); assert(dead.removed[0].filters.some(([key, value]) => key === "user_id" && value === "saved-owner"));
});
test("Story push opens the right comments; foreground delivery avoids a duplicate system notification", async () => {
    const callbacks = {}, shown = [], posted = []; let visible = false, destination, completion;
    const worker = { location: { origin: "https://tellme.example" }, addEventListener: (name, fn) => { callbacks[name] = fn; }, registration: { showNotification: async (title, data) => { shown.push(data); } },
        clients: { matchAll: async () => visible ? [{ visibilityState: "visible", postMessage: message => posted.push(message) }] : [], openWindow: async url => { destination = url; } } };
    vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), { self: worker, URL });
    const payload = { title: "TellMe", body: "Un commentaire", type: "story", storyId: id(2), commentId: id(3) };
    const push = async () => { callbacks.push({ data: { json: () => payload }, waitUntil: value => { completion = value; } }); await completion; };
    await push(); assert.equal(shown.length, 1); assert.equal(shown[0].silent, false);
    callbacks.notificationclick({ notification: { close() {}, data: shown[0].data }, waitUntil: value => { completion = value; } }); await completion;
    assert.equal(destination, `https://tellme.example/storys?story=${id(2)}&comment=${id(3)}`);
    visible = true; await push(); assert.equal(shown.length, 1); assert.equal(posted.length, 1); assert.equal(posted[0].type, "tellme-story-push");
    visible = false; payload.storyId = "https://outside.example"; await push();
    callbacks.notificationclick({ notification: { close() {}, data: shown.at(-1).data }, waitUntil: value => { completion = value; } }); await completion;
    assert.equal(destination, "https://tellme.example/home");
});
test("foreground sound requires a user gesture and respects mute, hidden state and throttling", () => {
    const events = new Map(), saved = new Map(); let notes = 0;
    class AudioContext {
        state = "running"; currentTime = 0; destination = {};
        createOscillator() { return { frequency: {}, connect() {}, start() { notes++; }, stop() {} }; }
        createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    const exports = {}, document = { hidden: false };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/services/notificationSound.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
        exports, document, localStorage: { getItem: key => saved.get(key) }, Event,
        window: { AudioContext, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name), dispatchEvent() {} },
        require() { return { setDevicePreference: (key, value) => saved.set(key, value) }; },
    });
    const cleanup = exports.prepareNotificationSound(); exports.playNotificationSound(); assert.equal(notes, 0);
    events.get("pointerdown")(); exports.playNotificationSound(); assert.equal(notes, 2);
    exports.playNotificationSound(); assert.equal(notes, 2);
    exports.setNotificationSound(false); assert.equal(exports.notificationSoundEnabled(), false); exports.playNotificationSound(); assert.equal(notes, 2);
    document.hidden = true; exports.setNotificationSound(true); exports.playNotificationSound(); assert.equal(notes, 2);
    cleanup(); assert.equal(events.size, 0);
});
