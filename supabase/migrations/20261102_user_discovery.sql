-- À exécuter une fois dans le SQL Editor Supabase avant d'utiliser la découverte.
-- Les utilisateurs ne voient que les pseudonymes et couleurs, jamais les e-mails.
begin;
create table if not exists public.directory_invitations (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id) on delete cascade,
 conversation_name text not null check (char_length(conversation_name) between 2 and 80),
 status text not null default 'pending' check (status in ('pending','accepted','rejected')),
 created_group_id uuid references public.groups(id) on delete set null,
 created_at timestamptz not null default now(), responded_at timestamptz,
 check (sender_id <> receiver_id)
);
-- Un seul échange en attente par paire, même si les deux personnes cliquent.
create unique index if not exists directory_invitation_pending_pair
 on public.directory_invitations (least(sender_id,receiver_id),greatest(sender_id,receiver_id)) where status='pending';
alter table public.directory_invitations enable row level security;
drop policy if exists directory_invitation_participants on public.directory_invitations;
create policy directory_invitation_participants on public.directory_invitations for select to authenticated
 using (auth.uid() in (sender_id,receiver_id));
revoke all on public.directory_invitations from anon, authenticated;
grant select on public.directory_invitations to authenticated;

create or replace function public.find_tellme_users(search_text text default '', page_offset integer default 0)
returns table(id uuid,display_name text,color text,invitation_status text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid()) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 return query select p.id,p.display_name::text,coalesce(p.default_color,'#0EA5E9')::text,
  (select case when d.sender_id=auth.uid() then 'sent' else 'received' end from public.directory_invitations d
   where d.status='pending' and ((d.sender_id=auth.uid() and d.receiver_id=p.id) or (d.receiver_id=auth.uid() and d.sender_id=p.id)) limit 1)
 from public.profiles p
 where p.id<>auth.uid() and coalesce(p.invitations_enabled,true)
 and (coalesce(search_text,'')='' or position(lower(left(search_text,80)) in lower(p.display_name::text))>0)
 order by lower(p.display_name::text),p.id limit 24 offset greatest(coalesce(page_offset,0),0);
end $$;

create or replace function public.send_directory_invitation(target_user_id uuid,target_conversation_name text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare invitation_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid()) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 if auth.uid()=target_user_id then raise exception 'SELF_INVITATION'; end if;
 if char_length(trim(target_conversation_name)) not between 2 and 80 then raise exception 'INVALID_CONVERSATION_NAME'; end if;
 if not exists(select 1 from public.profiles p where p.id=target_user_id and coalesce(p.invitations_enabled,true)) then raise exception 'USER_UNAVAILABLE'; end if;
 -- Évite les rafales d'invitations depuis le répertoire.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.directory_invitations where sender_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'INVITATION_LIMIT'; end if;
 insert into public.directory_invitations(sender_id,receiver_id,conversation_name)
 values(auth.uid(),target_user_id,trim(target_conversation_name)) returning id into invitation_id;
 return invitation_id;
exception when unique_violation then raise exception 'INVITATION_PENDING';
end $$;

create or replace function public.get_my_directory_invitations()
returns table(id uuid,direction text,conversation_name text,counterpart_name text,status text,status_reason text,created_group_id uuid,created_at timestamptz,responded_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid()) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 return query select d.id,case when d.sender_id=auth.uid() then 'sent' else 'received' end,
 d.conversation_name,p.display_name::text,d.status,null::text,d.created_group_id,d.created_at,d.responded_at
 from public.directory_invitations d join public.profiles p on p.id=case when d.sender_id=auth.uid() then d.receiver_id else d.sender_id end
 where auth.uid() in (d.sender_id,d.receiver_id) order by d.created_at desc;
end $$;

create or replace function public.accept_directory_invitation(target_invitation_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare invitation public.directory_invitations; new_group_id uuid; sender_color text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid()) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 select * into invitation from public.directory_invitations where id=target_invitation_id and receiver_id=auth.uid() for update;
 if not found then raise exception 'INVITATION_UNAVAILABLE'; end if;
 if invitation.status='accepted' and invitation.created_group_id is not null then return invitation.created_group_id; end if;
 if invitation.status<>'pending' then raise exception 'INVITATION_UNAVAILABLE'; end if;
 select coalesce(default_color,'#0EA5E9') into sender_color from public.profiles where id=invitation.sender_id;
 if not found then raise exception 'USER_UNAVAILABLE'; end if;
 -- Réutilise la création existante : le destinataire devient membre/créateur.
 new_group_id := public.create_group(group_name => invitation.conversation_name,group_color => '#0EA5E9',group_lifetime_minutes => null);
 insert into public.group_members(group_id,user_id,local_color,status)
 values(new_group_id,invitation.sender_id,sender_color,'active');
 update public.directory_invitations set status='accepted',created_group_id=new_group_id,responded_at=now() where id=invitation.id;
 return new_group_id;
end $$;

create or replace function public.reject_directory_invitation(target_invitation_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid()) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 update public.directory_invitations set status='rejected',responded_at=now()
 where id=target_invitation_id and receiver_id=auth.uid() and status='pending';
 if not found then raise exception 'INVITATION_UNAVAILABLE'; end if;
end $$;

revoke all on function public.find_tellme_users(text,integer),public.send_directory_invitation(uuid,text),public.get_my_directory_invitations(),public.accept_directory_invitation(uuid),public.reject_directory_invitation(uuid) from public,anon;
grant execute on function public.find_tellme_users(text,integer),public.send_directory_invitation(uuid,text),public.get_my_directory_invitations(),public.accept_directory_invitation(uuid),public.reject_directory_invitation(uuid) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='directory_invitations') then
 alter publication supabase_realtime add table public.directory_invitations;
 end if;
end $$;
commit;
