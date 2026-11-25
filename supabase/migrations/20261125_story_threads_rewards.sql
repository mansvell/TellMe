-- TellMe 1.0.4. Après 20261125_story_groups_comments.sql.
begin;

alter table public.storytimes alter column expires_at set default (now()+interval '4 days');
-- Prolonger les Stories encore visibles, sans faire réapparaître les anciennes.
update public.storytimes set expires_at=created_at+interval '4 days' where expires_at>now();
alter table tellme_private.storytime_comments add column if not exists parent_id uuid
 references tellme_private.storytime_comments(id) on delete set null;
alter table public.storytimes add column if not exists reply_comment_id uuid
 references tellme_private.storytime_comments(id) on delete set null;
create index if not exists storytime_comments_parent on tellme_private.storytime_comments(parent_id);

create table if not exists public.story_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 story_id uuid not null references public.storytimes(id) on delete cascade,
 comment_id uuid not null references tellme_private.storytime_comments(id) on delete cascade,
 kind text not null check(kind in ('comment','reply','story_reply')),
 created_at timestamptz not null default now(), read_at timestamptz,
 unique(recipient_id,story_id,comment_id,kind)
);
create index if not exists story_notifications_inbox on public.story_notifications(recipient_id,created_at desc,id desc);
alter table public.story_notifications enable row level security;
revoke all on public.story_notifications from public,anon,authenticated;
grant select on public.story_notifications to authenticated;
drop policy if exists story_notifications_recipient on public.story_notifications;
create policy story_notifications_recipient on public.story_notifications for select to authenticated using(recipient_id=auth.uid());

create table if not exists tellme_private.activity_points (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 month date not null,
 kind text not null check(kind in ('story','comment','reaction')),
 event_key text not null, source_id uuid not null, story_id uuid not null,
 awarded_at timestamptz not null default now(), active boolean not null default true,
 unique(user_id,month,kind,event_key)
);
create index if not exists activity_points_month on tellme_private.activity_points(month,user_id) where active;
create index if not exists activity_points_source on tellme_private.activity_points(user_id,kind,source_id,month);
create index if not exists activity_points_daily on tellme_private.activity_points(user_id,kind,awarded_at);
create table if not exists tellme_private.monthly_results (
 month date not null, position integer not null check(position between 1 and 5),
 user_id uuid references public.profiles(id) on delete set null,
 points bigint not null, reward_eur integer not null,
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','not_applicable')),
 finalized_at timestamptz not null default now(),
 primary key(month,position), unique(month,user_id)
);
alter table tellme_private.activity_points enable row level security;
alter table tellme_private.monthly_results enable row level security;
revoke all on tellme_private.activity_points,tellme_private.monthly_results from public,anon,authenticated;

-- Le client ne peut attribuer ni points ni positions. Les suppressions volontaires
-- annulent le point du mois courant. Une expiration/cascade ne pénalise pas les autres.
create or replace function tellme_private.award_activity(who uuid, action text, event text, source uuid, story uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_month date:=date_trunc('month',now() at time zone 'UTC')::date;
 daily_limit integer:=case action when 'story' then 10 when 'comment' then 20 when 'reaction' then 10 else 0 end;
begin
 if daily_limit=0 then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(who::text,104));
 if action='reaction' then
  update tellme_private.activity_points set active=true where user_id=who and month=current_month
   and kind=action and event_key=event and source_id=source;
  if found then return; end if;
 end if;
 if (select count(*) from tellme_private.activity_points p where p.user_id=who and p.kind=action
  and p.awarded_at >= (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')) >= daily_limit then return; end if;
 insert into tellme_private.activity_points(user_id,month,kind,event_key,source_id,story_id)
 values(who,current_month,action,event,source,story) on conflict do nothing;
end $$;
create or replace function tellme_private.revoke_activity(who uuid, action text, source uuid)
returns void language sql security definer set search_path=public,pg_temp as $$
 update tellme_private.activity_points set active=false where user_id=who and kind=action and source_id=source
 and month=date_trunc('month',now() at time zone 'UTC')::date;
$$;

create or replace function tellme_private.comment_quote(target uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',c.id,'content',c.content,
 'display_prefix',left(coalesce(nullif(regexp_replace(normalize(p.display_name::text,NFC),'[^[:alnum:]]','','g'),''),'?'),2),
 'color',coalesce(p.default_color::text,'#0EA5E9'))
 from tellme_private.storytime_comments c join public.profiles p on p.id=c.user_id
 join public.storytimes origin on origin.id=c.story_id and origin.expires_at>now() where c.id=target;
$$;
create or replace function tellme_private.story_json(target uuid, viewer uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',s.id,'content',s.content,'theme',s.theme,'created_at',s.created_at,'expires_at',s.expires_at,
 'seen',s.author_id=viewer or exists(select 1 from tellme_private.storytime_views v where v.story_id=s.id and v.user_id=viewer),
 'comment_count',(select count(*) from tellme_private.storytime_comments c where c.story_id=s.id),
 'comment_quote',tellme_private.comment_quote(s.reply_comment_id))
 from public.storytimes s where s.id=target and s.expires_at>now();
$$;
create or replace function public.get_storytime(target_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user(); result jsonb;
begin
 result:=tellme_private.story_json(target_id,viewer);
 if result is null then raise exception 'STORY_EXPIRED'; end if;
 return result;
end $$;
create or replace function public.get_my_storytimes_v2()
returns setof jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 return query select tellme_private.story_json(s.id,viewer) from public.storytimes s
 where s.author_id=viewer and s.expires_at>now() order by s.created_at desc,s.id desc;
end $$;
create or replace function public.get_storytime_groups(before_time timestamptz default null,before_key text default null)
returns table(author_key text,created_at timestamptz,stories jsonb)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 if (before_time is null) <> (before_key is null) then raise exception 'INVALID_CURSOR'; end if;
 return query with grouped as (
  select s.author_id,encode(sha256(convert_to(c.salt||':story-author:'||s.author_id::text,'UTF8')),'hex') as author_key,max(s.created_at) as latest
  from public.storytimes s cross join tellme_private.fun_configuration c
  where s.expires_at>now() and s.author_id<>viewer group by s.author_id,c.salt
 ), page as (
  select g.* from grouped g where before_time is null or (g.latest,g.author_key)<(before_time,before_key)
  order by g.latest desc,g.author_key desc limit 11
 ) select g.author_key,g.latest,jsonb_agg(tellme_private.story_json(s.id,viewer) order by s.created_at,s.id)
 from page g join public.storytimes s on s.author_id=g.author_id and s.expires_at>now()
 group by g.author_key,g.latest order by g.latest desc,g.author_key desc;
end $$;

create or replace function public.get_storytime_comments_v2(target_id uuid,before_time timestamptz default null,before_id uuid default null)
returns table(id uuid,content text,created_at timestamptz,display_prefix text,color text,own boolean,
 like_count bigint,dislike_count bigint,laugh_count bigint,my_reaction text,parent_id uuid,reply_to jsonb)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 if not exists(select 1 from public.storytimes s where s.id=target_id and s.expires_at>now()) then raise exception 'STORY_EXPIRED'; end if;
 if (before_time is null) <> (before_id is null) then raise exception 'INVALID_CURSOR'; end if;
 return query select c.id,c.content,c.created_at,
 left(coalesce(nullif(regexp_replace(normalize(p.display_name::text,NFC),'[^[:alnum:]]','','g'),''),'?'),2),
 coalesce(p.default_color::text,'#0EA5E9'),c.user_id=viewer,
 count(r.user_id) filter(where r.reaction='like'),count(r.user_id) filter(where r.reaction='dislike'),
 count(r.user_id) filter(where r.reaction='laugh'),max(r.reaction) filter(where r.user_id=viewer),
 c.parent_id,tellme_private.comment_quote(c.parent_id)
 from (select x.* from tellme_private.storytime_comments x where x.story_id=target_id
 and (before_time is null or (x.created_at,x.id)<(before_time,before_id)) order by x.created_at desc,x.id desc limit 21) c
 join public.profiles p on p.id=c.user_id left join tellme_private.storytime_comment_reactions r on r.comment_id=c.id
 group by c.id,c.content,c.created_at,c.user_id,c.parent_id,p.display_name,p.default_color order by c.created_at desc,c.id desc;
end $$;

drop function if exists public.add_storytime_comment(uuid,text,uuid);
create or replace function public.add_storytime_comment(target_id uuid,comment_text text,request_id uuid,reply_to_id uuid default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user(); existing tellme_private.storytime_comments%rowtype;
begin
 if request_id is null or comment_text is null or char_length(btrim(comment_text)) not between 1 and 600 then raise exception 'INVALID_COMMENT'; end if;
 perform 1 from public.storytimes s where s.id=target_id and s.expires_at>now() for key share;
 if not found then raise exception 'STORY_EXPIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_id::text,73));
 select * into existing from tellme_private.storytime_comments c where c.id=request_id;
 if found then
  if existing.user_id=viewer and existing.story_id=target_id and existing.content=btrim(comment_text)
   and existing.parent_id is not distinct from reply_to_id then return request_id; end if;
  raise exception 'COMMENT_REQUEST_USED';
 end if;
 if reply_to_id is not null then
  perform 1 from tellme_private.storytime_comments c where c.id=reply_to_id and c.story_id=target_id for key share;
  if not found then raise exception 'COMMENT_UNAVAILABLE'; end if;
 end if;
 perform tellme_private.consume_fun_rate('story-comment',viewer::text,20,300);
 insert into tellme_private.storytime_comments(id,story_id,user_id,content,parent_id) values(request_id,target_id,viewer,btrim(comment_text),reply_to_id);
 return request_id;
end $$;

drop function if exists public.create_storytime(text,text);
create or replace function public.create_storytime(story_text text,target_theme text,quoted_comment_id uuid default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user(); story uuid;
begin
 if story_text is null or char_length(btrim(story_text)) not between 1 and 2000 then raise exception 'INVALID_STORY'; end if;
 if quoted_comment_id is not null then
  perform 1 from tellme_private.storytime_comments c join public.storytimes s on s.id=c.story_id
  where c.id=quoted_comment_id and s.expires_at>now() for key share of c,s;
  if not found then raise exception 'COMMENT_UNAVAILABLE'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(viewer::text,31));
 if (select count(*) from public.storytimes where author_id=viewer and expires_at>now())>=5 then raise exception 'STORY_LIMIT'; end if;
 perform tellme_private.consume_fun_rate('story',viewer::text,10,86400);
 insert into public.storytimes(author_id,content,theme,reply_comment_id) values(viewer,btrim(story_text),target_theme,quoted_comment_id) returning id into story;
 return story;
end $$;

create or replace function tellme_private.story_activity()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform tellme_private.award_activity(new.author_id,'story',encode(sha256(convert_to(lower(btrim(new.content)),'UTF8')),'hex'),new.id,new.id);
 if new.reply_comment_id is not null then
  insert into public.story_notifications(recipient_id,story_id,comment_id,kind)
  select c.user_id,new.id,c.id,'story_reply' from tellme_private.storytime_comments c
  where c.id=new.reply_comment_id and c.user_id<>new.author_id on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists story_activity on public.storytimes;
create trigger story_activity after insert on public.storytimes for each row execute function tellme_private.story_activity();
create or replace function tellme_private.comment_activity()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid; reply_owner uuid;
begin
 perform tellme_private.award_activity(new.user_id,'comment',new.story_id::text||':'||encode(sha256(convert_to(lower(btrim(new.content)),'UTF8')),'hex'),new.id,new.story_id);
 select author_id into owner from public.storytimes where id=new.story_id;
 select user_id into reply_owner from tellme_private.storytime_comments where id=new.parent_id;
 if reply_owner is not null and reply_owner<>new.user_id then
  insert into public.story_notifications(recipient_id,story_id,comment_id,kind) values(reply_owner,new.story_id,new.id,'reply') on conflict do nothing;
 end if;
 if owner<>new.user_id and owner is distinct from reply_owner then
  insert into public.story_notifications(recipient_id,story_id,comment_id,kind) values(owner,new.story_id,new.id,'comment') on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists comment_activity on tellme_private.storytime_comments;
create trigger comment_activity after insert on tellme_private.storytime_comments for each row execute function tellme_private.comment_activity();

create or replace function public.set_storytime_comment_reaction(target_comment_id uuid,target_reaction text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user(); target tellme_private.storytime_comments%rowtype;
begin
 if target_reaction is not null and target_reaction not in ('like','dislike','laugh') then raise exception 'INVALID_REACTION'; end if;
 select c.* into target from tellme_private.storytime_comments c join public.storytimes s on s.id=c.story_id
 where c.id=target_comment_id and s.expires_at>now() for key share of c,s;
 if not found then raise exception 'STORY_EXPIRED'; end if;
 perform tellme_private.consume_fun_rate('story-reaction',viewer::text,120,60);
 if target_reaction is null then
  delete from tellme_private.storytime_comment_reactions where comment_id=target_comment_id and user_id=viewer;
  perform tellme_private.revoke_activity(viewer,'reaction',target_comment_id);
 else
  insert into tellme_private.storytime_comment_reactions(comment_id,user_id,reaction) values(target_comment_id,viewer,target_reaction)
  on conflict(comment_id,user_id) do update set reaction=excluded.reaction;
  if target.user_id<>viewer then perform tellme_private.award_activity(viewer,'reaction',target_comment_id::text,target_comment_id,target.story_id); end if;
 end if;
end $$;
create or replace function public.delete_storytime_comment(target_comment_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 delete from tellme_private.storytime_comments where id=target_comment_id and user_id=viewer;
 if not found then raise exception 'COMMENT_ACCESS_DENIED'; end if;
 perform tellme_private.revoke_activity(viewer,'comment',target_comment_id);
end $$;
create or replace function public.delete_storytime(target_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 delete from public.storytimes where id=target_id and author_id=viewer;
 if not found then raise exception 'STORY_ACCESS_DENIED'; end if;
 perform tellme_private.revoke_activity(viewer,'story',target_id);
 -- Ses propres commentaires/réactions supprimés avec cette Story perdent aussi
 -- leur point. Les contributions des autres personnes ne sont pas pénalisées.
 update tellme_private.activity_points set active=false where user_id=viewer and story_id=target_id
  and month=date_trunc('month',now() at time zone 'UTC')::date;
end $$;

create or replace function public.get_story_notifications()
returns setof public.story_notifications language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 return query select n.* from public.story_notifications n join public.storytimes s on s.id=n.story_id
 where n.recipient_id=viewer and s.expires_at>now() order by (n.read_at is null) desc,n.created_at desc,n.id desc limit 50;
end $$;
create or replace function public.read_story_notification(target_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.story_notifications set read_at=coalesce(read_at,now()) where id=target_id and recipient_id=tellme_private.fun_user();
 if not found then raise exception 'NOTIFICATION_ACCESS_DENIED'; end if;
end $$;
create or replace function public.get_story_comment_quote(target_comment_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 perform tellme_private.fun_user();
 if not exists(select 1 from tellme_private.storytime_comments c join public.storytimes s on s.id=c.story_id
  where c.id=target_comment_id and s.expires_at>now()) then raise exception 'COMMENT_UNAVAILABLE'; end if;
 return tellme_private.comment_quote(target_comment_id);
end $$;

create or replace function tellme_private.finalize_activity_months()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare target date;
begin
 for target in select distinct month from tellme_private.activity_points
  where month < date_trunc('month',now() at time zone 'UTC')::date order by month loop
  perform pg_advisory_xact_lock(hashtextextended(target::text,105));
  if exists(select 1 from tellme_private.monthly_results where month=target) then continue; end if;
  insert into tellme_private.monthly_results(month,position,user_id,points,reward_eur,payment_status)
  select target,r.position,r.user_id,r.points,case r.position when 1 then 20 when 2 then 15 when 3 then 10 else 0 end,
   case when r.position<=3 then 'pending' else 'not_applicable' end
  from (select p.user_id,count(*) as points,row_number() over(order by count(*) desc,max(p.awarded_at),p.user_id) as position
   from tellme_private.activity_points p where p.month=target and p.active group by p.user_id) r where r.position<=5;
 end loop;
end $$;
create or replace function public.get_monthly_standings()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user(); current_month date:=date_trunc('month',now() at time zone 'UTC')::date; result jsonb;
begin
 perform tellme_private.finalize_activity_months();
 with ranked as (
  select p.user_id,count(*) as points,row_number() over(order by count(*) desc,max(p.awarded_at),p.user_id) as position
  from tellme_private.activity_points p where p.month=current_month and p.active group by p.user_id
 ) select jsonb_build_object('month',current_month,'ends_at',((current_month+interval '1 month') at time zone 'UTC'),
 'leaders',coalesce((select jsonb_agg(jsonb_build_object('position',r.position,'points',r.points,'is_me',r.user_id=viewer) order by r.position) from ranked r where r.position<=5),'[]'::jsonb),
 'mine',coalesce((select jsonb_build_object('position',r.position,'points',r.points) from ranked r where r.user_id=viewer),jsonb_build_object('position',null,'points',0)),
 'previous_reward',(select jsonb_build_object('month',m.month,'position',m.position,'points',m.points,'reward_eur',m.reward_eur,'payment_status',m.payment_status)
 from tellme_private.monthly_results m where m.user_id=viewer order by m.month desc limit 1)) into result;
 return result;
end $$;

create or replace function tellme_private.cleanup_expired_storytimes()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform tellme_private.finalize_activity_months();
 delete from public.storytimes where expires_at<=now();
end $$;

-- Aucune écriture directe ou fonction interne accessible depuis l'app.
revoke all on function tellme_private.award_activity(uuid,text,text,uuid,uuid),tellme_private.revoke_activity(uuid,text,uuid),
 tellme_private.comment_quote(uuid),tellme_private.story_json(uuid,uuid),tellme_private.story_activity(),tellme_private.comment_activity(),
 tellme_private.finalize_activity_months(),tellme_private.cleanup_expired_storytimes() from public,anon,authenticated;
revoke all on function public.get_storytime(uuid),public.get_my_storytimes_v2(),public.get_storytime_groups(timestamptz,text),
 public.get_storytime_comments_v2(uuid,timestamptz,uuid),public.add_storytime_comment(uuid,text,uuid,uuid),
 public.create_storytime(text,text,uuid),public.set_storytime_comment_reaction(uuid,text),public.delete_storytime_comment(uuid),
 public.delete_storytime(uuid),public.get_story_notifications(),public.read_story_notification(uuid),public.get_story_comment_quote(uuid),public.get_monthly_standings() from public,anon,authenticated;
grant execute on function public.get_storytime(uuid),public.get_my_storytimes_v2(),public.get_storytime_groups(timestamptz,text),
 public.get_storytime_comments_v2(uuid,timestamptz,uuid),public.add_storytime_comment(uuid,text,uuid,uuid),
 public.create_storytime(text,text,uuid),public.set_storytime_comment_reaction(uuid,text),public.delete_storytime_comment(uuid),
 public.delete_storytime(uuid),public.get_story_notifications(),public.read_story_notification(uuid),public.get_story_comment_quote(uuid),public.get_monthly_standings() to authenticated;
do $$begin
 if exists(select 1 from pg_roles where rolname='service_role') then
  grant select on public.story_notifications to service_role;
  grant usage on schema tellme_private to service_role;
  grant select,update on tellme_private.monthly_results to service_role;
  grant execute on function tellme_private.cleanup_expired_storytimes(),tellme_private.finalize_activity_months() to service_role;
 end if;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
  select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='story_notifications') then
  alter publication supabase_realtime add table public.story_notifications;
 end if;
 if exists(select 1 from pg_extension where extname='pg_cron') then
  execute $cron$select cron.schedule('tellme-story-cleanup','15 * * * *','select tellme_private.cleanup_expired_storytimes();')$cron$;
  execute $cron$select cron.schedule('tellme-monthly-results','0 0 1 * *','select tellme_private.finalize_activity_months();')$cron$;
 end if;
end $$;
commit;
