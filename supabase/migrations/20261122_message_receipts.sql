-- À exécuter une fois dans Supabase SQL Editor.
-- Les accusés de réception sont des événements réels, distincts de la lecture.
begin;
create table if not exists public.message_receipt_tracking (
 message_id uuid primary key references public.messages(id) on delete cascade,
 expected_count integer not null check(expected_count >= 0)
);
create table if not exists public.message_recipient_receipts (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.messages(id) on delete cascade,
 membership_id uuid references public.group_members(id) on delete set null,
 display_name text not null,
 color text not null default '#0EA5E9',
 delivered_at timestamptz,
 is_read boolean not null default false,
 read_at timestamptz,
 unique(message_id,membership_id)
);
create index if not exists message_recipient_receipts_message on public.message_recipient_receipts(message_id);
create index if not exists message_recipient_receipts_pending on public.message_recipient_receipts(membership_id) where delivered_at is null and not is_read;

create or replace function public.can_view_own_message_receipts(target_message_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.messages m join public.group_members gm on gm.id=m.sender_membership_id
 where m.id=target_message_id and gm.group_id=m.group_id and gm.user_id=auth.uid() and gm.status='active');
$$;
alter table public.message_receipt_tracking enable row level security;
alter table public.message_recipient_receipts enable row level security;
drop policy if exists sender_reads_tracking on public.message_receipt_tracking;
create policy sender_reads_tracking on public.message_receipt_tracking for select to authenticated
 using(public.can_view_own_message_receipts(message_id));
drop policy if exists sender_reads_receipts on public.message_recipient_receipts;
create policy sender_reads_receipts on public.message_recipient_receipts for select to authenticated
 using(public.can_view_own_message_receipts(message_id));
revoke all on public.message_receipt_tracking,public.message_recipient_receipts from anon,authenticated;
grant select on public.message_receipt_tracking,public.message_recipient_receipts to authenticated;

create or replace function public.snapshot_message_recipients()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient_count integer;
begin
 insert into public.message_recipient_receipts(message_id,membership_id,display_name,color)
 select new.id,gm.id,coalesce(p.display_name::text,'Utilisateur'),coalesce(gm.local_color,'#0EA5E9')
 from public.group_members gm left join public.profiles p on p.id=gm.user_id
 where gm.group_id=new.group_id and gm.status='active' and gm.id is distinct from new.sender_membership_id;
 get diagnostics recipient_count = row_count;
 insert into public.message_receipt_tracking(message_id,expected_count) values(new.id,recipient_count);
 return new;
end $$;
drop trigger if exists snapshot_message_recipients_after_insert on public.messages;
create trigger snapshot_message_recipients_after_insert after insert on public.messages for each row execute function public.snapshot_message_recipients();

create or replace function public.capture_message_read_receipt()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.message_recipient_receipts(message_id,membership_id,display_name,color,delivered_at,is_read,read_at)
 select new.message_id,gm.id,coalesce(p.display_name::text,'Utilisateur'),coalesce(gm.local_color,'#0EA5E9'),now(),true,now()
 from public.group_members gm join public.messages m on m.id=new.message_id
 left join public.profiles p on p.id=gm.user_id
 where gm.id=new.membership_id and gm.group_id=m.group_id and gm.id is distinct from m.sender_membership_id
 and (not exists(select 1 from public.message_receipt_tracking tr where tr.message_id=m.id)
      or exists(select 1 from public.message_recipient_receipts rr where rr.message_id=m.id and rr.membership_id=gm.id))
 on conflict(message_id,membership_id) do update set
 delivered_at=coalesce(message_recipient_receipts.delivered_at,excluded.delivered_at),
 is_read=true,read_at=coalesce(message_recipient_receipts.read_at,excluded.read_at);
 return new;
end $$;
drop trigger if exists capture_message_read_receipt_after_write on public.message_reads;
create trigger capture_message_read_receipt_after_write after insert or update on public.message_reads for each row execute function public.capture_message_read_receipt();

-- Les lectures antérieures restent consultables. Sans horodatage existant,
-- on conserve une date inconnue plutôt que d'inventer une heure de lecture.
insert into public.message_recipient_receipts(message_id,membership_id,display_name,color,delivered_at,is_read,read_at)
select r.message_id,gm.id,coalesce(p.display_name::text,'Utilisateur'),coalesce(gm.local_color,'#0EA5E9'),
 coalesce(nullif(to_jsonb(r)->>'read_at','')::timestamptz,nullif(to_jsonb(r)->>'created_at','')::timestamptz),true,
 coalesce(nullif(to_jsonb(r)->>'read_at','')::timestamptz,nullif(to_jsonb(r)->>'created_at','')::timestamptz)
from public.message_reads r join public.messages m on m.id=r.message_id
join public.group_members gm on gm.id=r.membership_id and gm.group_id=m.group_id
left join public.profiles p on p.id=gm.user_id
where gm.id is distinct from m.sender_membership_id
 and (not exists(select 1 from public.message_receipt_tracking tr where tr.message_id=m.id)
      or exists(select 1 from public.message_recipient_receipts rr where rr.message_id=m.id and rr.membership_id=gm.id))
on conflict(message_id,membership_id) do update set is_read=true,
 read_at=coalesce(message_recipient_receipts.read_at,excluded.read_at),
 delivered_at=coalesce(message_recipient_receipts.delivered_at,excluded.delivered_at);

create or replace function public.acknowledge_message_delivery(target_group_id uuid,target_message_ids uuid[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_membership uuid;
begin
 if auth.uid() is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 select id into current_membership from public.group_members where group_id=target_group_id and user_id=auth.uid() and status='active';
 if current_membership is null then raise exception 'GROUP_ACCESS_DENIED'; end if;
 if cardinality(target_message_ids)>500 then raise exception 'TOO_MANY_MESSAGES'; end if;
 update public.message_recipient_receipts rr set delivered_at=coalesce(rr.delivered_at,now())
 from public.messages m where m.id=rr.message_id and m.group_id=target_group_id and rr.membership_id=current_membership
 and rr.message_id=any(target_message_ids) and rr.delivered_at is null;
end $$;

-- Une lecture doit provenir d’un membre actif dans le même groupe.
create or replace function public.mark_visible_message_read(target_group_id uuid,target_message_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_membership uuid; sender_membership uuid;
begin
 if auth.uid() is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 select id into current_membership from public.group_members where group_id=target_group_id and user_id=auth.uid() and status='active';
 if current_membership is null then raise exception 'GROUP_ACCESS_DENIED'; end if;
 select sender_membership_id into sender_membership from public.messages where id=target_message_id and group_id=target_group_id and deleted_at is null;
 if not found then raise exception 'MESSAGE_ACCESS_DENIED'; end if;
 if sender_membership=current_membership then return; end if;
 insert into public.message_reads(message_id,membership_id) values(target_message_id,current_membership) on conflict(message_id,membership_id) do nothing;
end $$;

-- Le client reçoit les messages en attente même depuis Accueil, sans les lire.
create or replace function public.get_pending_message_deliveries()
returns table(message_id uuid,group_id uuid,content text,created_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select m.id,m.group_id,m.content,m.created_at from public.message_recipient_receipts rr
 join public.group_members gm on gm.id=rr.membership_id
 join public.messages m on m.id=rr.message_id and m.group_id=gm.group_id
 where gm.user_id=auth.uid() and gm.status='active' and m.deleted_at is null and rr.delivered_at is null and not rr.is_read
 order by m.created_at,m.id limit 200;
$$;

create or replace function public.get_message_receipt_summaries(target_message_ids uuid[])
returns table(message_id uuid,expected_count integer,delivered_count bigint,read_count bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 if cardinality(target_message_ids)>500 then raise exception 'TOO_MANY_MESSAGES'; end if;
 return query select m.id,tr.expected_count,
 count(rr.id) filter(where rr.delivered_at is not null or rr.is_read),count(rr.id) filter(where rr.is_read)
 from public.messages m left join public.message_receipt_tracking tr on tr.message_id=m.id
 left join public.message_recipient_receipts rr on rr.message_id=m.id
 where m.id=any(target_message_ids) and public.can_view_own_message_receipts(m.id)
 group by m.id,tr.expected_count;
end $$;

create or replace function public.get_message_receipt_details(target_message_id uuid)
returns table(receipt_id uuid,display_name text,color text,delivered_at timestamptz,is_read boolean,read_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.can_view_own_message_receipts(target_message_id) then raise exception 'MESSAGE_ACCESS_DENIED'; end if;
 return query select rr.id,coalesce(p.display_name::text,rr.display_name),rr.color,rr.delivered_at,rr.is_read,rr.read_at
 from public.message_recipient_receipts rr left join public.group_members gm on gm.id=rr.membership_id
 left join public.profiles p on p.id=gm.user_id where rr.message_id=target_message_id
 order by rr.is_read desc,rr.read_at nulls last,rr.delivered_at nulls last,rr.display_name;
end $$;
revoke all on function public.mark_visible_message_read(uuid,uuid),public.get_pending_message_deliveries(),public.can_view_own_message_receipts(uuid),public.acknowledge_message_delivery(uuid,uuid[]),public.get_message_receipt_summaries(uuid[]),public.get_message_receipt_details(uuid) from public,anon;
grant execute on function public.mark_visible_message_read(uuid,uuid),public.get_pending_message_deliveries(),public.can_view_own_message_receipts(uuid),public.acknowledge_message_delivery(uuid,uuid[]),public.get_message_receipt_summaries(uuid[]),public.get_message_receipt_details(uuid) to authenticated;
revoke all on function public.snapshot_message_recipients(),public.capture_message_read_receipt() from public,anon,authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='message_recipient_receipts') then
  alter publication supabase_realtime add table public.message_recipient_receipts;
 end if;
end $$;
commit;
