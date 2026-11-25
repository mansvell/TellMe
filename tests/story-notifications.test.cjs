const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const id = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

function fixture({ enabled = true, expired = false, read = false, kind = "reply", actor = null, deadDevice = false } = {}) {
    const deliveries = [], removed = [];
    let handler;
    const env = { FUN_WEBHOOK_SECRET: "a".repeat(40), SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-only", VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private", VAPID_SUBJECT: "mailto:test@example.com" };
    const client = { from(table) {
        const filters = [];
        const query = {
            select() { return query; }, eq(key, value) { filters.push([key, value]); return query; },
            delete() { removed.push({ table, filters }); return query; }, limit() { return query; },
            async maybeSingle() {
                return { error: null, data: table === "story_notifications" ? { id: id(1), recipient_id: "saved-owner", story_id: id(2), comment_id: id(3), kind, actor_name: actor, read_at: read ? new Date().toISOString() : null }
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
function soundFixture({ idle = true, muted = false } = {}) {
    const events = new Map(), documentEvents = new Map(), jobs = new Map(), saved = new Map();
    const contexts = []; let notes = 0, clock = 10000, sequence = 0, duringGesture = false;
    if (muted) saved.set("tellme-notification-sound", "off");
    class AudioContext {
        state = "suspended"; currentTime = 0; destination = {}; listeners = new Set();
        constructor() { assert.equal(duringGesture, false, "audio initialization must never run inside an input handler"); contexts.push(this); }
        addEventListener(name, fn) { this.listeners.add(fn); }
        removeEventListener(name, fn) { this.listeners.delete(fn); }
        resume() { this.state = "running"; this.listeners.forEach(fn => fn()); return Promise.resolve(); }
        createOscillator() { return { frequency: {}, connect() {}, start() { notes++; }, stop() {} }; }
        createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    const exports = {}, document = { hidden: false, addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) };
    const window = {
        AudioContext, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name), dispatchEvent: event => events.get(event.type)?.(),
        setTimeout: fn => { jobs.set(++sequence, fn); return sequence; }, clearTimeout: key => jobs.delete(key),
    };
    if (idle) { window.requestIdleCallback = fn => { jobs.set(++sequence, fn); return sequence; }; window.cancelIdleCallback = key => jobs.delete(key); }
    vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/services/notificationSound.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
        exports, document, localStorage: { getItem: key => saved.get(key) }, Event, window, Date: { now: () => clock },
        require() { return { setDevicePreference: (key, value) => saved.set(key, value) }; },
    });
    return { api: exports, contexts, events, documentEvents, jobs, document, notes: () => notes, advance: () => { clock += 2000; },
        flush() { for (const [key, fn] of [...jobs]) { jobs.delete(key); fn(); } },
        gesture(name = "click") { duringGesture = true; try { events.get(name)?.(); } finally { duringGesture = false; } },
    };
}
test("audio initialization stays outside input handlers and keeps gesture unlock, mute, hidden state and throttling", () => {
    const f = soundFixture(), cleanup = f.api.prepareNotificationSound();
    assert.equal(f.contexts.length, 0); assert(!f.events.has("pointerdown"));
    f.gesture(); assert.equal(f.contexts.length, 0);
    f.flush(); assert.equal(f.contexts.length, 1); f.api.playNotificationSound(); assert.equal(f.notes(), 0);
    f.gesture(); f.api.playNotificationSound(); assert.equal(f.notes(), 2); assert(!f.events.has("click")); assert(!f.events.has("keydown"));
    f.api.playNotificationSound(); assert.equal(f.notes(), 2);
    f.api.setNotificationSound(false); f.advance(); f.api.playNotificationSound(); assert.equal(f.notes(), 2);
    f.document.hidden = true; f.api.setNotificationSound(true); f.api.playNotificationSound(); assert.equal(f.notes(), 2);
    f.document.hidden = false; f.api.playNotificationSound(); assert.equal(f.notes(), 4);
    cleanup(); assert.equal(f.events.size, 0); assert.equal(f.documentEvents.size, 0); assert.equal(f.contexts[0].listeners.size, 0);
});
test("audio warmup supports browsers without idle callbacks and cancels cleanly on unmount", () => {
    const f = soundFixture({ idle: false }); let cleanup = f.api.prepareNotificationSound();
    assert.equal(f.jobs.size, 1); cleanup(); f.flush(); assert.equal(f.contexts.length, 0);
    cleanup = f.api.prepareNotificationSound(); f.flush(); f.gesture("keydown"); f.api.playNotificationSound(); assert.equal(f.notes(), 2);
    const context = f.contexts[0]; context.state = "suspended"; context.listeners.forEach(fn => fn());
    assert(f.events.has("click")); f.gesture(); assert.equal(context.state, "running"); assert.equal(f.contexts.length, 1);
    cleanup(); assert.equal(f.events.size, 0);
});
test("muted or hidden startup creates no audio context; enabling sound prepares it asynchronously", () => {
    const f = soundFixture({ muted: true }), cleanup = f.api.prepareNotificationSound();
    f.flush(); assert.equal(f.contexts.length, 0);
    f.document.hidden = true; f.api.setNotificationSound(true); f.flush(); assert.equal(f.contexts.length, 0);
    f.document.hidden = false; f.documentEvents.get("visibilitychange")(); assert.equal(f.contexts.length, 0);
    f.flush(); f.gesture(); assert.equal(f.contexts.length, 1); cleanup();
});

 test("Story push names the saved actor rather than trusting a forged webhook name", async () => {
 const server = fixture({ actor: "Alex", kind: "comment" });
 assert.equal((await server.invoke()).status, 200);
 assert.equal(server.deliveries[0].payload.body, "Alex hat deine Story kommentiert.");
 });
