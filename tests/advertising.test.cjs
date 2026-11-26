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

const advertising=load('src/services/advertising.ts');
test('advertising is disabled with the default configuration',()=>assert.equal(advertising.advertisingConfig(),null));
test('ads require a final valid CMP decision and all relevant Google permissions',()=>{
    const allow={cmpStatus:'loaded',eventStatus:'useractioncomplete',gdprApplies:true,purpose:{consents:{1:true,2:true,3:true,4:true,7:true,9:true,10:true}},vendor:{consents:{755:true}}};
    assert.equal(advertising.permitsAdvertising(allow,true),true);
    assert.equal(advertising.permitsAdvertising({},true),false);
    assert.equal(advertising.permitsAdvertising(allow,false),false);
    assert.equal(advertising.permitsAdvertising({...allow,cmpStatus:'stub'},true),false);
    assert.equal(advertising.permitsAdvertising({...allow,eventStatus:'cmpuishown'},true),false);
    assert.equal(advertising.permitsAdvertising({...allow,vendor:{consents:{755:false}}},true),false);
    assert.equal(advertising.permitsAdvertising({...allow,purpose:{consents:{...allow.purpose.consents,1:false}}},true),false);
    assert.equal(advertising.permitsAdvertising({...allow,publisher:{restrictions:{2:{755:0}}}},true),false);
    const interests={...allow,purpose:{consents:{1:true,3:true,4:true},legitimateInterests:{2:true,7:true,9:true,10:true}},vendor:{consents:{755:true},legitimateInterests:{755:true}}};
    assert.equal(advertising.permitsAdvertising(interests,true),true);
    assert.equal(advertising.permitsAdvertising({...interests,publisher:{restrictions:{2:{755:1}}}},true),false);
});
test('TCF listener unregisters on unmount and ignores late callbacks',()=>{
    let callback;const events=[];const received=[];
    const window={__tcfapi:(command,version,fn,id)=>{events.push([command,id]);if(command==='addEventListener')callback=fn;},setInterval:()=>1,clearInterval:()=>{}};
    const service=load('src/services/advertising.ts',{}, {window});
    const cleanup=service.observeAdvertisingConsent(value=>received.push(value));
    cleanup();callback({listenerId:7},true);
    assert.equal(received.length,0);assert.deepEqual(events.at(-1),['removeEventListener',7]);
});
