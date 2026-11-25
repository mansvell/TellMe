import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const id = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const base = fs.readFileSync("supabase/migrations/20261123_fun_secrets_storytimes.sql", "utf8");
const update = fs.readFileSync("supabase/migrations/20261125_story_groups_comments.sql", "utf8");
async function setup() {
    const db = new PGlite();
    await db.exec(`create schema auth;create role anon;create role authenticated;
      grant usage on schema public,auth to anon,authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
      create table profiles(id uuid primary key,display_name text,default_color text);
      grant select on profiles to authenticated;`);
    for (let n = 1; n <= 14; n++) await db.query("insert into profiles values($1,$2,$3)", [id(n), n === 2 ? "Bob Confidentiel" : n === 3 ? " Z " : n === 4 ? "  " : "Profil " + n, n === 2 ? "#8B5CF6" : "#22C55E"]);
    await db.exec(base); await db.exec(update); await db.exec(update);
    const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
    const login = async n => {
        await db.exec("reset role");
        await db.query("select set_config('test.user',$1,false)", [n ? id(n) : ""]);
        await db.exec(n ? "set role authenticated" : "set role anon");
    };
    const story = async (n = 1) => {
        await db.exec("reset role");
        return (await rows("insert into storytimes(author_id,content,theme) values($1,'Mon histoire','violet') returning id", [id(n)]))[0].id;
    };
    return { db, rows, login, story };
}

test("grouped stories return complete anonymous authors, paginate by author and preserve read state", async () => {
    const { db, rows, login } = await setup();
    try {
        for (let author = 1; author <= 14; author++) for (let n = 0; n < 3; n++) {
            await db.query("insert into storytimes(id,author_id,content,theme,created_at) values($1,$2,$3,'blue',now()-$4*interval '1 minute'+$5*interval '1 second')", [id(1000+author*10+n),id(author),"Histoire " + author + "/" + n,author,n]);
        }
        await login(1);
        const groups = await rows("select * from get_storytime_groups()");
        assert.equal(groups.length, 11);
        assert(groups.every(g => /^[0-9a-f]{64}$/.test(g.author_key) && g.stories.length === 3));
        assert(groups.every(g => g.stories.every(s => !s.content.startsWith("Histoire 1/"))));
        assert.deepEqual(Object.keys(groups[0]).sort(), ["author_key","created_at","stories"]);
        assert.deepEqual(Object.keys(groups[0].stories[0]).sort(), ["content","created_at","expires_at","id","seen","theme"]);
        assert(groups[0].stories[0].created_at < groups[0].stories[2].created_at);
        const after = groups[9];
        const next = await rows("select * from get_storytime_groups($1,$2)", [after.created_at,after.author_key]);
        assert.equal(next.length, 3);
        assert.equal(new Set([...groups.slice(0,10),...next].map(g=>g.author_key)).size,13);
        await db.query("select read_storytime($1)", [groups[0].stories[1].id]);
        const reread = (await rows("select * from get_storytime_groups()"))[0];
        assert.equal(reread.author_key, groups[0].author_key);
        assert.deepEqual(reread.stories.map(s=>s.seen), [false,true,false]);
        assert.equal((await rows("select * from get_my_storytimes()")).length,3);
        await assert.rejects(db.query("select * from get_storytime_groups(now(),null)"),/INVALID_CURSOR/);
        await login(0);
        await assert.rejects(db.query("select * from get_storytime_groups()"),/permission denied/);
    } finally { await db.close(); }
});

test("story comments keep only nickname prefixes, support ordered pages and idempotent retries", async () => {
    const { db, rows, login, story } = await setup();
    try {
        const target = await story();
        await login(2);
        await db.query("select add_storytime_comment($1,'  Bonjour  ',$2)", [target,id(100)]);
        await db.query("select add_storytime_comment($1,'Bonjour',$2)", [target,id(100)]);
        await assert.rejects(db.query("select add_storytime_comment($1,'Autre',$2)",[target,id(100)]),/COMMENT_REQUEST_USED/);
        const comment = (await rows("select * from get_storytime_comments($1)",[target]))[0];
        assert.equal(comment.content,"Bonjour"); assert.equal(comment.display_prefix,"Bo");
        assert.equal(comment.color,"#8B5CF6"); assert.equal(comment.own,true);
        assert(!Object.keys(comment).some(key=>/user_id|author|display_name/.test(key)));
        await login(3);
        assert.equal((await rows("select * from get_storytime_comments($1)",[target]))[0].own,false);
        await assert.rejects(db.query("select add_storytime_comment($1,'Bonjour',$2)",[target,id(100)]),/COMMENT_REQUEST_USED/);
        await db.query("select add_storytime_comment($1,'Salut',$2)",[target,id(101)]);
        assert.equal((await rows("select * from get_storytime_comments($1)",[target])).find(c=>c.id===id(101)).display_prefix,"Z");
        await login(4);
        await db.query("select add_storytime_comment($1,'Sans pseudo lisible',$2)",[target,id(102)]);
        assert.equal((await rows("select * from get_storytime_comments($1)",[target])).find(c=>c.id===id(102)).display_prefix,"?");
        await db.exec("reset role");
        await db.query("update profiles set display_name=$1 where id=$2",[" 😊 E\u0301lise ",id(4)]);
        await login(4);
        assert.equal((await rows("select * from get_storytime_comments($1)",[target])).find(c=>c.id===id(102)).display_prefix,"Él");
        await db.exec("reset role");
        for(let n=0;n<46;n++) await db.query("insert into tellme_private.storytime_comments(id,story_id,user_id,content,created_at) values($1,$2,$3,$4,now()-$5*interval '1 second')",[id(200+n),target,id(2),"Commentaire "+n,n+1]);
        await login(1);
        let page=await rows("select * from get_storytime_comments($1)",[target]);
        assert.equal(page.length,21);
        const seen=[];
        while(page.length){
            const used=page.slice(0,20);seen.push(...used.map(c=>c.id));
            const oldest=used.at(-1);
            page=page.length>20?await rows("select * from get_storytime_comments($1,$2,$3)",[target,oldest.created_at,oldest.id]):[];
        }
        assert.equal(seen.length,49);assert.equal(new Set(seen).size,49);
        await assert.rejects(db.query("select * from tellme_private.storytime_comments"),/permission denied/);
        await login(0);
        await assert.rejects(db.query("select * from get_storytime_comments($1)",[target]),/permission denied/);
        await assert.rejects(db.query("select add_storytime_comment($1,'Texte',$2)",[target,id(999)]),/permission denied/);
    } finally { await db.close(); }
});

test("comment reactions are mutually exclusive and deletions verify ownership and cascade", async () => {
    const { db, rows, login, story } = await setup();
    try {
        const target = await story();
        await login(2);
        await db.query("select add_storytime_comment($1,'Une réaction ?',$2)",[target,id(100)]);
        await login(3);
        const react=value=>db.query("select set_storytime_comment_reaction($1,$2)",[id(100),value]);
        await react("like");await react("like");
        let row=(await rows("select * from get_storytime_comments($1)",[target]))[0];
        assert.equal(Number(row.like_count),1);assert.equal(row.my_reaction,"like");
        await react("laugh");
        row=(await rows("select * from get_storytime_comments($1)",[target]))[0];
        assert.equal(Number(row.like_count),0);assert.equal(Number(row.laugh_count),1);
        await react(null);
        assert.equal(Number((await rows("select * from get_storytime_comments($1)",[target]))[0].laugh_count),0);
        await react("dislike");
        await assert.rejects(react("invalid"),/INVALID_REACTION/);
        await assert.rejects(db.query("select delete_storytime_comment($1)",[id(100)]),/COMMENT_ACCESS_DENIED/);
        await login(4);await react("dislike");
        assert.equal(Number((await rows("select * from get_storytime_comments($1)",[target]))[0].dislike_count),2);
        await login(2);await db.query("select delete_storytime_comment($1)",[id(100)]);
        assert.equal((await rows("select * from get_storytime_comments($1)",[target])).length,0);
        await db.exec("reset role");assert.equal((await rows("select * from tellme_private.storytime_comment_reactions")).length,0);
        await login(2);await db.query("select add_storytime_comment($1,'Encore',$2)",[target,id(101)]);
        await db.exec("reset role");await db.query("delete from profiles where id=$1",[id(2)]);
        await login(3);assert.equal((await rows("select * from get_storytime_comments($1)",[target])).length,0);
    } finally { await db.close(); }
});

test("comments enforce expiry, valid text, rates and deleted accounts", async () => {
    const { db, rows, login, story } = await setup();
    try {
        const target = await story();await login(2);
        for(const content of [" ","x".repeat(601)]) await assert.rejects(db.query("select add_storytime_comment($1,$2,$3)",[target,content,id(990)]),/INVALID_COMMENT/);
        for(let n=0;n<20;n++)await db.query("select add_storytime_comment($1,'Bonjour',$2)",[target,id(100+n)]);
        await assert.rejects(db.query("select add_storytime_comment($1,'Limite',$2)",[target,id(120)]),/FUN_RATE_LIMIT/);
        await db.query("select add_storytime_comment($1,'Bonjour',$2)",[target,id(100)]);
        await db.exec("reset role");await db.query("update storytimes set expires_at=now()-interval '1 second' where id=$1",[target]);
        await login(3);
        await assert.rejects(db.query("select * from get_storytime_comments($1)",[target]),/STORY_EXPIRED/);
        await assert.rejects(db.query("select add_storytime_comment($1,'Trop tard',$2)",[target,id(900)]),/STORY_EXPIRED/);
        await assert.rejects(db.query("select set_storytime_comment_reaction($1,'like')",[id(100)]),/STORY_EXPIRED/);
        await db.exec("reset role");await db.query("delete from profiles where id=$1",[id(3)]);
        await login(3);await assert.rejects(db.query("select * from get_storytime_groups()"),/ACCOUNT_NOT_FOUND/);
        await db.exec("reset role");await db.query("delete from storytimes where id=$1",[target]);
        assert.equal((await rows("select * from tellme_private.storytime_comments")).length,0);
    } finally { await db.close(); }
});
