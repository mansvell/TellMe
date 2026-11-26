import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const hash=n=>String(n).padStart(64,'a');
const payload={v:1,iv:'b'.repeat(16),salt:'c'.repeat(43),ciphertext:'d'.repeat(64)};
test('anonymous account transfers are private, owned, expiring, single-recipient and retryable only by that recipient',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create schema auth;create role anon;create role authenticated;
   grant usage on schema public,auth to anon,authenticated;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
   create table profiles(id uuid primary key);`);
  for(let n=1;n<=3;n++)await db.query('insert into profiles values($1)',[id(n)]);
  const sql=fs.readFileSync('supabase/migrations/20261126_account_transfer.sql','utf8');
  await db.exec(sql);await db.exec(sql);
  const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
  const login=async n=>{await db.exec('reset role');await query("select set_config('test.user',$1,false)",[n?id(n):'']);await db.exec(n?'set role authenticated':'set role anon');};
  const create=async(n,body=payload)=>query('select create_account_transfer($1,$2::jsonb)',[hash(n),JSON.stringify(body)]);
  const state=async n=>(await query('select account_transfer_state($1) as state',[hash(n)]))[0].state;
  const claim=async(n,recipient=hash(90))=>(await query('select claim_account_transfer($1,$2) as data',[hash(n),recipient]))[0].data;
  await login(0);await assert.rejects(create(1),/permission denied/);
  await assert.rejects(query('select * from tellme_private.account_transfers'),/permission denied/);
  assert.equal(await state(1),'unavailable');await assert.rejects(claim(1),/TRANSFER_INVALID_OR_USED/);
  await login(1);
  await assert.rejects(create(1,{...payload,access_token:'not-allowed'}),/INVALID_TRANSFER/);
  await assert.rejects(create(1,{...payload,v:null}),/INVALID_TRANSFER/);
  await create(1);assert.equal(await state(1),'pending');
  await login(2);assert.equal((await query('select cancel_account_transfer($1) as ok',[hash(1)]))[0].ok,false);
  assert.equal(await state(1),'pending');
  await login(0);let result=await claim(1);assert.equal(result.owner_id,id(1));assert.deepEqual(result.payload,payload);
  assert.equal(await state(1),'claimed');await assert.rejects(claim(1,hash(91)),/TRANSFER_INVALID_OR_USED/);
  assert.deepEqual(await claim(1),result); // lost HTTP response can be retried by the same installation
  assert.equal((await query('select finish_account_transfer($1,$2) as ok',[hash(1),hash(91)]))[0].ok,false);
  await login(1);assert.equal((await query('select cancel_account_transfer($1) as ok',[hash(1)]))[0].ok,false);
  await login(0);assert.equal((await query('select finish_account_transfer($1,$2) as ok',[hash(1),hash(90)]))[0].ok,true);
  await assert.rejects(claim(1),/TRANSFER_INVALID_OR_USED/);assert.equal(await state(1),'claimed');
  await db.exec('reset role');assert.equal((await query('select payload from tellme_private.account_transfers where lookup=$1',[hash(1)]))[0].payload,null);
  await login(1);await create(2);await create(3);assert.equal(await state(2),'cancelled');
  await login(0);await assert.rejects(claim(2),/TRANSFER_INVALID_OR_USED/);
  await db.exec('reset role');await query("update tellme_private.account_transfers set expires_at=now()-interval '1 second' where lookup=$1",[hash(3)]);
  await login(0);assert.equal(await state(3),'expired');await assert.rejects(claim(3),/TRANSFER_INVALID_OR_USED/);
  await login(1);await create(4);await login(0);await claim(4);
  await db.exec('reset role');await query("update tellme_private.account_transfers set retry_until=now()-interval '1 second' where lookup=$1",[hash(4)]);
  await login(0);await assert.rejects(claim(4),/TRANSFER_INVALID_OR_USED/);assert.equal(await state(4),'claimed');
  await login(1);await create(5);await login(0);
  // Two competing installations race for the same code: exactly one succeeds.
  const race=await Promise.allSettled([claim(5,hash(92)),claim(5,hash(93))]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
  await login(1);await assert.rejects(create(6),/TRANSFER_RATE_LIMIT/);
  await db.exec('reset role');await query('delete from profiles where id=$1',[id(1)]);
  await login(0);assert.equal(await state(5),'unavailable');await assert.rejects(claim(5),/TRANSFER_INVALID_OR_USED/);
  await login(1);await assert.rejects(create(6),/ACCOUNT_NOT_FOUND/);
 }finally{await db.close();}
});
