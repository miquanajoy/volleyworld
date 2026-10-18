create or replace function public.volleyworld_full_region_valid(g jsonb,expected jsonb,prefix text) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare n integer:=jsonb_array_length(expected); cnt integer:=case prefix when 'CEV' then 3 else 2 end;
 i integer; j integer; size integer; max_rounds integer:=case prefix when 'CEV' then 13 when 'AVC' then 11 when 'NORCECA' then 9 else 7 end;
 ids jsonb; all_ids jsonb:='[]'; rows jsonb; row_data jsonb; filtered jsonb; item jsonb; pot jsonb; expected_pot jsonb;
 m jsonb; group_g jsonb; direct integer:=case prefix when 'AVC' then 2 else 1 end; decider_ids jsonb:='[]'; done boolean;
begin
 if jsonb_typeof(g) is distinct from 'object' or jsonb_typeof(g->'groups') is distinct from 'array' or jsonb_array_length(g->'groups')<>cnt
 or jsonb_typeof(g->'teamIds') is distinct from 'array' or jsonb_array_length(g->'teamIds')<>n or not(g->'teamIds' @> expected and expected @> (g->'teamIds'))
 or jsonb_typeof(g->'tie') is distinct from 'array' or jsonb_array_length(g->'tie')<>n or not(g->'tie' @> expected and expected @> (g->'tie'))
 or jsonb_typeof(g->'rounds') is distinct from 'array' or jsonb_array_length(g->'rounds')<>max_rounds
 or jsonb_typeof(g->'pots') is distinct from 'array' or jsonb_array_length(g->'pots')<>(n+cnt-1)/cnt then return false;end if;
 for i in 0..cnt-1 loop
  ids:=g->'groups'->i;size:=(n-i+cnt-1)/cnt;
  if jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids)<>size or (select count(distinct value) from jsonb_array_elements_text(ids))<>size then return false;end if;
  all_ids:=all_ids||ids;rows:='[]';j:=0;
  for row_data in select value from jsonb_array_elements(g->'rounds') loop
   if jsonb_typeof(row_data) is distinct from 'array' then return false;end if;
   select coalesce(jsonb_agg(value),'[]'::jsonb) into filtered from jsonb_array_elements(row_data) where ids ? (value->>'a') and ids ? (value->>'b');
   if j<(case when size%2=1 then size else size-1 end) then rows:=rows||jsonb_build_array(filtered);
   elsif jsonb_array_length(filtered)<>0 then return false;end if;j:=j+1;
  end loop;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into filtered from jsonb_array_elements(g->'tie') where ids ? (value#>>'{}');
  group_g:=jsonb_build_object('teamIds',ids,'tie',filtered,'rounds',rows);
  if not public.volleyworld_full_league_valid(group_g,ids,prefix||'G'||i) then return false;end if;
  if prefix in ('AVC','CAVB') then decider_ids:=decider_ids||jsonb_build_array(public.volleyworld_full_group_table(group_g)->direct);end if;
 end loop;
 if jsonb_array_length(all_ids)<>n or (select count(distinct value) from jsonb_array_elements_text(all_ids))<>n or not(all_ids @> expected and expected @> all_ids) then return false;end if;
 for i in 0..jsonb_array_length(g->'pots')-1 loop
  pot:=g->'pots'->i;
  select jsonb_agg(value order by ord) into expected_pot from jsonb_array_elements(expected) with ordinality t(value,ord) where ord>i*cnt and ord<=(i+1)*cnt;
  if jsonb_typeof(pot) is distinct from 'array' or jsonb_array_length(pot)<>jsonb_array_length(expected_pot) or not(pot @> expected_pot and expected_pot @> pot) then return false;end if;
  for ids in select value from jsonb_array_elements(g->'groups') loop
   if (select count(*) from jsonb_array_elements_text(ids) t where pot ? t)>1 then return false;end if;
  end loop;
 end loop;
 -- Every stored match must belong to exactly one group, with no hidden extras.
 for m in select value from jsonb_path_query(g,'$.rounds[*][*]') as q(value) loop
  if (select count(*) from jsonb_array_elements(g->'groups') as grouped(value) where grouped.value ? (m->>'a') and grouped.value ? (m->>'b'))<>1 then return false;end if;
 end loop;
 if prefix in ('AVC','CAVB') then
  select not exists(select 1 from jsonb_path_query(g,'$.rounds[*][*]') as pending(value) where pending.value->'sets'='null'::jsonb) into done;
  if not done then return g->'decider' is not distinct from 'null'::jsonb;end if;
  m:=g->'decider';
  if jsonb_typeof(m) is distinct from 'object' or m->>'id' is distinct from prefix||'D0' or m->>'a' is distinct from decider_ids->>0 or m->>'b' is distinct from decider_ids->>1 or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
 elsif g ? 'decider' then return false;end if;
 return true;
exception when others then return false;
end $$;
