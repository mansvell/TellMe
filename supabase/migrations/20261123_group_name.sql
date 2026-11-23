-- Renommage réservé au créateur du groupe. À appliquer dans Supabase SQL Editor.
begin;
create or replace function public.rename_group(target_group_id uuid,new_name text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare clean_name text:=btrim(new_name);
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then
  raise exception 'ACCOUNT_NOT_FOUND';
 end if;
 if clean_name is null or char_length(clean_name) not between 2 and 40 then
  raise exception 'INVALID_GROUP_NAME';
 end if;
 update public.groups set name=clean_name
 where id=target_group_id and dominus_id=auth.uid() and (expires_at is null or expires_at>now());
 if not found then raise exception 'GROUP_ACCESS_DENIED'; end if;
 return clean_name;
end $$;
revoke all on function public.rename_group(uuid,text) from public,anon,authenticated;
grant execute on function public.rename_group(uuid,text) to authenticated;
commit;
