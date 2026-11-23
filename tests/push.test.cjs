const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function setup({ native = false, apple = false, standalone = false, supported = true, permission = "granted", subscribed = true, saved = true, failSave = false } = {}) {
    const calls = [];
    let existing = subscribed;
    let stored = saved;
    let requestActive = false;
    const subscription = {
        endpoint: "https://push.example/device-one",
        toJSON: () => ({ endpoint: "https://push.example/device-one", keys: { p256dh: "device-key", auth: "auth-key" } }),
        unsubscribe: async () => { calls.push(["unsubscribe"]); existing = false; return true; },
    };
    const registration = {
        pushManager: {
            getSubscription: async () => existing ? subscription : null,
            subscribe: async () => {
                assert(requestActive, "subscribe must start before an asynchronous auth or database request");
                calls.push(["subscribe"]);
                existing = true;
                return subscription;
            },
        },
    };
    const navigator = {
        platform: apple ? "iPhone" : "Linux",
        maxTouchPoints: apple ? 5 : 0,
        userAgent: apple ? "Mozilla/5.0 (iPhone)" : "Desktop",
        standalone,
    };
    const window = { atob, setTimeout, clearTimeout, matchMedia: () => ({ matches: standalone }) };
    if (supported) {
        window.Notification = { permission };
        window.PushManager = function () {};
        navigator.serviceWorker = {
            register: async () => { calls.push(["register"]); return registration; },
            ready: Promise.resolve(registration),
            getRegistration: async () => registration,
        };
    }
    const supabase = {
        auth: { getSession: async () => ({ data: { session: { user: { id: "user-one" } } }, error: null }) },
        from(table) {
            let operation = "select";
            const filters = [];
            const query = {
                select() { return query; },
                update(value) { operation = "update"; calls.push([table, operation, value]); return query; },
                delete() { operation = "delete"; return query; },
                eq(column, value) { filters.push([column, value]); return query; },
                async maybeSingle() {
                    return { error: null, data: table === "profiles" ? { notifications_enabled: true } : stored ? { endpoint: subscription.endpoint } : null };
                },
                async upsert(value) {
                    calls.push([table, "upsert", value]);
                    if (failSave) return { error: new Error("offline") };
                    stored = true;
                    return { error: null };
                },
                then(resolve, reject) {
                    if (operation === "delete") {
                        calls.push([table, operation, filters]);
                        stored = false;
                    }
                    return Promise.resolve({ error: null }).then(resolve, reject);
                },
            };
            return query;
        },
    };
    const source = fs.readFileSync("src/services/pushNotifications.ts", "utf8")
        .replaceAll("import.meta.env", '({VITE_VAPID_PUBLIC_KEY: "B' + "A".repeat(86) + '"})');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const context = {
        exports: {}, navigator, window, Notification: window.Notification, Uint8Array, console,
        require(name) {
            if (name === "@capacitor/core") return { Capacitor: { isNativePlatform: () => native } };
            if (name === "../i18n/runtime") return { t: text => text };
            if (name === "../lib/supabase") return { supabase };
            throw Error(name);
        },
    };
    vm.runInNewContext(code, context);
    return {
        api: context.exports,
        calls,
        async clickEnable() {
            requestActive = true;
            const pending = context.exports.enablePushNotifications();
            requestActive = false;
            return pending;
        },
    };
}

test("iPhone Safari explains installation while a supported Home Screen app can prepare Push", async () => {
    const browser = setup({ apple: true, supported: false });
    assert.equal(browser.api.initialPushStatus(), "install");
    assert.equal(await browser.api.getPushStatus(), "install");
    assert.equal(await setup({ apple: true }).api.getPushStatus(), "install");
    const installed = setup({ apple: true, standalone: true, subscribed: false });
    assert.equal(await installed.api.getPushStatus(), "disabled");
    const native = setup({ native: true });
    assert.equal(await native.api.getPushStatus(), "native");
});

test("a browser subscription without a saved endpoint is disabled until the user enables it", async () => {
    const { api, clickEnable, calls } = setup({ saved: false });
    assert.equal(await api.getPushStatus(), "disabled");
    await clickEnable();
    assert.equal(await api.getPushStatus(), "enabled");
    const save = calls.find(call => call[1] === "upsert");
    assert.equal(save[2].user_id, "user-one");
    assert.equal(save[2].endpoint, "https://push.example/device-one");
    assert.equal(save[2].p256dh, "device-key");
});

test("new subscription starts inside the user gesture and an endpoint save failure cannot report enabled", async () => {
    const { api, clickEnable } = setup({ subscribed: false, saved: false, failSave: true });
    assert.equal(await api.getPushStatus(), "disabled");
    await assert.rejects(clickEnable(), /offline/);
    assert.equal(await api.getPushStatus(), "disabled");
});

test("disabling one device removes only its endpoint and preserves the account notification preference", async () => {
    const { api, calls } = setup();
    await api.disablePushNotifications();
    const removed = calls.find(call => call[1] === "delete");
    assert.equal(removed[0], "push_subscriptions");
    assert.deepEqual(JSON.parse(JSON.stringify(removed[2])), [
        ["user_id", "user-one"], ["endpoint", "https://push.example/device-one"],
    ]);
    assert(!calls.some(call => call[0] === "profiles" && call[1] === "update"));
    assert.equal(await api.getPushStatus(), "disabled");
});

test("a denied system permission remains denied without registering an endpoint", async () => {
    const { api, calls } = setup({ permission: "denied" });
    assert.equal(await api.getPushStatus(), "denied");
    assert.equal(calls.length, 0);
});

test("the service worker displays a received push and opens its group", async () => {
    const callbacks = new Map();
    const shown = [];
    let destination, closed = false;
    const worker = {
        location: { origin: "https://tellme.example" },
        addEventListener: (event, callback) => callbacks.set(event, callback),
        registration: { showNotification: async (...args) => shown.push(args) },
        clients: { matchAll: async () => [], openWindow: async url => { destination = url; } },
    };
    vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), { self: worker, URL });
    const groupId = "00000000-0000-4000-8000-000000000001";
    let completion;
    callbacks.get("push")({ data: { json: () => ({ title: "TellMe", body: "Un message", groupId }) }, waitUntil: promise => { completion = promise; } });
    await completion;
    assert.equal(shown[0][1].body, "Un message");
    callbacks.get("notificationclick")({ notification: { close: () => { closed = true; }, data: shown[0][1].data }, waitUntil: promise => { completion = promise; } });
    await completion;
    assert(closed);
    assert.equal(destination, "https://tellme.example/chat/" + groupId);
    callbacks.get("notificationclick")({ notification: { close() {}, data: { groupId: "https://outside.example" } }, waitUntil: promise => { completion = promise; } });
    await completion;
    assert.equal(destination, "https://tellme.example/home");
    const secretId = "00000000-0000-4000-8000-000000000002";
    callbacks.get("push")({ data: { json: () => ({ title: "TellMe", body: "Tu as reçu un nouveau Secret.", type: "secret", secretId }) }, waitUntil: promise => { completion = promise; } });
    await completion;
    assert.equal(shown[1][1].tag, "tellme-secret");
    callbacks.get("notificationclick")({ notification: { close() {}, data: shown[1][1].data }, waitUntil: promise => { completion = promise; } });
    await completion;
    assert.equal(destination, "https://tellme.example/fun?secret=" + secretId);
    callbacks.get("notificationclick")({ notification: { close() {}, data: { type: "secret", secretId: "https://outside.example" } }, waitUntil: promise => { completion = promise; } });
    await completion;
    assert.equal(destination, "https://tellme.example/home");
});
