-- Fun : appliquer dans le SQL Editor du projet Supabase existant.
begin;

create schema if not exists tellme_private;
revoke all on schema tellme_private from public,anon,authenticated;

create table if not exists public.secret_boxes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references public.profiles(id) on delete cascade,
 public_token uuid not null unique default gen_random_uuid()
);
create table if not exists public.secrets (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check(char_length(content) between 1 and 800),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 reply text check(char_length(reply)<=600),
 card_theme text not null default 'blue' check(card_theme in ('blue','violet','pink','night','gradient','slate')),
 replied_at timestamptz
);
create index if not exists secrets_inbox on public.secrets(recipient_id,created_at desc,id desc);
create index if not exists secrets_unread on public.secrets(recipient_id) where read_at is null;

create table if not exists public.storytimes (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check(char_length(content) between 1 and 2000),
 theme text not null default 'blue' check(theme in ('blue','violet','pink','night','gradient','slate')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours')
);
create index if not exists storytimes_feed on public.storytimes(created_at desc,id desc);
create index if not exists storytimes_author on public.storytimes(author_id,created_at desc);

create table if not exists tellme_private.storytime_views (
 story_id uuid not null references public.storytimes(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(story_id,user_id)
);
create table if not exists tellme_private.storytime_reports (
 story_id uuid not null references public.storytimes(id) on delete cascade,
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(reason in ('abuse','spam','other')),
 content_snapshot text not null,
 created_at timestamptz not null default now(),
 primary key(story_id,reporter_id)
);
create table if not exists tellme_private.fun_rate_limits (
 scope text not null,
 fingerprint text not null,
 bucket bigint not null,
 count integer not null default 1,
 primary key(scope,fingerprint,bucket)
);
create table if not exists tellme_private.fun_configuration (
 id boolean primary key default true check(id),
 salt text not null default gen_random_uuid()::text
);
insert into tellme_private.fun_configuration(id) values(true) on conflict do nothing;
create table if not exists tellme_private.secret_challenges (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 box_id uuid not null references public.secret_boxes(id) on delete cascade,
 salt text not null default gen_random_uuid()::text,
 fingerprint text not null,
 created_at timestamptz not null default now(),
 content_hash text,
 used boolean not null default false
);

alter table public.secret_boxes enable row level security;
alter table public.secrets enable row level security;
alter table public.storytimes enable row level security;
revoke all on public.secret_boxes,public.secrets,public.storytimes from anon,authenticated;
drop policy if exists secrets_recipient_select on public.secrets;
create policy secrets_recipient_select on public.secrets for select to authenticated
 using(recipient_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid()));
grant select on public.secrets to authenticated;

create or replace function tellme_private.fun_user()
returns uuid language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then
  raise exception 'ACCOUNT_NOT_FOUND';
 end if;
 return auth.uid();
end $$;

create or replace function tellme_private.consume_fun_rate(rate_scope text,rate_key text,max_count integer,seconds integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_count integer;
begin
 insert into tellme_private.fun_rate_limits(scope,fingerprint,bucket)
 values(rate_scope,rate_key,floor(extract(epoch from now())/seconds)::bigint)
 on conflict(scope,fingerprint,bucket) do update set count=fun_rate_limits.count+1
 returning count into current_count;
 if current_count>max_count then raise exception 'FUN_RATE_LIMIT'; end if;
end $$;

create or replace function tellme_private.guest_fingerprint()
returns text language sql stable security definer set search_path=public,pg_temp as $$
 select encode(sha256(convert_to(c.salt||':'||coalesce(
  nullif(current_setting('request.headers',true),'')::jsonb->>'cf-connecting-ip',
  split_part(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for',',',1),
  'unknown'
 ),'UTF8')),'hex') from tellme_private.fun_configuration c where c.id;
$$;

create or replace function public.get_secret_box()
returns table(public_token uuid) language plpgsql security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 insert into public.secret_boxes(owner_id) values(current_user_id) on conflict(owner_id) do nothing;
 return query select b.public_token from public.secret_boxes b where b.owner_id=current_user_id;
end $$;

create or replace function public.get_secret_recipient(target_token uuid)
returns table(display_name text) language sql stable security definer set search_path=public,pg_temp as $$
 select 'TellMe'::text from public.secret_boxes b join public.profiles p on p.id=b.owner_id
 where b.public_token=target_token;
$$;

create or replace function public.create_secret_challenge(target_token uuid,target_request_id uuid)
returns table(challenge_id uuid,salt text) language plpgsql security definer set search_path=public,pg_temp as $$
declare box uuid; request_fingerprint text:=tellme_private.guest_fingerprint();
begin
 select b.id into box from public.secret_boxes b join public.profiles p on p.id=b.owner_id where b.public_token=target_token;
 if box is null then raise exception 'SECRET_LINK_UNAVAILABLE'; end if;
 if target_request_id is null then raise exception 'INVALID_REQUEST'; end if;
 perform tellme_private.consume_fun_rate('challenge',request_fingerprint,30,600);
 delete from tellme_private.secret_challenges where created_at<now()-interval '1 day'
 or (request_id=target_request_id and created_at<now()-interval '10 minutes' and not used);
 delete from tellme_private.fun_rate_limits where bucket*600<extract(epoch from now()-interval '2 days') and scope in ('challenge','secret-ip');
 insert into tellme_private.secret_challenges(request_id,box_id,fingerprint)
 values(target_request_id,box,request_fingerprint) on conflict(request_id) do nothing;
 return query select c.id,c.salt from tellme_private.secret_challenges c
 where c.request_id=target_request_id and c.box_id=box and c.fingerprint=request_fingerprint and (c.used or c.created_at>now()-interval '10 minutes');
end $$;

create or replace function public.send_secret(target_challenge_id uuid,proof_nonce text,message_text text,website text default '')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare challenge tellme_private.secret_challenges%rowtype; recipient uuid; clean_text text:=btrim(message_text); body_hash text;
begin
 if coalesce(website,'')<>'' or clean_text is null or char_length(clean_text) not between 1 and 800 then raise exception 'INVALID_SECRET'; end if;
 if proof_nonce is null or proof_nonce!~'^[0-9]{1,12}$' then raise exception 'INVALID_PROOF'; end if;
 select * into challenge from tellme_private.secret_challenges where id=target_challenge_id for update;
 if not found or (challenge.created_at<now()-interval '10 minutes' and not challenge.used) or challenge.fingerprint<>tellme_private.guest_fingerprint() then
  raise exception 'EXPIRED_CHALLENGE';
 end if;
 if left(encode(sha256(convert_to(challenge.salt||':'||proof_nonce,'UTF8')),'hex'),4)<>'0000' then raise exception 'INVALID_PROOF'; end if;
 body_hash:=encode(sha256(convert_to(clean_text,'UTF8')),'hex');
 if challenge.used then
  if challenge.content_hash=body_hash then return; end if;
  raise exception 'CHALLENGE_USED';
 end if;
 select owner_id into recipient from public.secret_boxes where id=challenge.box_id;
 if recipient is null then raise exception 'SECRET_LINK_UNAVAILABLE'; end if;
 perform tellme_private.consume_fun_rate('secret-ip',challenge.fingerprint,10,600);
 perform tellme_private.consume_fun_rate('secret-box',challenge.box_id::text,50,3600);
 insert into public.secrets(recipient_id,content) values(recipient,clean_text);
 update tellme_private.secret_challenges set used=true,content_hash=body_hash where id=challenge.id;
end $$;

create or replace function public.get_secrets_unread_count()
returns bigint language sql stable security definer set search_path=public,pg_temp as $$
 select count(*) from public.secrets s where s.recipient_id=tellme_private.fun_user() and s.read_at is null;
$$;

create or replace function public.get_my_secrets(before_time timestamptz default null,before_id uuid default null,read_filter text default 'all')
returns table(id uuid,content text,created_at timestamptz,read_at timestamptz,reply text,card_theme text,replied_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 if read_filter not in ('all','read','unread') or read_filter is null then raise exception 'INVALID_FILTER'; end if;
 return query select s.id,s.content,s.created_at,s.read_at,s.reply,s.card_theme,s.replied_at from public.secrets s
 where s.recipient_id=current_user_id
 and (read_filter='all' or (read_filter='read' and s.read_at is not null) or (read_filter='unread' and s.read_at is null))
 and (before_time is null or (s.created_at,s.id)<(before_time,before_id))
 order by s.created_at desc,s.id desc limit 21;
end $$;

create or replace function public.get_my_secret(target_id uuid)
returns table(id uuid,content text,created_at timestamptz,read_at timestamptz,reply text,card_theme text,replied_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 return query select s.id,s.content,s.created_at,s.read_at,s.reply,s.card_theme,s.replied_at from public.secrets s
 where s.id=target_id and s.recipient_id=current_user_id;
end $$;

create or replace function public.read_secret(target_id uuid)
returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare read_time timestamptz;
begin
 update public.secrets set read_at=coalesce(read_at,now())
 where id=target_id and recipient_id=tellme_private.fun_user()
 returning read_at into read_time;
 if not found then raise exception 'SECRET_ACCESS_DENIED'; end if;
 return read_time;
end $$;

create or replace function public.save_secret_reply(target_id uuid,reply_text text,target_theme text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if reply_text is null or char_length(btrim(reply_text)) not between 1 and 600 then raise exception 'INVALID_REPLY'; end if;
 update public.secrets set reply=btrim(reply_text),card_theme=target_theme,replied_at=now()
 where id=target_id and recipient_id=tellme_private.fun_user();
 if not found then raise exception 'SECRET_ACCESS_DENIED'; end if;
end $$;

create or replace function public.delete_secret(target_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 delete from public.secrets where id=target_id and recipient_id=tellme_private.fun_user();
 if not found then raise exception 'SECRET_ACCESS_DENIED'; end if;
end $$;

create or replace function public.get_storytimes(before_time timestamptz default null,before_id uuid default null)
returns table(id uuid,content text,theme text,created_at timestamptz,expires_at timestamptz,seen boolean)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 return query select s.id,s.content,s.theme,s.created_at,s.expires_at,
 exists(select 1 from tellme_private.storytime_views v where v.story_id=s.id and v.user_id=current_user_id)
 from public.storytimes s where s.expires_at>now()
 and (before_time is null or (s.created_at,s.id)<(before_time,before_id))
 order by s.created_at desc,s.id desc limit 11;
end $$;

create or replace function public.get_my_storytimes()
returns table(id uuid,content text,theme text,created_at timestamptz,expires_at timestamptz,seen boolean)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 return query select s.id,s.content,s.theme,s.created_at,s.expires_at,true
 from public.storytimes s where s.author_id=current_user_id and s.expires_at>now()
 order by s.created_at desc,s.id desc;
end $$;

create or replace function public.create_storytime(story_text text,target_theme text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user(); story uuid;
begin
 if story_text is null or char_length(btrim(story_text)) not between 1 and 2000 then raise exception 'INVALID_STORY'; end if;
 perform pg_advisory_xact_lock(hashtextextended(current_user_id::text,31));
 if (select count(*) from public.storytimes where author_id=current_user_id and expires_at>now())>=5 then raise exception 'STORY_LIMIT'; end if;
 perform tellme_private.consume_fun_rate('story',current_user_id::text,10,86400);
 insert into public.storytimes(author_id,content,theme) values(current_user_id,btrim(story_text),target_theme) returning id into story;
 return story;
end $$;

create or replace function public.read_storytime(target_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 if not exists(select 1 from public.storytimes where id=target_id and expires_at>now()) then raise exception 'STORY_EXPIRED'; end if;
 insert into tellme_private.storytime_views(story_id,user_id) values(target_id,current_user_id) on conflict do nothing;
end $$;

create or replace function public.delete_storytime(target_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 delete from public.storytimes where id=target_id and author_id=tellme_private.fun_user();
 if not found then raise exception 'STORY_ACCESS_DENIED'; end if;
end $$;

create or replace function public.report_storytime(target_id uuid,report_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 if report_reason not in ('abuse','spam','other') or report_reason is null then raise exception 'INVALID_REPORT'; end if;
 perform tellme_private.consume_fun_rate('report',current_user_id::text,20,3600);
 insert into tellme_private.storytime_reports(story_id,reporter_id,reason,content_snapshot)
 select s.id,current_user_id,report_reason,s.content from public.storytimes s where s.id=target_id and s.expires_at>now()
 on conflict(story_id,reporter_id) do nothing;
end $$;

revoke all on all functions in schema tellme_private from public,anon,authenticated;
revoke all on function public.get_secret_box(),public.get_secret_recipient(uuid),public.create_secret_challenge(uuid,uuid),
public.send_secret(uuid,text,text,text),public.get_secrets_unread_count(),public.get_my_secrets(timestamptz,uuid,text),
public.get_my_secret(uuid),public.read_secret(uuid),public.save_secret_reply(uuid,text,text),public.delete_secret(uuid),
public.get_storytimes(timestamptz,uuid),public.get_my_storytimes(),public.create_storytime(text,text),
public.read_storytime(uuid),public.delete_storytime(uuid),public.report_storytime(uuid,text) from public,anon,authenticated;

grant execute on function public.get_secret_recipient(uuid),public.create_secret_challenge(uuid,uuid),public.send_secret(uuid,text,text,text) to anon,authenticated;
grant execute on function public.get_secret_box(),public.get_secrets_unread_count(),public.get_my_secrets(timestamptz,uuid,text),
public.get_my_secret(uuid),public.read_secret(uuid),public.save_secret_reply(uuid,text,text),public.delete_secret(uuid),
public.get_storytimes(timestamptz,uuid),public.get_my_storytimes(),public.create_storytime(text,text),
public.read_storytime(uuid),public.delete_storytime(uuid),public.report_storytime(uuid,text) to authenticated;

do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
 select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='secrets') then
  alter publication supabase_realtime add table public.secrets;
 end if;
end $$;
commit;
