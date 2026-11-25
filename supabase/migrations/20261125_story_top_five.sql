-- Après 20261125_story_threads_ui.sql : classement nominatif et seuil de 800 points.
-- Les résultats des mois déjà clôturés restent inchangés.
begin;
create or replace function tellme_private.finalize_activity_months()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare target date;
begin
 for target in select distinct month from tellme_private.activity_points
  where month<date_trunc('month',now() at time zone 'UTC')::date order by month loop
  perform pg_advisory_xact_lock(hashtextextended(target::text,105));
  if exists(select 1 from tellme_private.monthly_results where month=target) then continue; end if;
  insert into tellme_private.monthly_results(month,position,user_id,points,reward_eur,payment_status)
  select target,r.position,r.user_id,r.points,case when r.points>=800 then case r.position when 1 then 30 when 2 then 20 when 3 then 15 else 0 end else 0 end,
   case when r.position<=3 and r.points>=800 then 'pending' else 'not_applicable' end
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
  select p.user_id,max(profile.display_name::text) as display_name,count(*) as points,row_number() over(order by count(*) desc,max(p.awarded_at),p.user_id) as position
  from tellme_private.activity_points p join public.profiles profile on profile.id=p.user_id where p.month=current_month and p.active group by p.user_id
 ) select jsonb_build_object('month',current_month,'ends_at',((current_month+interval '1 month') at time zone 'UTC'),
 'leaders',coalesce((select jsonb_agg(jsonb_build_object('position',r.position,'points',r.points,'display_name',r.display_name,'is_me',r.user_id=viewer) order by r.position) from ranked r where r.position<=5),'[]'::jsonb),
 'mine',coalesce((select jsonb_build_object('position',r.position,'points',r.points) from ranked r where r.user_id=viewer),jsonb_build_object('position',null,'points',0)),
 'previous_reward',(select jsonb_build_object('month',m.month,'position',m.position,'points',m.points,'reward_eur',m.reward_eur,'payment_status',m.payment_status)
 from tellme_private.monthly_results m where m.user_id=viewer order by m.month desc limit 1)) into result;
 return result;
end $$;

revoke all on function public.get_monthly_standings() from public,anon,authenticated;
grant execute on function public.get_monthly_standings() to authenticated;
commit;
