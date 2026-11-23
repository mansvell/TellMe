-- Vues uniques : visibles uniquement par l'auteur de la Storytime.
begin;
create or replace function public.get_my_storytime_view_counts()
returns table(story_id uuid,view_count bigint)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 return query select s.id,count(v.user_id)
 from public.storytimes s
 left join tellme_private.storytime_views v on v.story_id=s.id and v.user_id<>s.author_id
 where s.author_id=current_user_id and s.expires_at>now()
 group by s.id;
end $$;

create or replace function public.get_storytime_viewers(target_id uuid,page_offset integer default 0)
returns table(display_name text,color text,viewed_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare current_user_id uuid:=tellme_private.fun_user();
begin
 if page_offset is null or page_offset<0 then raise exception 'INVALID_OFFSET'; end if;
 if not exists(select 1 from public.storytimes s where s.id=target_id and s.author_id=current_user_id) then
  raise exception 'STORY_ACCESS_DENIED';
 end if;
 return query select coalesce(p.display_name::text,'Utilisateur'),coalesce(p.default_color::text,'#0EA5E9'),v.created_at
 from tellme_private.storytime_views v join public.profiles p on p.id=v.user_id
 where v.story_id=target_id and v.user_id<>current_user_id
 order by v.created_at desc,v.user_id
 limit 51 offset page_offset;
end $$;
revoke all on function public.get_my_storytime_view_counts(),public.get_storytime_viewers(uuid,integer) from public,anon,authenticated;
grant execute on function public.get_my_storytime_view_counts(),public.get_storytime_viewers(uuid,integer) to authenticated;
commit;
