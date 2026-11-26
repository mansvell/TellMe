-- Après 20261125_story_top_five.sql. Ne réécrit aucun résultat déjà clôturé.
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
  select target,r.position,r.user_id,r.points,case when r.points>=500 then case r.position when 1 then 30 when 2 then 20 when 3 then 15 else 0 end else 0 end,
   case when r.position<=3 and r.points>=500 then 'pending' else 'not_applicable' end
  from (select p.user_id,count(*) as points,row_number() over(order by count(*) desc,max(p.awarded_at),p.user_id) as position
   from tellme_private.activity_points p where p.month=target and p.active group by p.user_id) r where r.position<=5;
 end loop;
end $$;
commit;
