const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const context = { exports: {}, require(name) { if (name in dependencies) return dependencies[name]; throw Error(name); } };
    vm.runInNewContext(code, context);
    return context.exports;
}
const service = rpc => load('src/services/receipts.ts', { '../lib/supabase': { supabase: { rpc } } });

test('checkmarks distinguish sending, saved, partially received, received by all and read by all', () => {
    const { default: Status } = load('src/components/MessageStatus.tsx', {
        'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
        'lucide-react': { Check: 'single', CheckCheck: 'double', Clock3: 'clock' }, '../i18n/runtime': { t: text => text },
    });
    assert.equal(Status({ pending: true }).props['aria-label'], 'Envoi en cours');
    for (const [receipt, label, icon] of [
        [undefined, 'Envoyé', 'single'],
        [{ expected: null, delivered: 4, read: 4 }, 'Envoyé', 'single'],
        [{ expected: 2, delivered: 1, read: 1 }, 'Envoyé', 'single'],
        [{ expected: 2, delivered: 2, read: 1 }, 'Reçu par tous', 'double'],
        [{ expected: 2, delivered: 2, read: 2 }, 'Lu par tous', 'double'],
    ]) {
        const result = Status({ receipt });
        assert.equal(result.props['aria-label'], `${label} · Informations du message`);
        assert.equal(result.props.children.type, icon);
    }
});

test('delivery is acknowledged only after the app receives the pending message payloads, grouped by conversation', async () => {
    const calls = [];
    const api = service(async (method, args) => {
        calls.push([method, args]);
        return { data: method === 'get_pending_message_deliveries' ? [
            { message_id: 'a', group_id: 'one', content: 'hello' },
            { message_id: 'b', group_id: 'two', content: 'hi' },
            { message_id: 'c', group_id: 'one', content: 'again' },
        ] : null, error: null };
    });
    assert.equal(await api.deliverPendingMessages(), 3);
    assert.equal(calls[0][0], 'get_pending_message_deliveries');
    assert.deepEqual(JSON.parse(JSON.stringify(calls.slice(1))), [
        ['acknowledge_message_delivery', { target_group_id: 'one', target_message_ids: ['a', 'c'] }],
        ['acknowledge_message_delivery', { target_group_id: 'two', target_message_ids: ['b'] }],
    ]);
    assert(calls.every(([method]) => !method.includes('read')));
});

test('network errors never manufacture delivery or read confirmations', async () => {
    const calls = [];
    const api = service(async method => { calls.push(method); return { data: null, error: { code: 'NETWORK', message: 'offline' } }; });
    await assert.rejects(api.deliverPendingMessages());
    assert.deepEqual(calls, ['get_pending_message_deliveries']);
    await assert.rejects(api.getReceiptSummaries(['a']));
});

test('an unapplied migration leaves the chat usable without fabricated receipts', async () => {
    const api = service(async () => ({ data: null, error: { code: 'PGRST202' } }));
    assert.equal(await api.deliverPendingMessages(), 0);
    assert.equal((await api.getReceiptSummaries(['a'])).length, 0);
    await api.acknowledgeDelivery('group', ['a']);
});

test('large conversations batch their receipt requests without dropping messages', async () => {
    const ids = Array.from({ length: 451 }, (_, i) => String(i));
    const sizes = [];
    const api = service(async (_, args) => {
        sizes.push(args.target_message_ids.length);
        return { data: args.target_message_ids.map(message_id => ({ message_id, expected_count: 2, delivered_count: '1', read_count: '0' })), error: null };
    });
    const rows = await api.getReceiptSummaries(ids);
    assert.deepEqual(sizes, [200, 200, 51]);
    assert.equal(rows.length, 451);
    assert.equal(rows[450].messageId, '450');
    assert.equal(rows[450].delivered, 1);
});
