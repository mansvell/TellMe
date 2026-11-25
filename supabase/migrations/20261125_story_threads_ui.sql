-- Ajustements 1.0.4 : fils paginés, pseudo des notifications, nouveaux prix.
-- À exécuter après 20261125_story_threads_rewards.sql.
begin;
create index if not exists storytime_comments_replies on tellme_private.storytime_comments(parent_id,created_at,id);

create or replace function tellme_private.comment_node(target uuid, viewer uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',c.id,'content',c.content,'created_at',c.created_at,
 'display_prefix',left(coalesce(nullif(regexp_replace(normalize(p.display_name::text,NFC),'[^[:alnum:]]','','g'),''),'?'),2),
 'color',coalesce(p.default_color::text,'#0EA5E9'),'own',c.user_id=viewer,'parent_id',c.parent_id,
 'reply_to',tellme_private.comment_quote(c.parent_id),
 'like_count',(select count(*) from tellme_private.storytime_comment_reactions r where r.comment_id=c.id and r.reaction='like'),
 'dislike_count',(select count(*) from tellme_private.storytime_comment_reactions r where r.comment_id=c.id and r.reaction='dislike'),
 'laugh_count',(select count(*) from tellme_private.storytime_comment_reactions r where r.comment_id=c.id and r.reaction='laugh'),
 'my_reaction',(select r.reaction from tellme_private.storytime_comment_reactions r where r.comment_id=c.id and r.user_id=viewer),
 'reply_count',(select count(*) from tellme_private.storytime_comments r where r.parent_id=c.id),'replies','[]'::jsonb)
 from tellme_private.storytime_comments c join public.profiles p on p.id=c.user_id
 join public.storytimes s on s.id=c.story_id and s.expires_at>now() where c.id=target;
$$;
create or replace function public.get_storytime_threads(target_id uuid,before_time timestamptz default null,before_id uuid default null)
returns setof jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 if not exists(select 1 from public.storytimes s where s.id=target_id and s.expires_at>now()) then raise exception 'STORY_EXPIRED'; end if;
 if (before_time is null) <> (before_id is null) then raise exception 'INVALID_CURSOR'; end if;
 return query select tellme_private.comment_node(c.id,viewer) || jsonb_build_object('replies',coalesce((
  select jsonb_agg(tellme_private.comment_node(r.id,viewer) order by r.created_at,r.id)
  from (select x.id,x.created_at from tellme_private.storytime_comments x where x.parent_id=c.id order by x.created_at,x.id limit 2) r
 ),'[]'::jsonb))
 from tellme_private.storytime_comments c where c.story_id=target_id and c.parent_id is null
 and (before_time is null or (c.created_at,c.id)<(before_time,before_id)) order by c.created_at desc,c.id desc limit 21;
end $$;
create or replace function public.get_storytime_replies(target_id uuid,parent_comment_id uuid,after_time timestamptz default null,after_id uuid default null)
returns setof jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user();
begin
 if not exists(select 1 from public.storytimes s where s.id=target_id and s.expires_at>now()) then raise exception 'STORY_EXPIRED'; end if;
 if not exists(select 1 from tellme_private.storytime_comments c where c.id=parent_comment_id and c.story_id=target_id) then raise exception 'COMMENT_UNAVAILABLE'; end if;
 if (after_time is null) <> (after_id is null) then raise exception 'INVALID_CURSOR'; end if;
 return query select tellme_private.comment_node(c.id,viewer) from tellme_private.storytime_comments c
 where c.story_id=target_id and c.parent_id=parent_comment_id
 and (after_time is null or (c.created_at,c.id)>(after_time,after_id)) order by c.created_at,c.id limit 11;
end $$;
create or replace function public.get_storytime_comment_node(target_id uuid,target_comment_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare viewer uuid:=tellme_private.fun_user(); result jsonb;
begin
 if not exists(select 1 from tellme_private.storytime_comments c where c.id=target_comment_id and c.story_id=target_id) then raise exception 'COMMENT_UNAVAILABLE'; end if;
 result:=tellme_private.comment_node(target_comment_id,viewer);
 if result is null then raise exception 'STORY_EXPIRED'; end if;
 return result;
end $$;

alter table public.story_notifications add column if not exists actor_name text;
update public.story_notifications n set actor_name=p.display_name::text
from tellme_private.storytime_comments c,public.storytimes s,public.profiles p
where c.id=n.comment_id and s.id=n.story_id
and p.id=case when n.kind='story_reply' then s.author_id else c.user_id end and n.actor_name is null;
create or replace function tellme_private.story_notification_actor()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 select p.display_name::text into new.actor_name from tellme_private.storytime_comments c
 join public.storytimes s on s.id=new.story_id
 join public.profiles p on p.id=case when new.kind='story_reply' then s.author_id else c.user_id end
 where c.id=new.comment_id;
 return new;
end $$;
drop trigger if exists story_notification_actor on public.story_notifications;
create trigger story_notification_actor before insert on public.story_notifications for each row execute function tellme_private.story_notification_actor();

-- Les résultats déjà clôturés ne sont pas réécrits.
create or replace function tellme_private.finalize_activity_months()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare target date;
begin
 for target in select distinct month from tellme_private.activity_points
  where month<date_trunc('month',now() at time zone 'UTC')::date order by month loop
  perform pg_advisory_xact_lock(hashtextextended(target::text,105));
  if exists(select 1 from tellme_private.monthly_results where month=target) then continue; end if;
  insert into tellme_private.monthly_results(month,position,user_id,points,reward_eur,payment_status)
  select target,r.position,r.user_id,r.points,case when r.points>=200 then case r.position when 1 then 30 when 2 then 20 when 3 then 15 else 0 end else 0 end,
   case when r.position<=3 and r.points>=200 then 'pending' else 'not_applicable' end
  from (select p.user_id,count(*) as points,row_number() over(order by count(*) desc,max(p.awarded_at),p.user_id) as position
   from tellme_private.activity_points p where p.month=target and p.active group by p.user_id) r where r.position<=5;
 end loop;
end $$;
revoke all on function tellme_private.comment_node(uuid,uuid),tellme_private.story_notification_actor() from public,anon,authenticated;
revoke all on function public.get_storytime_threads(uuid,timestamptz,uuid),public.get_storytime_replies(uuid,uuid,timestamptz,uuid),public.get_storytime_comment_node(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_storytime_threads(uuid,timestamptz,uuid),public.get_storytime_replies(uuid,uuid,timestamptz,uuid),public.get_storytime_comment_node(uuid,uuid) to authenticated;
commit;
