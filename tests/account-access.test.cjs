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

function fixture(overrides = {}, profile = { id: 'original-user' }) {
    const calls = [];
    const user = { id: 'original-user', is_anonymous: true };
    const auth = {
        getUser: async () => ({ data: { user }, error: null }),
        updateUser: async (value, options) => { calls.push(['update', value, options]); return { data: { user }, error: null }; },
        verifyOtp: async value => { calls.push(['verify', value]); return { data: { user }, error: null }; },
        signInWithPassword: async value => { calls.push(['login', value]); return { data: { user }, error: null }; },
        signOut: async value => { calls.push(['logout', value]); return { error: null }; },
        resetPasswordForEmail: async (email, options) => { calls.push(['reset', email, options]); return { error: null }; },
        ...overrides,
    };
    const supabase = { auth, from: table => {
        assert.equal(table, 'profiles');
        return { select: columns => { assert.equal(columns, 'id'); return { eq: (column, id) => {
            assert.equal(column, 'id'); assert.equal(id, user.id);
            return { maybeSingle: async () => ({ data: profile, error: null }) };
        } }; } };
    } };
    const access = load('src/services/accountAccess.ts', {
        '../lib/supabase': { supabase }, '../mobile/links': { publicLink: path => 'https://tellmeall.vercel.app'+path },
        '../i18n/runtime': { t: text => text },
    });
    return { access, calls, user };
}
test('linking adds only an email to the existing account; password requires a verified identity', async () => {
    const {access,calls,user} = fixture();
    await access.linkRecoveryEmail(' person@example.com ');
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['update',{email:'person@example.com'},{emailRedirectTo:'https://tellmeall.vercel.app/account'}]]);
    await assert.rejects(access.setRecoveryPassword('a-long-password'), /Confirme/);
    assert.equal(calls.length,1);
    user.is_anonymous=false;user.email_confirmed_at='2026-11-26T00:00:00Z';
    await assert.rejects(access.setRecoveryPassword('short'), /10 caractères/);
    await access.setRecoveryPassword('a-long-password');
    assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), ['update',{password:'a-long-password'},null]);
});
test('email verification is tied to the account being secured', async () => {
    const {access,calls} = fixture({verifyOtp:async()=>({data:{user:{id:'different-user'}},error:null})});
    await assert.rejects(access.verifyRecoveryEmail('x@example.com','123456'), /ne correspond/);
    assert.equal(calls[0][0],'logout');
});
test('sign-in never signs up a new user and refuses an account without an existing profile', async () => {
    const {access,calls} = fixture();
    await access.signInExistingAccount(' person@example.com ','password');
    assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['login',{email:'person@example.com',password:'password'}]]);
    const missing = fixture({},null);
    await assert.rejects(missing.access.signInExistingAccount('x@example.com','password'), /introuvable/);
    assert.equal(missing.calls.at(-1)[0],'logout');
    const failed = fixture({signInWithPassword:async()=>({data:{},error:new Error('sensitive server detail')})});
    await assert.rejects(failed.access.signInExistingAccount('x@example.com','wrong'), error => !error.message.includes('sensitive'));
});
test('password reset uses the first-party account page, never a user-provided redirect', async () => {
    const {access,calls}=fixture();await access.requestPasswordReset(' person@example.com ');
    assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['reset','person@example.com',{redirectTo:'https://tellmeall.vercel.app/account'}]]);
});
test('invitation paste validates origin, path and opaque code, preserves legacy links and strips unrelated query data', () => {
    const {invitationPath: parse}=load('src/utils/invitations.ts',{}, {window:{location:{origin:'https://preview.example'}}});
    for(const input of ['ABc_123','/join/ABc_123','https://preview.example/join/ABc_123','https://tellmeall.vercel.app/join/ABc_123','https://tellmeall.vercel.app/join/preview?token=ABc_123','https://tellmeall.vercel.app/join/ABc_123?redirect=https://evil.example']) assert.equal(parse(input),'/join/ABc_123');
    for(const input of ['', 'https://evil.example/join/ABc_123','javascript:alert(1)','https://tellmeall.vercel.app@evil.example/join/abc','https://tellmeall.vercel.app/join/../settings','https://tellmeall.vercel.app/join/%2e%2e/settings','https://tellmeall.vercel.app/settings','https://tellmeall.vercel.app/join/preview?token=<script>','a'.repeat(161)]) assert.equal(parse(input),null,input);
});
