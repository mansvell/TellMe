import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function setup() {
 const db=new PGlite();
 await db.exec(`create schema auth;create role anon;create role authenticated;
 grant usage on schema public,auth to anon,authenticated;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
 create table profiles(id uuid primary key,display_name text,default_color text);
 grant select on profiles to authenticated;`);
 for(let n=1;n<=6;n++)await db.query("insert into profiles values($1,$2,'#22C55E')",[id(n),'Nom '+n]);
 for(const name of ['20261123_fun_secrets_storytimes.sql','20261125_story_groups_comments.sql','20261125_story_threads_rewards.sql','20261125_story_threads_ui.sql','20261125_story_threads_ui.sql']) await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
 const login=async n=>{await db.exec('reset role');await rows("select set_config('test.user',$1,false)",[n?id(n):'']);await db.exec(n?'set role authenticated':'set role anon');};
 const story=async(text='Mon histoire',quote=null)=>(await rows("select create_storytime($1,'blue',$2) as id",[text,quote]))[0].id;
 const comment=async(storyId,n,parent=null)=>rows('select add_storytime_comment($1,$2,$3,$4)',[storyId,'Texte '+n,id(n),parent]);
 const roots=async(storyId,cursor)=> (await rows('select * from get_storytime_threads($1,$2,$3)',[storyId,cursor?.created_at??null,cursor?.id??null])).map(row=>row.get_storytime_threads);
 return {db,rows,login,story,comment,roots};
}
test('root pages keep replies with their parent, paginate direct children and preserve reply-to-reply structure',async()=>{
 const {db,rows,login,story,comment,roots}=await setup();
 try {
  await login(1);const target=await story();const other=await story('Autre Story');
  await login(2);await comment(target,100);await comment(target,101);
  await login(3);await comment(target,102,id(100));await comment(target,103,id(102));
  await db.exec('reset role');
  for(let n=104;n<=116;n++)await rows('insert into tellme_private.storytime_comments(id,story_id,user_id,content,parent_id) values($1,$2,$3,$4,$5)',[id(n),target,id(3),'Réponse '+n,id(100)]);
  await login(1);
  let page=await roots(target);assert.equal(page.length,2);
  const root=page.find(row=>row.id===id(100));assert.equal(root.reply_count,14);assert.equal(root.replies.length,2);assert.equal(root.replies[0].id,id(102));assert.equal(root.replies[0].reply_count,1);
  assert(page.every(row=>row.parent_id===null));assert(!JSON.stringify(page).includes('user_id'));
  let cursor;const found=[];
  for(;;){const raw=(await rows('select * from get_storytime_replies($1,$2,$3,$4)',[target,id(100),cursor?.created_at??null,cursor?.id??null])).map(row=>row.get_storytime_replies);const used=raw.slice(0,10);found.push(...used);cursor=used.at(-1);if(raw.length<=10)break;}
  assert.equal(found.length,14);assert.equal(new Set(found.map(row=>row.id)).size,14);assert(found.every(row=>row.parent_id===id(100)));
  const nested=(await rows('select * from get_storytime_replies($1,$2)',[target,id(102)])).map(row=>row.get_storytime_replies);
  assert.equal(nested.length,1);assert.equal(nested[0].id,id(103));
  await assert.rejects(rows('select * from get_storytime_replies($1,$2)',[other,id(100)]),/COMMENT_UNAVAILABLE/);
  await db.exec('reset role');
  for(let n=200;n<223;n++)await rows('insert into tellme_private.storytime_comments(id,story_id,user_id,content) values($1,$2,$3,$4)',[id(n),target,id(2),'Racine '+n]);
  await login(1);page=await roots(target);assert.equal(page.length,21);
  const next=await roots(target,page[19]);assert.equal(next.length,5);
  assert.equal(new Set([...page.slice(0,20),...next].map(row=>row.id)).size,25);
  await login(2);await rows('select delete_storytime_comment($1)',[id(100)]);
  const promoted=(await rows('select get_storytime_comment_node($1,$2) as row',[target,id(102)]))[0].row;
  assert.equal(promoted.parent_id,null);assert.equal(promoted.reply_count,1);
  await login(0);await assert.rejects(roots(target),/permission denied/);
  await login(1);await assert.rejects(rows('select tellme_private.comment_node($1,$2)',[id(101),id(1)]),/permission denied/);
  await db.exec('reset role');await rows("update storytimes set expires_at=now()-interval '1 second' where id=$1",[target]);
  await login(1);await assert.rejects(roots(target),/STORY_EXPIRED/);
 } finally {await db.close();}
});
test('notifications store the actual commenting/replying nickname, including Story responses',async()=>{
 const {db,rows,login,story,comment}=await setup();
 try {
  await login(1);const target=await story();await login(2);await comment(target,100);
  await login(1);let notifications=await rows('select * from get_story_notifications()');assert.equal(notifications[0].actor_name,'Nom 2');
  await login(3);await comment(target,101,id(100));await story('Ma réponse en Story',id(100));
  await login(2);notifications=await rows('select * from get_story_notifications()');assert.equal(notifications.length,2);assert(notifications.every(row=>row.actor_name==='Nom 3'));
  await assert.rejects(rows("update story_notifications set actor_name='Faux pseudo'"),/permission denied/);
 }finally {await db.close();}
});
test('only top-three scores of at least 200 receive 30/20/15 euros; lower scores receive no award',async()=>{
 const {db,rows,login}=await setup();
 try {
  for(const [user,points] of [[1,210],[2,205],[3,200],[4,199],[5,100],[6,50]]) await rows(`insert into tellme_private.activity_points(user_id,month,kind,event_key,source_id,story_id,awarded_at)
   select $1,(date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date,'comment',n::text,gen_random_uuid(),$1,now()-interval '1 month'+n*interval '1 second' from generate_series(1,$2) n`,[id(user),points]);
  await login(1);await rows('select get_monthly_standings()');await db.exec('reset role');
  let result=await rows('select * from tellme_private.monthly_results order by position');assert.deepEqual(result.map(row=>row.reward_eur),[30,20,15,0,0]);assert.equal(result[2].points,200);
  assert(result.slice(0,3).every(row=>row.payment_status==='pending'));assert(result.slice(3).every(row=>row.payment_status==='not_applicable'));
  await rows(`insert into tellme_private.activity_points(user_id,month,kind,event_key,source_id,story_id,awarded_at)
   select $1,(date_trunc('month',now() at time zone 'UTC')-interval '2 months')::date,'comment',n::text,gen_random_uuid(),$1,now()-interval '2 months' from generate_series(1,199) n`,[id(1)]);
  await login(1);await rows('select get_monthly_standings()');await db.exec('reset role');
  result=await rows("select * from tellme_private.monthly_results where month=(date_trunc('month',now() at time zone 'UTC')-interval '2 months')::date");assert.equal(result[0].points,199);assert.equal(result[0].reward_eur,0);assert.equal(result[0].payment_status,'not_applicable');
 }finally {await db.close();}
});
test('client thread merging keeps loaded reply pages, updates nested reactions and drops deleted roots',()=>{
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/commentThreads.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
 const node=(n,extra={})=>({id:id(n),created_at:String(n).padStart(5,'0'),reply_count:0,replies:[],...extra});
 const previous=[node(1,{reply_count:3,replies:[node(2),node(3),node(4)]}),node(5)];
 let merged=exports.mergeCommentThreads(previous,[node(1,{reply_count:3,replies:[node(2),node(3)]})],true);
 assert.equal(merged.length,1);assert.equal(merged[0].replies.length,3);
 merged=exports.updateCommentThread(merged,id(4),row=>({...row,like_count:2}));assert.equal(merged[0].replies[2].like_count,2);
 merged=exports.mergeCommentThreads(merged,[node(1,{reply_count:2,replies:[node(2),node(4)]})],true);assert.equal(merged[0].replies.length,2);assert(!merged[0].replies.some(row=>row.id===id(3)));
 assert.equal(exports.removeCommentThread(merged,id(2))[0].replies.length,1);
});
