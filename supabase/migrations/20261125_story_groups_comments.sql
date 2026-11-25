-- Version 1.0.3 : cercles par auteur anonyme, commentaires et réactions.
-- À exécuter après les migrations Fun existantes, dans Supabase SQL Editor.
begin;

create table if not exists tellme_private.storytime_comments (
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.storytimes(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check(char_length(btrim(content)) between 1 and 600),
 created_at timestamptz not null default now()
);
create index if not exists storytime_comments_thread on tellme_private.storytime_comments(story_id,created_at desc,id desc);
create table if not exists tellme_private.storytime_comment_reactions (
 comment_id uuid not null references tellme_private.storytime_comments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 reaction text not null check(reaction in ('like','dislike','laugh')),
 primary key(comment_id,user_id)
);
alter table tellme_private.storytime_comments enable row level security;
alter table tellme_private.storytime_comment_reactions enable row level security;
revoke all on tellme_private.storytime_comments,tellme_private.storytime_comment_reactions from public,anon,authenticated;

-- La clé de regroupement est opaque : ni UUID du profil ni pseudo de l'auteur.
create or replace function public.get_storytime_groups(before_time timestamptz default null,before_key text default null)
returns table(author_key text,created_at timestamptz,stories jsonb)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 if (before_time is null) <> (before_key is null) then raise exception 'INVALID_CURSOR'; end if;
 return query with grouped as (
  select s.author_id,
   encode(sha256(convert_to(c.salt||':story-author:'||s.author_id::text,'UTF8')),'hex') as author_key,
   max(s.created_at) as latest
  from public.storytimes s cross join tellme_private.fun_configuration c
  where s.expires_at>now() and s.author_id<>current_user_id
  group by s.author_id,c.salt
 ), page as (
  select g.* from grouped g
  where before_time is null or (g.latest,g.author_key)<(before_time,before_key)
  order by g.latest desc,g.author_key desc limit 11
 )
 select g.author_key,g.latest,jsonb_agg(jsonb_build_object(
  'id',s.id,'content',s.content,'theme',s.theme,'created_at',s.created_at,'expires_at',s.expires_at,
  'seen',exists(select 1 from tellme_private.storytime_views v where v.story_id=s.id and v.user_id=current_user_id)
 ) order by s.created_at,s.id)
 from page g join public.storytimes s on s.author_id=g.author_id and s.expires_at>now()
 group by g.author_key,g.latest order by g.latest desc,g.author_key desc;
end $$;

create or replace function public.get_storytime_comments(target_id uuid,before_time timestamptz default null,before_id uuid default null)
returns table(id uuid,content text,created_at timestamptz,display_prefix text,color text,own boolean,
 like_count bigint,dislike_count bigint,laugh_count bigint,my_reaction text)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 if not exists(select 1 from public.storytimes s where s.id=target_id and s.expires_at>now()) then raise exception 'STORY_EXPIRED'; end if;
 if (before_time is null) <> (before_id is null) then raise exception 'INVALID_CURSOR'; end if;
 return query select c.id,c.content,c.created_at,
  left(coalesce(nullif(regexp_replace(normalize(p.display_name::text,NFC),'[^[:alnum:]]','','g'),''),'?'),2),
  coalesce(p.default_color::text,'#0EA5E9'),c.user_id=current_user_id,
  count(r.user_id) filter(where r.reaction='like'),
  count(r.user_id) filter(where r.reaction='dislike'),
  count(r.user_id) filter(where r.reaction='laugh'),
  max(r.reaction) filter(where r.user_id=current_user_id)
 from (select x.* from tellme_private.storytime_comments x where x.story_id=target_id
  and (before_time is null or (x.created_at,x.id)<(before_time,before_id))
  order by x.created_at desc,x.id desc limit 21) c
 join public.profiles p on p.id=c.user_id
 left join tellme_private.storytime_comment_reactions r on r.comment_id=c.id
 group by c.id,c.content,c.created_at,c.user_id,p.display_name,p.default_color
 order by c.created_at desc,c.id desc;
end $$;

create or replace function public.add_storytime_comment(target_id uuid,comment_text text,request_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user(); existing tellme_private.storytime_comments%rowtype;
begin
 if request_id is null or comment_text is null or char_length(btrim(comment_text)) not between 1 and 600 then raise exception 'INVALID_COMMENT'; end if;
 perform 1 from public.storytimes s where s.id=target_id and s.expires_at>now() for key share;
 if not found then raise exception 'STORY_EXPIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_id::text,73));
 select * into existing from tellme_private.storytime_comments c where c.id=request_id;
 if found then
  if existing.user_id=current_user_id and existing.story_id=target_id and existing.content=btrim(comment_text) then return request_id; end if;
  raise exception 'COMMENT_REQUEST_USED';
 end if;
 perform tellme_private.consume_fun_rate('story-comment',current_user_id::text,20,300);
 insert into tellme_private.storytime_comments(id,story_id,user_id,content) values(request_id,target_id,current_user_id,btrim(comment_text));
 return request_id;
end $$;

create or replace function public.set_storytime_comment_reaction(target_comment_id uuid,target_reaction text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 if target_reaction is not null and target_reaction not in ('like','dislike','laugh') then raise exception 'INVALID_REACTION'; end if;
 perform 1 from tellme_private.storytime_comments c join public.storytimes s on s.id=c.story_id
 where c.id=target_comment_id and s.expires_at>now() for key share of c,s;
 if not found then raise exception 'STORY_EXPIRED'; end if;
 perform tellme_private.consume_fun_rate('story-reaction',current_user_id::text,120,60);
 if target_reaction is null then
  delete from tellme_private.storytime_comment_reactions where comment_id=target_comment_id and user_id=current_user_id;
 else
  insert into tellme_private.storytime_comment_reactions(comment_id,user_id,reaction) values(target_comment_id,current_user_id,target_reaction)
  on conflict(comment_id,user_id) do update set reaction=excluded.reaction;
 end if;
end $$;

create or replace function public.delete_storytime_comment(target_comment_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 delete from tellme_private.storytime_comments where id=target_comment_id and user_id=tellme_private.fun_user();
 if not found then raise exception 'COMMENT_ACCESS_DENIED'; end if;
end $$;

revoke all on function public.get_storytime_groups(timestamptz,text),public.get_storytime_comments(uuid,timestamptz,uuid),
 public.add_storytime_comment(uuid,text,uuid),public.set_storytime_comment_reaction(uuid,text),public.delete_storytime_comment(uuid) from public,anon,authenticated;
grant execute on function public.get_storytime_groups(timestamptz,text),public.get_storytime_comments(uuid,timestamptz,uuid),
 public.add_storytime_comment(uuid,text,uuid),public.set_storytime_comment_reaction(uuid,text),public.delete_storytime_comment(uuid) to authenticated;
commit;
