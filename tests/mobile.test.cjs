const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env', '({})');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const context = { exports: {}, URL, Blob, File, DOMException, Uint8Array, btoa, console,
        require(name) { if (name in dependencies) return dependencies[name]; throw Error(`Unexpected dependency: ${name}`); }, ...globals };
    vm.runInNewContext(code, context);
    return context.exports;
}
const tick = () => new Promise(resolve => setImmediate(resolve));

for (const native of [false, true]) {
    test(`shared links use ${native ? 'production HTTPS origin on native' : 'current browser origin on web'}`, () => {
        const links = load('src/mobile/links.ts', { '@capacitor/core': { Capacitor: { isNativePlatform: () => native } } }, { window: { location: { origin: 'https://preview.example' } } });
        assert.equal(links.publicLink('/b/ABC'), native ? 'https://tellmeall.vercel.app/b/ABC' : 'https://preview.example/b/ABC');
        assert.equal(links.appPathFromUrl('tellme://join/ABC'), '/join/ABC');
        assert.equal(links.appPathFromUrl('tellme://b/ABC'), '/b/ABC');
        assert.equal(links.appPathFromUrl('https://attacker.example/join/ABC'), null);
        assert.equal(links.appPathFromUrl('tellme://settings'), null);
        assert.equal(links.appPathFromUrl('javascript:alert(1)'), null);
        assert.equal(links.appPathFromUrl('tellme://join/../../settings'), null);
    });
}

test('native sharing sends PNG and caption through the native sheet and retains the image for its recipient', async () => {
    let payload, written, deleted = false;
    const sharing = load('src/mobile/sharing.ts', {
        '@capacitor/core': { Capacitor: { isNativePlatform: () => true } },
        '@capacitor/clipboard': { Clipboard: {} },
        '@capacitor/filesystem': { Directory: { Cache: 'CACHE' }, Filesystem: {
            readdir: async () => ({ files: [] }), writeFile: async args => { written = args; return { uri: 'file:///cache/image.png' }; },
            deleteFile: async () => { deleted = true; },
        } },
        '@capacitor/share': { Share: { share: async args => { payload = args; } } },
    });
    assert.equal(await sharing.shareImage(new Blob(['PNG'], { type: 'image/png' }), 'buzz.png', 'TellMe', 'https://tellmeall.vercel.app/b/ABC'), 'image');
    assert.equal(payload.text, 'https://tellmeall.vercel.app/b/ABC');
    assert.equal(payload.files[0], 'file:///cache/image.png');
    assert.equal(written.directory, 'CACHE');
    assert.equal(written.data, btoa('PNG'));
    assert.equal(deleted, false);
});

test('cancelling native sharing cleans up its export without reporting success', async () => {
    let deleted = false;
    const sharing = load('src/mobile/sharing.ts', {
        '@capacitor/core': { Capacitor: { isNativePlatform: () => true } },
        '@capacitor/clipboard': { Clipboard: {} },
        '@capacitor/filesystem': { Directory: { Cache: 'CACHE' }, Filesystem: {
            readdir: async () => ({ files: [] }), writeFile: async () => ({ uri: 'file:///cache/image.png' }), deleteFile: async () => { deleted = true; },
        } },
        '@capacitor/share': { Share: { share: async () => { throw Error('Share canceled'); } } },
    });
    assert.equal(await sharing.shareImage(new Blob(['PNG']), 'buzz.png', 'TellMe', 'https://tellmeall.vercel.app/b/ABC'), 'cancelled');
    assert.equal(deleted, true);
});

test('web sharing still supplies the image with the link as text', async () => {
    let payload;
    const sharing = load('src/mobile/sharing.ts', {
        '@capacitor/core': { Capacitor: { isNativePlatform: () => false } },
        '@capacitor/clipboard': {}, '@capacitor/filesystem': {}, '@capacitor/share': {},
    }, { navigator: { canShare: () => true, share: async args => { payload = args; } } });
    assert.equal(await sharing.shareImage(new Blob(['PNG'], { type: 'image/png' }), 'buzz.png', 'TellMe', 'https://tellmeall.vercel.app/b/ABC'), 'image');
    assert.equal(payload.text, 'https://tellmeall.vercel.app/b/ABC');
    assert.equal(payload.files[0].type, 'image/png');
});

test('native auth storage retains a session and removes it on sign out', async () => {
    const values = new Map();
    const storage = load('src/mobile/storage.ts', {
        '@capacitor/core': { Capacitor: { isNativePlatform: () => true } },
        '@capacitor/preferences': { Preferences: {
            get: async ({ key }) => ({ value: values.get(key) ?? null }), set: async ({ key, value }) => { values.set(key, value); }, remove: async ({ key }) => { values.delete(key); },
        } },
    });
    await storage.nativeAuthStorage.setItem('session', 'TOKEN');
    assert.equal(await storage.nativeAuthStorage.getItem('session'), 'TOKEN');
    await storage.nativeAuthStorage.removeItem('session');
    assert.equal(await storage.nativeAuthStorage.getItem('session'), null);
});

test('account navigation keeps its page during verification but blocks a deleted account', async () => {
    let pathname = '/home', cursor = 0, effects = [], cleanup, previousDeps;
    let release, delayed = false, deleted = false;
    const states = [];
    const hooks = {
        useState(initial) {
            const index = cursor++;
            if (!(index in states)) states[index] = initial;
            return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
        },
        useEffect(effect, deps) {
            if (!previousDeps || JSON.stringify(previousDeps) !== JSON.stringify(deps)) {
                cleanup?.(); effects.push(effect); previousDeps = deps;
            }
        },
    };
    const values = new Map();
    const account = load('src/components/AccountGuard.tsx', {
        'react': hooks,
        'react/jsx-runtime': { jsx: (tag, props) => ({ tag, props }), jsxs: (tag, props) => ({ tag, props }) },
        'react-router-dom': { useLocation: () => ({ pathname }) },
        '../assets/icon.png': 'logo.png', '../i18n/runtime': { t: text => text },
        '../mobile/storage': { setDevicePreference: (key, value) => values.set(key, value) },
        '../lib/supabase': { supabase: {
            auth: {
                getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }),
                getUser: async () => {
                    if (delayed) await new Promise(resolve => { release = resolve; });
                    return deleted ? { data: { user: null }, error: { status: 401 } } : { data: { user: { id: 'user-1' } } };
                },
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
            },
            from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'user-1' } }) }) }) }),
        } },
    }, {
        localStorage: { getItem: key => values.get(key) },
        window: { setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {}, setTimeout },
        document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    });
    function render() {
        cursor = 0;
        const output = account.default({ children: 'PAGE' });
        effects.splice(0).forEach(effect => { cleanup = effect(); });
        return output;
    }
    const first = render();
    assert(!JSON.stringify(first).includes('Vérification du compte'));
    await tick();
    assert.equal(render(), 'PAGE');
    delayed = true; pathname = '/settings';
    assert.equal(render(), 'PAGE');
    await tick();
    assert.equal(render(), 'PAGE');
    deleted = true; release(); await tick();
    assert.notEqual(render(), 'PAGE');
    assert.equal(states[0], 'missing');
    cleanup();
});
