const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env', '({VITE_SUPABASE_URL:"https://test.supabase.co",VITE_SUPABASE_PUBLISHABLE_KEY:"test-publishable"})');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const context = { exports: {}, URL, Blob, File, DOMException, Uint8Array, btoa, console,
        require(name) { if (name in dependencies) return dependencies[name]; throw Error(`Unexpected dependency: ${name}`); }, ...globals };
    vm.runInNewContext(code, context);
    return context.exports;
}

const {webcrypto}=require('node:crypto');
const globals={crypto:webcrypto,TextEncoder,TextDecoder,atob,AbortSignal};
const cryptoModule=load('src/utils/transferCrypto.ts',{},globals);
test('transfer envelope decrypts only with its 100-bit code and matching account',async()=>{
 const code=cryptoModule.generateTransferCode();assert.match(code,/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
 const session={user_id:'owner',access_token:'private-access',refresh_token:'private-refresh'};
 const encrypted=await cryptoModule.encryptTransfer(code,session);
 assert(!JSON.stringify(encrypted).includes('private'));
 assert.deepEqual(JSON.parse(JSON.stringify(await cryptoModule.decryptTransfer(code,'owner',encrypted))),session);
 await assert.rejects(cryptoModule.decryptTransfer(cryptoModule.generateTransferCode(),'owner',encrypted));
 await assert.rejects(cryptoModule.decryptTransfer(code,'other-user',encrypted));
 await assert.rejects(cryptoModule.decryptTransfer(code,'owner',{...encrypted,ciphertext:encrypted.ciphertext.slice(0,-4)+'AAAA'}));
 assert.equal(await cryptoModule.transferLookup(code),await cryptoModule.transferLookup(code.toLowerCase().replaceAll('-',' ')));
 assert.throws(()=>cryptoModule.normalizeTransferCode('123456'),/INVALID_TRANSFER_CODE/);
});
const sid='00000000-0000-4000-8000-000000000001';
const token=session_id=>'header.'+btoa(JSON.stringify({session_id})).replaceAll('=','')+'.sig';
function storageFixture(state='pending',native=false){
 const values=new Map();const temporary=new Map();const redirects=[];const requests=[];
 const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const sessionStorage={getItem:k=>temporary.get(k)??null,setItem:(k,v)=>temporary.set(k,v),removeItem:k=>temporary.delete(k)};
 const base={getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>localStorage.setItem(k,v),removeItem:async k=>localStorage.removeItem(k)};
 let failure=false;
 const fixture={setState:value=>state=value,setFailure:value=>failure=value,values,temporary,requests,redirects};
 fixture.service=load('src/lib/transferStorage.ts',{'@capacitor/core':{Capacitor:{isNativePlatform:()=>native}},'../mobile/storage':{nativeAuthStorage:base}}, {
  ...globals,localStorage,sessionStorage,window:{location:{replace:path=>redirects.push(path)}},
  fetch:async(url,options)=>{requests.push({url,...options});if(failure)throw Error('offline');return{ok:true,json:async()=>state};}
 });
 fixture.key=fixture.service.AUTH_STORAGE_KEY;
 fixture.marker={lookup:'a'.repeat(64),ownerId:'owner',sessionId:sid,expiresAt:new Date(Date.now()+300000).toISOString()};
 fixture.session=JSON.stringify({user:{id:'owner'},access_token:token(sid),refresh_token:'private-refresh'});
 values.set(fixture.key,fixture.session);values.set('tellme-known-account','owner');
 return fixture;
}
for(const native of [false,true])test(`moved session cannot refresh on source ${native?'native':'web'} storage, even after a background restart`,async()=>{
 const f=storageFixture('claimed',native);await f.service.saveTransferMarker(f.marker);
 assert(!f.values.get('tellme-account-transfer').includes('private-refresh'));
 assert.equal(await f.service.transferAuthStorage.getItem(f.key),null);
 assert.equal(f.values.has(f.key),false);assert.equal(f.values.has('tellme-known-account'),false);assert.deepEqual(f.redirects,['/transfer?done=1']);
 assert.equal(f.requests.length,1);assert.equal(f.requests[0].headers.Authorization,undefined);assert(!JSON.stringify(f.requests).includes('private-refresh'));
});
test('pending or expired code never removes the original account, and offline status fails closed',async()=>{
 const f=storageFixture();await f.service.saveTransferMarker(f.marker);
 assert.equal(await f.service.transferAuthStorage.getItem(f.key),f.session);
 f.setFailure(true);await assert.rejects(f.service.transferAuthStorage.getItem(f.key),/offline/);assert.equal(f.values.get(f.key),f.session);
 f.setFailure(false);f.setState('expired');assert.equal(await f.service.transferAuthStorage.getItem(f.key),f.session);
 assert.equal(f.values.has('tellme-account-transfer'),false);assert.equal(f.redirects.length,0);
});
test('old receipt cannot disconnect a new independent login to the same account',async()=>{
 const f=storageFixture('claimed');await f.service.saveTransferMarker({...f.marker,sessionId:'00000000-0000-4000-8000-000000000002'});
 assert.equal(await f.service.transferAuthStorage.getItem(f.key),f.session);assert.equal(f.redirects.length,0);assert.equal(f.requests.length,0);
});
test('an old tab cannot clear a newer transfer marker; recipient retry identity survives reload',async()=>{
 const f=storageFixture();await f.service.saveTransferMarker(f.marker);await f.service.clearTransferMarker('b'.repeat(64));
 assert.equal((await f.service.getTransferMarker()).lookup,f.marker.lookup);
 const first=await f.service.recipientForTransfer(f.marker.lookup,async()=>'c'.repeat(64));
 const retry=await f.service.recipientForTransfer(f.marker.lookup,async()=>{throw Error('should reuse');});assert.equal(first,retry);
});
function transferServiceFixture(){
 const f=storageFixture();const storage=f.service;const session={user:{id:'owner'},access_token:token(sid),refresh_token:'private-refresh',expires_at:Math.floor(Date.now()/1000)+3600};
 let marker=null;let envelope;let restores=0;let claimCalls=0;let finishFailure=false;let refreshes=0;
 const calls=[];
 const supabase={auth:{getUser:async()=>({data:{user:session.user},error:null}),refreshSession:async()=>{refreshes++;return{data:{session},error:null};},setSession:async value=>{restores++;assert.deepEqual(JSON.parse(JSON.stringify(value)),{access_token:session.access_token,refresh_token:session.refresh_token});return{data:{user:session.user},error:null};}},rpc:async(name,args)=>{
  calls.push({name,args});if(name==='create_account_transfer'){envelope=args.p_payload;return{data:new Date(Date.now()+300000).toISOString(),error:null};}
  if(name==='cancel_account_transfer')return{data:true,error:null};throw Error('Unexpected RPC '+name);
 }};
 const dependencies={'../lib/supabase':{supabase},'../utils/transferCrypto':cryptoModule,'../i18n/runtime':{t:text=>text},'../mobile/storage':{setDevicePreference:()=>{}},'../lib/transferStorage':{
  authSessionId:storage.authSessionId,getTransferMarker:async()=>marker,saveTransferMarker:async value=>{marker=value;},clearTransferMarker:async()=>{marker=null;},completeSourceTransfer:async()=>{throw Error('must not revoke source while generating');},readTransferState:async()=>'pending',TRANSFER_DISPLAY_KEY:'display',recipientForTransfer:async()=> 'c'.repeat(64),clearTransferClaim:async()=>{},
  transferPublicRpc:async(name)=>{if(name==='claim_account_transfer'){claimCalls++;return{owner_id:'owner',payload:envelope};}if(name==='finish_account_transfer'&&finishFailure)throw Error('offline after restore');return true;}
 }};
 const access=load('src/services/accountTransfer.ts',dependencies,{...globals,sessionStorage:{setItem:()=>{}}});
 return{access,getMarker:()=>marker,otherInstallation:()=>{marker=null;},getEnvelope:()=>envelope,getCounts:()=>({restores,claimCalls,refreshes}),setFinishFailure:()=>{finishFailure=true;},calls};
}
test('end-to-end transfer service restores the same session without email or creating a user; source marker contains no code or token',async()=>{
 const f=transferServiceFixture();const displayed=await f.access.createAccountTransfer();
 assert.equal(f.getCounts().refreshes,1);assert.equal(f.getMarker().ownerId,'owner');assert(!('code' in f.getMarker()));assert(!JSON.stringify(f.getMarker()).includes('private-refresh'));
 assert(!JSON.stringify(f.calls).includes('private-refresh'));assert(!JSON.stringify(f.calls).includes(displayed.code));
 await assert.rejects(f.access.importAccountTransfer(displayed.code),/autre version/);assert.equal(f.getCounts().claimCalls,0);
 f.otherInstallation();f.setFinishFailure();await f.access.importAccountTransfer(displayed.code);
 assert.equal(f.getCounts().restores,1);assert.equal(f.getCounts().claimCalls,1);
});
