-- Vérifie un lien public sans exposer le pseudo de son destinataire.
-- La signature existante est conservée pour les clients déjà ouverts.
begin;
create or replace function public.get_secret_recipient(target_token uuid)
returns table(display_name text) language sql stable security definer set search_path=public,pg_temp as $$
 select 'TellMe'::text from public.secret_boxes b join public.profiles p on p.id=b.owner_id
 where b.public_token=target_token;
$$;
revoke all on function public.get_secret_recipient(uuid) from public,anon,authenticated;
grant execute on function public.get_secret_recipient(uuid) to anon,authenticated;
commit;
