const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function fixture({ configured = true, enabled = true, expired = false } = {}) {
    const deliveries = [], removed = [];
    let handler;
    const secretId = "00000000-0000-4000-8000-000000000001";
    const env = {
        FUN_WEBHOOK_SECRET: "a".repeat(40), SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "server-secret", VAPID_PUBLIC_KEY: "public-key",
        VAPID_PRIVATE_KEY: "private-key", VAPID_SUBJECT: "mailto:contact@example.com",
    };
    if (!configured) delete env.FUN_WEBHOOK_SECRET;
    const client = { from(table) {
        const filters = [];
        const query = {
            select() { return query; },
            eq(key, value) { filters.push([key,value]); return query; },
            delete() { removed.push({table,filters}); return query; },
            limit() { return query; },
            async maybeSingle() {
                return { error: null, data: table === "secrets" ? { id: secretId, recipient_id: "actual-owner", read_at: null } : { notifications_enabled: enabled, language: "de" } };
            },
            then(resolve,reject) {
                const data = table === "push_subscriptions" ? [
                    { endpoint: "https://web.push.apple.com/device", p256dh: "device-key", auth: "auth-key" },
                    { endpoint: "https://fcm.googleapis.com.evil.example/device", p256dh: "bad", auth: "bad" },
                ] : null;
                return Promise.resolve({ data, error: null }).then(resolve,reject);
            },
        };
        return query;
    } };
    const code = ts.transpileModule(fs.readFileSync("supabase/functions/notify-secret/index.ts","utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(code, {
        exports: {}, Response, Request, TextEncoder, Uint8Array, URL, crypto: globalThis.crypto,
        Deno: { env: { get: key => env[key] }, serve: callback => { handler = callback; } },
        require(name) {
            if(name.startsWith("npm:@supabase"))return { createClient: () => client };
            if(name.startsWith("npm:web-push"))return { __esModule: true, default: {
                setVapidDetails(subject,publicKey,privateKey) { assert.equal(privateKey,"private-key"); },
                async sendNotification(device,payload) {
                    if(expired)throw {statusCode:410};
                    deliveries.push({ device, payload: JSON.parse(payload) });
                },
            } };
            throw Error(name);
        },
    });
    async function invoke(key = "a".repeat(40)) {
        return handler(new Request("https://edge.example/notify-secret", {
            method:"POST", headers:{"x-tellme-hook":key},
            body:JSON.stringify({type:"INSERT",schema:"public",table:"secrets",record:{id:secretId,recipient_id:"forged-owner",content:"A private message"}}),
        }));
    }
    return { invoke, deliveries, removed, secretId };
}

test("the Secret webhook rejects missing configuration and unauthenticated calls", async () => {
    assert.equal((await fixture({configured:false}).invoke()).status,503);
    const server=fixture();
    assert.equal((await server.invoke("wrong")).status,401);
    assert.equal(server.deliveries.length,0);
});

test("Secret push uses the saved owner and a generic localized message, with no original content", async () => {
    const server=fixture();
    assert.equal((await server.invoke()).status,200);
    assert.equal(server.deliveries.length,1);
    const notification=server.deliveries[0];
    assert.equal(notification.device.endpoint,"https://web.push.apple.com/device");
    assert.deepEqual(JSON.parse(JSON.stringify(notification.payload)),{
        title:"TellMe",body:"Du hast ein neues Secret erhalten.",type:"secret",secretId:server.secretId,
    });
    assert(!JSON.stringify(notification).includes("private message"));
});

test("disabled notifications are respected and expired subscriptions are removed", async () => {
    const disabled=fixture({enabled:false});
    assert.equal((await disabled.invoke()).status,200);
    assert.equal(disabled.deliveries.length,0);
    const expired=fixture({expired:true});
    assert.equal((await expired.invoke()).status,200);
    assert.equal(expired.removed.length,1);
    assert(expired.removed[0].filters.some(([key,value])=>key==="user_id"&&value==="actual-owner"));
});
