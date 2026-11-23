import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const uuid = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const migration = fs.readFileSync("supabase/migrations/20261123_fun_secrets_storytimes.sql", "utf8");

test("Fun SQL protects anonymous Storytimes, private Secrets, public sending and retries", async () => {
    const db = new PGlite();
    try {
        await db.exec(`
            create schema auth;
            create role anon;
            create role authenticated;
            grant usage on schema public,auth to anon,authenticated;
            create function auth.uid() returns uuid language sql stable as
              $$select nullif(current_setting('test.user',true),'')::uuid$$;
            create table profiles(id uuid primary key,display_name text);
            grant select on profiles to authenticated;
        `);
        for (const [index, name] of [[1, "Alice"], [2, "Bob"], [3, "Carole"]]) {
            await db.query("insert into profiles values($1,$2)", [uuid(index), name]);
        }
        await db.exec(migration);
        await db.exec(migration);
        async function login(index) {
            await db.exec("reset role");
            await db.query("select set_config('test.user',$1,false)", [index ? uuid(index) : ""]);
            await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({ "x-forwarded-for": "203.0.113.3" })]);
            await db.exec(index ? "set role authenticated" : "set role anon");
        }
        async function rows(query, args = []) { return (await db.query(query, args)).rows; }
        async function story(content = "Une histoire", theme = "blue") {
            return (await rows("select create_storytime($1,$2) as id", [content, theme]))[0].id;
        }

        await login(1);
        const token = (await rows("select * from get_secret_box()"))[0].public_token;
        assert.equal((await rows("select * from get_secret_box()"))[0].public_token, token, "personal link remains stable");
        const ownStory = await story();
        assert.equal((await rows("select * from get_my_storytimes()")).length, 1);
        await login(2);
        const feed = await rows("select * from get_storytimes()");
        assert.deepEqual(Object.keys(feed[0]).sort(), ["id","content","theme","created_at","expires_at","seen"].sort());
        assert.equal(feed[0].seen, false);
        await assert.rejects(db.query("select * from storytimes"), /permission denied/);
        await assert.rejects(db.query("select delete_storytime($1)", [ownStory]), /STORY_ACCESS_DENIED/);
        await db.query("select read_storytime($1)", [ownStory]);
        assert.equal((await rows("select * from get_storytimes()"))[0].seen, true);
        await db.query("select report_storytime($1,$2)", [ownStory, "spam"]);
        await db.query("select report_storytime($1,$2)", [ownStory, "spam"]);
        await assert.rejects(db.query("select * from tellme_private.storytime_reports"), /permission denied/);
        await db.exec("reset role");
        assert.equal((await rows("select * from tellme_private.storytime_reports")).length, 1);
        await db.query("update storytimes set expires_at=now()-interval '1 second' where id=$1", [ownStory]);
        await login(2);
        assert.equal((await rows("select * from get_storytimes()")).length, 0);
        await assert.rejects(db.query("select read_storytime($1)", [ownStory]), /STORY_EXPIRED/);
        console.log("PASS public feed contains no author; owner deletion, read state, reporting and 24h expiration enforced");

        await login(1);
        const storyIds = [];
        for(let index = 0; index < 5; index++) storyIds.push(await story("Histoire " + index));
        await assert.rejects(story("Une de trop"), /STORY_LIMIT/);
        await db.query("select delete_storytime($1)", [storyIds[0]]);
        await story("Une place libérée");
        await assert.rejects(story("x".repeat(2001)), /INVALID_STORY/);
        await db.query("select delete_storytime($1)", [storyIds[1]]);
        await assert.rejects(story("Bonjour", "bad-theme"), /check constraint/);
        console.log("PASS story publication limits and text/theme validation");

        await login(0);
        await assert.rejects(db.query("select * from get_storytimes()"), /permission denied/);
        await assert.rejects(db.query("select * from get_my_secrets()"), /permission denied/);
        const target = await rows("select * from get_secret_recipient($1)", [token]);
        assert.deepEqual(Object.keys(target[0]), ["display_name"]);
        assert.equal(target[0].display_name, "Alice");
        await assert.rejects(db.query("select * from secret_boxes"), /permission denied/);
        const challenge = (await rows("select * from create_secret_challenge($1,$2)", [token,uuid(900)]))[0];
        assert(challenge);
        let nonce = 0;
        while (!createHash("sha256").update(challenge.salt + ":" + nonce).digest("hex").startsWith("0000")) nonce++;
        await assert.rejects(db.query("select send_secret($1,$2,$3,$4)", [challenge.challenge_id,String(nonce),"Bonjour","bot.example"]), /INVALID_SECRET/);
        await db.query("select send_secret($1,$2,$3)", [challenge.challenge_id,String(nonce),"Un secret privé"]);
        await db.query("select send_secret($1,$2,$3)", [challenge.challenge_id,String(nonce),"Un secret privé"]);
        await assert.rejects(db.query("select send_secret($1,$2,$3)", [challenge.challenge_id,String(nonce),"Un autre contenu"]), /CHALLENGE_USED/);
        await login(2);
        assert.equal((await rows("select * from get_my_secrets()")).length, 0);
        assert.equal((await rows("select * from secrets")).length, 0);
        await login(1);
        const inbox = await rows("select * from get_my_secrets()");
        assert.equal(inbox.length, 1, "retry must not create a second Secret");
        const secret = inbox[0];
        assert(!Object.keys(secret).some(key => /sender|fingerprint|recipient/.test(key)));
        assert.equal(Number((await rows("select get_secrets_unread_count() as count"))[0].count), 1);
        assert.equal((await rows("select * from get_my_secrets(read_filter => 'unread')")).length, 1);
        assert.equal((await rows("select * from get_my_secrets(read_filter => 'read')")).length, 0);
        await assert.rejects(db.query("select * from get_my_secrets(read_filter => 'invalid')"), /INVALID_FILTER/);
        await login(2);
        assert.equal((await rows("select * from get_my_secret($1)", [secret.id])).length, 0);
        await assert.rejects(db.query("select read_secret($1)", [secret.id]), /SECRET_ACCESS_DENIED/);
        await assert.rejects(db.query("select save_secret_reply($1,$2,$3)", [secret.id,"Ma réponse","pink"]), /SECRET_ACCESS_DENIED/);
        await assert.rejects(db.query("select delete_secret($1)", [secret.id]), /SECRET_ACCESS_DENIED/);
        await login(1);
        await db.query("select read_secret($1)", [secret.id]);
        assert.equal(Number((await rows("select get_secrets_unread_count() as count"))[0].count), 0);
        assert.equal((await rows("select * from get_my_secrets(read_filter => 'unread')")).length, 0);
        assert.equal((await rows("select * from get_my_secrets(read_filter => 'read')")).length, 1);
        await db.query("select save_secret_reply($1,$2,$3)", [secret.id,"Une réponse","pink"]);
        const saved = (await rows("select * from get_my_secret($1)", [secret.id]))[0];
        assert.equal(saved.reply, "Une réponse");
        assert.equal(saved.card_theme, "pink");
        await db.query("select delete_secret($1)", [secret.id]);
        assert.equal((await rows("select * from get_my_secrets()")).length, 0);
        console.log("PASS sending without an account, replay protection, privacy, unread count, owner reply and deletion");

        await login(0);
        const unproved = (await rows("select * from create_secret_challenge($1,$2)", [token,uuid(901)]))[0];
        await assert.rejects(db.query("select send_secret($1,$2,$3)", [unproved.challenge_id,"-1","No"]), /INVALID_PROOF/);
        await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({ "x-forwarded-for": "198.51.100.10" })]);
        await assert.rejects(db.query("select send_secret($1,$2,$3)", [challenge.challenge_id,String(nonce),"Un secret privé"]), /EXPIRED_CHALLENGE/);
        for (let index=0;index<30;index++) await db.query("select * from create_secret_challenge($1,$2)",[token,uuid(2000+index)]);
        await assert.rejects(db.query("select * from create_secret_challenge($1,$2)",[token,uuid(2999)]), /FUN_RATE_LIMIT/);
        await db.exec("reset role");
        await db.query("delete from profiles where id=$1", [uuid(1)]);
        await login(0);
        assert.equal((await rows("select * from get_secret_recipient($1)", [token])).length, 0);
        await assert.rejects(db.query("select * from create_secret_challenge($1,$2)",[token,uuid(3000)]), /SECRET_LINK_UNAVAILABLE/);
        console.log("PASS proof validation, per-origin challenge limit and deleted recipient handling");
    } finally {
        await db.close();
    }
});

test("only the group creator can rename an active group, with a valid name", async () => {
    const db = new PGlite();
    try {
        await db.exec(`
            create schema auth; create role anon; create role authenticated;
            grant usage on schema public,auth to anon,authenticated;
            create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
            create table public.profiles(id uuid primary key);
            create table public.groups(id uuid primary key,name text,dominus_id uuid,expires_at timestamptz);
        `);
        await db.query("insert into profiles values($1),($2)", [uuid(1), uuid(2)]);
        await db.query("insert into groups values($1,'Avant',$2,null)", [uuid(100),uuid(1)]);
        const sql = fs.readFileSync("supabase/migrations/20261123_group_name.sql", "utf8");
        await db.exec(sql); await db.exec(sql);
        async function login(index) {
            await db.exec("reset role");
            await db.query("select set_config('test.user',$1,false)", [index ? uuid(index) : ""]);
            await db.exec(index ? "set role authenticated" : "set role anon");
        }
        await login(0);
        await assert.rejects(db.query("select rename_group($1,'Interdit')", [uuid(100)]), /permission denied/);
        await login(2);
        await assert.rejects(db.query("select rename_group($1,'Interdit')", [uuid(100)]), /GROUP_ACCESS_DENIED/);
        await login(1);
        await assert.rejects(db.query("select rename_group($1,' ')", [uuid(100)]), /INVALID_GROUP_NAME/);
        await assert.rejects(db.query("select rename_group($1,$2)", [uuid(100),"x".repeat(41)]), /INVALID_GROUP_NAME/);
        assert.equal((await db.query("select rename_group($1,' Nouveau nom ') as name",[uuid(100)])).rows[0].name,"Nouveau nom");
        await db.exec("reset role");
        assert.equal((await db.query("select name from groups where id=$1",[uuid(100)])).rows[0].name,"Nouveau nom");
        await db.query("update groups set expires_at=now()-interval '1 minute' where id=$1",[uuid(100)]);
        await login(1);
        await assert.rejects(db.query("select rename_group($1,'Expiré')", [uuid(100)]), /GROUP_ACCESS_DENIED/);
        await db.exec("reset role");
        await db.query("delete from profiles where id=$1",[uuid(1)]);
        await login(1);
        await assert.rejects(db.query("select rename_group($1,'Supprimé')", [uuid(100)]), /ACCOUNT_NOT_FOUND/);
    } finally { await db.close(); }
});

test("Storytime views are unique, exclude the author and are private to the author", async () => {
    const db = new PGlite();
    try {
        await db.exec(`
            create schema auth; create role anon; create role authenticated;
            grant usage on schema public,auth to anon,authenticated;
            create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
            create table public.profiles(id uuid primary key,display_name text,default_color text);
            grant select on public.profiles to authenticated;
        `);
        for (let i=1;i<=3;i++) await db.query("insert into profiles values($1,$2,$3)",[uuid(i),"Profil "+i,i===2?"#22C55E":null]);
        await db.exec(migration);
        const viewsMigration=fs.readFileSync("supabase/migrations/20261123_storytime_views.sql","utf8");
        await db.exec(viewsMigration); await db.exec(viewsMigration);
        async function login(index) {
            await db.exec("reset role");
            await db.query("select set_config('test.user',$1,false)",[index?uuid(index):""]);
            await db.exec(index?"set role authenticated":"set role anon");
        }
        const rows=async(text,args=[]) => (await db.query(text,args)).rows;
        await login(1);
        const storyId=(await rows("select create_storytime('Mon histoire','blue') as id"))[0].id;
        await db.query("select read_storytime($1)",[storyId]);
        assert.equal(Number((await rows("select * from get_my_storytime_view_counts()"))[0].view_count),0);
        assert.equal((await rows("select * from get_storytime_viewers($1)",[storyId])).length,0);
        for (const viewer of [2,2,3]) { await login(viewer); await db.query("select read_storytime($1)",[storyId]); }
        await assert.rejects(db.query("select * from get_storytime_viewers($1)",[storyId]),/STORY_ACCESS_DENIED/);
        assert.equal((await rows("select * from get_my_storytime_view_counts()")).length,0);
        await assert.rejects(db.query("select * from tellme_private.storytime_views"),/permission denied/);
        await login(0);
        await assert.rejects(db.query("select * from get_storytime_viewers($1)",[storyId]),/permission denied/);
        await assert.rejects(db.query("select * from get_my_storytime_view_counts()"),/permission denied/);
        await login(1);
        assert.equal(Number((await rows("select * from get_my_storytime_view_counts()"))[0].view_count),2);
        const viewed=await rows("select * from get_storytime_viewers($1)",[storyId]);
        assert.equal(viewed.length,2);
        assert.deepEqual(Object.keys(viewed[0]).sort(),["color","display_name","viewed_at"]);
        assert.equal(viewed.find(row=>row.display_name==="Profil 2").color,"#22C55E");
        assert.equal(viewed.find(row=>row.display_name==="Profil 3").color,"#0EA5E9");
        await assert.rejects(db.query("select * from get_storytime_viewers($1,-1)",[storyId]),/INVALID_OFFSET/);
        await assert.rejects(db.query("select * from get_storytime_viewers($1)",[uuid(900)]),/STORY_ACCESS_DENIED/);
        await db.exec("reset role");
        for(let i=10;i<65;i++) {
            await db.query("insert into profiles(id,display_name) values($1,$2)",[uuid(i),"Spectateur "+i]);
            await db.query("insert into tellme_private.storytime_views(story_id,user_id) values($1,$2)",[storyId,uuid(i)]);
        }
        await login(1);
        assert.equal(Number((await rows("select * from get_my_storytime_view_counts()"))[0].view_count),57);
        assert.equal((await rows("select * from get_storytime_viewers($1)",[storyId])).length,51);
        assert.equal((await rows("select * from get_storytime_viewers($1,50)",[storyId])).length,7);
        await db.exec("reset role");
        await db.query("delete from profiles where id=$1",[uuid(2)]);
        await login(1);
        assert.equal(Number((await rows("select * from get_my_storytime_view_counts()"))[0].view_count),56);
        await db.exec("reset role");
        await db.query("delete from profiles where id=$1",[uuid(1)]);
        await login(1);
        await assert.rejects(db.query("select * from get_storytime_viewers($1)",[storyId]),/ACCOUNT_NOT_FOUND/);
    } finally { await db.close(); }
});
