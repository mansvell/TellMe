-- Transfert de session anonyme sans e-mail. Exécuter après la création de profiles.
-- Ne pas purger les reçus de transfert : ils empêchent le navigateur source de
-- réutiliser une session déplacée après une longue période d'inactivité.
begin;
create schema if not exists tellme_private;
revoke all on schema tellme_private from public,anon,authenticated;
create table if not exists tellme_private.account_transfers (
 lookup text primary key check(lookup ~ '^[a-f0-9]{64}$'),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 payload jsonb,
 state text not null default 'pending' check(state in ('pending','claimed','cancelled')),
 recipient_hash text check(recipient_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '5 minutes'),
 retry_until timestamptz
);
create index if not exists account_transfers_owner on tellme_private.account_transfers(owner_id);
revoke all on tellme_private.account_transfers from public,anon,authenticated;

create or replace function public.create_account_transfer(p_lookup text,p_payload jsonb)
returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); deadline timestamptz;
begin
 if owner is null or not exists(select 1 from profiles where id=owner) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 if p_lookup is null or p_lookup !~ '^[a-f0-9]{64}$' or p_payload is null or jsonb_typeof(p_payload)<>'object'
  or not (p_payload ?& array['v','iv','salt','ciphertext']) or p_payload-array['v','iv','salt','ciphertext']<>'{}'::jsonb
  or p_payload->'v' is distinct from '1'::jsonb or coalesce(p_payload->>'iv','') !~ '^[A-Za-z0-9_-]{16}$'
  or coalesce(p_payload->>'salt','') !~ '^[A-Za-z0-9_-]{43}$'
  or coalesce(p_payload->>'ciphertext','') !~ '^[A-Za-z0-9_-]+$' or char_length(coalesce(p_payload->>'ciphertext','')) not between 32 and 12000 then raise exception 'INVALID_TRANSFER'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,106));
 if (select count(*) from tellme_private.account_transfers where owner_id=owner and created_at>now()-interval '10 minutes')>=5 then raise exception 'TRANSFER_RATE_LIMIT'; end if;
 -- Nettoie uniquement les enveloppes chiffrées, jamais les reçus.
 update tellme_private.account_transfers set payload=null
  where payload is not null and ((state='pending' and expires_at<=now()) or (state='claimed' and retry_until<=now()));
 update tellme_private.account_transfers set state='cancelled',payload=null where owner_id=owner and state='pending';
 insert into tellme_private.account_transfers(lookup,owner_id,payload) values(p_lookup,owner,p_payload) returning expires_at into deadline;
 return deadline;
end $$;

create or replace function public.account_transfer_state(p_lookup text)
returns text language sql security definer set search_path=public,pg_temp as $$
 select coalesce((select case when state='pending' and expires_at<=now() then 'expired' else state end
  from tellme_private.account_transfers where lookup=p_lookup),'unavailable');
$$;

create or replace function public.claim_account_transfer(p_lookup text,p_recipient_hash text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item tellme_private.account_transfers;
begin
 if p_recipient_hash is null or p_recipient_hash !~ '^[a-f0-9]{64}$' then raise exception 'TRANSFER_INVALID_OR_USED'; end if;
 select * into item from tellme_private.account_transfers where lookup=p_lookup for update;
 if not found then raise exception 'TRANSFER_INVALID_OR_USED'; end if;
 if item.state='pending' and item.expires_at>now() then
  update tellme_private.account_transfers set state='claimed',recipient_hash=p_recipient_hash,retry_until=now()+interval '10 minutes'
   where lookup=p_lookup returning * into item;
 elsif item.state='claimed' and item.recipient_hash=p_recipient_hash and item.retry_until>now() and item.payload is not null then
  null;
 else
  raise exception 'TRANSFER_INVALID_OR_USED';
 end if;
 return jsonb_build_object('owner_id',item.owner_id,'payload',item.payload);
end $$;

create or replace function public.finish_account_transfer(p_lookup text,p_recipient_hash text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update tellme_private.account_transfers set payload=null,retry_until=null
 where lookup=p_lookup and state='claimed' and recipient_hash=p_recipient_hash;
 return found;
end $$;

create or replace function public.cancel_account_transfer(p_lookup text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update tellme_private.account_transfers set state='cancelled',payload=null
 where lookup=p_lookup and owner_id=auth.uid() and state='pending';
 return found;
end $$;

revoke all on function public.create_account_transfer(text,jsonb),public.cancel_account_transfer(text),public.account_transfer_state(text),public.claim_account_transfer(text,text),public.finish_account_transfer(text,text) from public,anon,authenticated;
grant execute on function public.create_account_transfer(text,jsonb),public.cancel_account_transfer(text) to authenticated;
grant execute on function public.account_transfer_state(text),public.claim_account_transfer(text,text),public.finish_account_transfer(text,text) to anon,authenticated;
commit;
