import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const id = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

async function setup() {
    const db = new PGlite();
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
      grant usage on schema public,auth to anon,authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
      create table profiles(id uuid primary key,display_name text,default_color text);
      grant select on profiles to authenticated;`);
    for (let n = 1; n <= 8; n++) await db.query("insert into profiles values($1,$2,'#22C55E')", [id(n), "Pseudo privé " + n]);
    for (const name of ["20261123_fun_secrets_storytimes.sql", "20261125_story_groups_comments.sql", "20261125_story_threads_rewards.sql", "20261125_story_threads_rewards.sql"])
        await db.exec(fs.readFileSync(`supabase/migrations/${name}`, "utf8"));
    const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
    const login = async n => { await db.exec("reset role"); await db.query("select set_config('test.user',$1,false)", [n ? id(n) : ""]); await db.exec(n ? "set role authenticated" : "set role anon"); };
    const story = async (content = "Une nouvelle histoire", quote = null) => (await rows("select create_storytime($1,'blue',$2) as id", [content, quote]))[0].id;
    const comment = async (target, n, content = "Commentaire " + n, parent = null) => rows("select add_storytime_comment($1,$2,$3,$4)", [target, content, id(n), parent]);
    const score = async () => (await rows("select get_monthly_standings() as data"))[0].data;
    return { db, rows, login, story, comment, score };
}

test("replies stay in their Story, quoted replies preserve anonymity, counts and notifications are accurate", async () => {
    const { db, rows, login, story, comment } = await setup();
    try {
        await login(1); const target = await story();
        const other = await story("Une autre histoire");
        await login(2); await comment(target, 100);
        await comment(target, 100); // A retry must not notify or count twice.
        await login(3); await comment(target, 101, "Ma réponse", id(100));
        await assert.rejects(comment(other, 102, "Mauvais fil", id(100)), /COMMENT_UNAVAILABLE/);
        const thread = await rows("select * from get_storytime_comments_v2($1)", [target]);
        const reply = thread.find(row => row.id === id(101));
        assert.equal(reply.parent_id, id(100)); assert.equal(reply.reply_to.content, "Commentaire 100");
        assert.equal(reply.reply_to.display_prefix, "Ps");
        assert(!JSON.stringify(thread).includes("Pseudo privé"));
        assert.equal((await rows("select get_storytime($1) as s", [target]))[0].s.comment_count, 2);
        const responseStory = await story("Réponse affichée avec le commentaire", id(100));
        const mine = await rows("select * from get_my_storytimes_v2()");
        assert.equal(mine[0].get_my_storytimes_v2.comment_quote.id, id(100));
        const response = (await rows("select get_storytime($1) as s", [responseStory]))[0].s;
        assert.equal(response.comment_quote.content, "Commentaire 100");
        assert.equal(Math.round((Date.parse(response.expires_at) - Date.parse(response.created_at))/86400000), 4);
        await login(1);
        const ownerNotifications = await rows("select * from get_story_notifications()");
        assert.equal(ownerNotifications.length, 2);
        assert(ownerNotifications.every(row => row.kind === "comment"));
        await login(2);
        const notifications = await rows("select * from get_story_notifications()");
        assert.deepEqual(notifications.map(row => row.kind).sort(), ["reply", "story_reply"]);
        assert.equal((await rows("select * from story_notifications")).length, 2, "RLS hides other recipients");
        await rows("select read_story_notification($1)", [notifications[0].id]);
        assert.equal((await rows("select * from get_story_notifications()")).filter(row => row.read_at).length, 1);
        await login(3);
        await assert.rejects(rows("select read_story_notification($1)", [notifications[0].id]), /NOTIFICATION_ACCESS_DENIED/);
        await login(2); await rows("select delete_storytime_comment($1)", [id(100)]);
        const remaining = await rows("select * from get_storytime_comments_v2($1)", [target]);
        assert.equal(remaining.length, 1); assert.equal(remaining[0].parent_id, null); assert.equal(remaining[0].reply_to, null);
        assert.equal((await rows("select get_storytime($1) as s", [responseStory]))[0].s.comment_quote, null);
    } finally { await db.close(); }
});

test("each useful action gives one point; removing one's action removes that point, without reaction farming", async () => {
    const { db, rows, login, story, comment, score } = await setup();
    try {
        await login(1); const target = await story();
        assert.equal((await score()).mine.points, 1);
        await login(2); await comment(target, 100);
        await comment(target, 100);
        await comment(target, 101, "Commentaire 100");
        assert.equal((await score()).mine.points, 1, "Retry and duplicate text earn no extra point");
        await rows("select set_storytime_comment_reaction($1,'like')", [id(100)]);
        assert.equal((await score()).mine.points, 1, "A self-reaction earns nothing");
        await login(3);
        const react = value => rows("select set_storytime_comment_reaction($1,$2)", [id(100), value]);
        await react("like"); await react("laugh"); await react("laugh");
        assert.equal((await score()).mine.points, 1);
        await react(null); assert.equal((await score()).mine.points, 0);
        await react("dislike"); assert.equal((await score()).mine.points, 1);
        await login(2); await rows("select delete_storytime_comment($1)", [id(100)]);
        assert.equal((await score()).mine.points, 0);
        await comment(target, 103, "Commentaire 100");
        assert.equal((await score()).mine.points, 0, "Deleting and reposting identical text does not restore its point");
        await comment(target, 104, "Une nouvelle contribution");
        await login(3); assert.equal((await score()).mine.points, 1, "Another person's deletion does not remove the reactor's point");
        await login(1); await comment(target, 105, "Mon propre commentaire");
        assert.equal((await score()).mine.points, 2);
        await rows("select delete_storytime($1)", [target]);
        assert.equal((await score()).mine.points, 0);
        assert.equal((await score()).mine.position, null);
        await assert.rejects(rows("select * from tellme_private.activity_points"), /permission denied/);
        await assert.rejects(rows("select tellme_private.award_activity($1,'story','fake',$2,$2)", [id(1), id(999)]), /permission denied/);
        await login(2); assert.equal((await score()).mine.points, 1, "Deleting someone else's Story does not revoke the commenter's point");
        await login(0); await assert.rejects(score(), /permission denied/);
    } finally { await db.close(); }
});

test("expired Stories are unavailable, cleanup cascades without removing earned points", async () => {
    const { db, rows, login, story, comment, score } = await setup();
    try {
        await login(1); const target = await story();
        await login(2); await comment(target, 100);
        await login(3); const response = await story("Une réponse qui restera active", id(100));
        await db.exec("reset role");
        await rows("update storytimes set expires_at=now()-interval '1 second' where id=$1", [target]);
        await login(1);
        await assert.rejects(rows("select get_storytime($1)", [target]), /STORY_EXPIRED/);
        assert.equal((await rows("select get_storytime($1) as s", [response]))[0].s.comment_quote, null, "Expired source text disappears before physical cleanup");
        assert.equal((await rows("select * from get_story_notifications()")).length, 0);
        await assert.rejects(comment(target, 101), /STORY_EXPIRED/);
        await db.exec("reset role;select tellme_private.cleanup_expired_storytimes()");
        assert.equal((await rows("select * from tellme_private.storytime_comments")).length, 0);
        await login(1); assert.equal((await score()).mine.points, 1);
        await login(2); assert.equal((await score()).mine.points, 1);
    } finally { await db.close(); }
});

test("daily scoring caps, real top five, personal rank and frozen monthly awards", async () => {
    const { db, rows, login, story, comment, score } = await setup();
    try {
        await login(1); const target = await story();
        await db.exec("reset role");
        for (let n=0; n<25; n++) await rows("insert into tellme_private.storytime_comments(story_id,user_id,content) values($1,$2,$3)", [target, id(2), "Action utile " + n]);
        for (let user=3; user<=8; user++) for (let n=0; n<user-1; n++) await rows("insert into tellme_private.storytime_comments(story_id,user_id,content) values($1,$2,$3)", [target, id(user), "Contenu " + user + "/" + n]);
        await login(2); const standings = await score();
        assert.equal(standings.mine.points, 20); assert.equal(standings.mine.position, 1);
        assert.equal(standings.leaders.length, 5); assert.deepEqual(standings.leaders.map(row => row.position), [1,2,3,4,5]);
        assert(standings.leaders.every(row => Object.keys(row).sort().join(',') === 'is_me,points,position'));
        await login(1); assert.equal((await score()).mine.position, 8);
        await db.exec("reset role");
        await rows("update tellme_private.activity_points set month=(date_trunc('month',now() at time zone 'UTC')-interval '1 month')::date,awarded_at=now()-interval '1 month'");
        await login(2);
        const next = await score();
        assert.equal(next.mine.points, 0); assert.equal(next.leaders.length, 0);
        assert.equal(next.previous_reward.reward_eur, 20); assert.equal(next.previous_reward.position, 1);
        await db.exec("reset role");
        const frozen = await rows("select * from tellme_private.monthly_results order by position");
        assert.equal(frozen.length, 5); assert.deepEqual(frozen.map(row => row.reward_eur), [20,15,10,0,0]);
        await rows("update tellme_private.activity_points set active=false");
        await login(2); assert.equal((await score()).previous_reward.points, 20);
        await assert.rejects(rows("update tellme_private.monthly_results set reward_eur=999"), /permission denied/);
        await db.exec("reset role"); await rows("delete from profiles where id=$1", [id(2)]);
        await login(2); await assert.rejects(score(), /ACCOUNT_NOT_FOUND/);
    } finally { await db.close(); }
});
