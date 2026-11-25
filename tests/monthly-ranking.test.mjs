import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('all registered users can see the real top-five nicknames; awards require at least 800 points without rewriting closed results',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create schema auth;create role anon;create role authenticated;
   grant usage on schema public,auth to anon,authenticated;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
   create table profiles(id uuid primary key,display_name text,default_color text);
   grant select on profiles to authenticated;`);
  const names=['Amina','Noah','Léna','Mansvell','Jade','Samir','Sans points'];
  for(let n=1;n<=7;n++)await db.query("insert into profiles values($1,$2,'#22C55E')",[id(n),names[n-1]]);
  for(const name of ['20261123_fun_secrets_storytimes.sql','20261125_story_groups_comments.sql','20261125_story_threads_rewards.sql','20261125_story_threads_ui.sql','20261125_story_top_five.sql','20261125_story_top_five.sql']) await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
  const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
  const login=async n=>{await db.exec('reset role');await rows("select set_config('test.user',$1,false)",[n?id(n):'']);await db.exec(n?'set role authenticated':'set role anon');};
  const standings=async()=>(await rows('select get_monthly_standings() as data'))[0].data;
  for(const [user,points] of [[1,920],[2,810],[3,800],[4,799],[5,700],[6,60]]) await rows(`insert into tellme_private.activity_points(user_id,month,kind,event_key,source_id,story_id,awarded_at)
   select $1,date_trunc('month',now() at time zone 'UTC')::date,'comment',n::text,gen_random_uuid(),$1,now()+n*interval '1 second' from generate_series(1,$2) n`,[id(user),points]);
  await login(6);let current=await standings();assert.equal(current.mine.position,6);assert.equal(current.leaders.length,5);
  assert.deepEqual(current.leaders.map(row=>row.display_name),names.slice(0,5));
  assert(current.leaders.every(row=>!('user_id' in row)&&!row.is_me));
  await login(7);current=await standings();assert.equal(current.mine.position,null);assert.equal(current.mine.points,0);assert.deepEqual(current.leaders.map(row=>row.display_name),names.slice(0,5));
  await login(1);assert.equal((await standings()).leaders[0].is_me,true);
  await assert.rejects(rows("update tellme_private.activity_points set active=false"),/permission denied/);
  await login(0);await assert.rejects(standings(),/permission denied/);
  await db.exec('reset role');
  await rows("update tellme_private.activity_points set month=(date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date,awarded_at=awarded_at-interval '1 month'");
  await login(1);await standings();await db.exec('reset role');
  let result=await rows('select * from tellme_private.monthly_results order by position');assert.deepEqual(result.map(row=>row.reward_eur),[30,20,15,0,0]);assert.equal(result[2].points,800);assert.equal(result[3].points,799);
  await rows(`insert into tellme_private.activity_points(user_id,month,kind,event_key,source_id,story_id)
   select $1,(date_trunc('month',now() at time zone 'UTC')-interval '2 months')::date,'comment',n::text,gen_random_uuid(),$1 from generate_series(1,799) n`,[id(1)]);
  await rows("insert into tellme_private.monthly_results(month,position,user_id,points,reward_eur,payment_status) values((date_trunc('month',now() at time zone 'UTC')-interval '3 months')::date,1,$1,200,20,'paid')",[id(1)]);
  await login(1);await standings();await db.exec('reset role');
  result=await rows("select * from tellme_private.monthly_results where month=(date_trunc('month',now() at time zone 'UTC')-interval '2 months')::date");assert.equal(result[0].position,1);assert.equal(result[0].points,799);assert.equal(result[0].reward_eur,0);assert.equal(result[0].payment_status,'not_applicable');
  result=await rows("select * from tellme_private.monthly_results where month=(date_trunc('month',now() at time zone 'UTC')-interval '3 months')::date");assert.equal(result[0].reward_eur,20);assert.equal(result[0].payment_status,'paid');
  await rows('delete from profiles where id=$1',[id(1)]);await login(1);await assert.rejects(standings(),/ACCOUNT_NOT_FOUND/);
 }finally{await db.close();}
});
