create or replace function public.volleyworld_circuit_state_valid(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare r text; z jsonb; p jsonb; m jsonb; ids text[]; allids text[]:='{}'; stages integer; n integer;
begin
 if not coalesce(jsonb_typeof(s)='object' and s ?& array['version','mode','seasonId','seasonNumber','createdAt','chainId','previousSeasonId','stage','regions','firstStand','challenger','world'] and s->>'version'='2' and s->>'mode'='circuit' and jsonb_typeof(s->'regions')='object',false) then return false;end if;
 if s->>'version'<>'2' or s->>'mode'<>'circuit' or (s->>'seasonId') !~ '^[a-zA-Z0-9_-]{1,100}$' or (s->>'chainId') !~ '^[a-zA-Z0-9_-]{1,100}$' or (s->>'seasonNumber')::integer<1 or (s->>'stage')::integer not between 0 and 7 then return false;end if;
 perform (s->>'createdAt')::timestamptz;
 stages:=(s->>'stage')::integer;
 foreach r in array array['CEV','AVC','NORCECA','CAVB'] loop
  z:=s->'regions'->r;
  if jsonb_array_length(z->'upper')<>16 or jsonb_array_length(z->'lower')<>8 or jsonb_array_length(z->'phases')<>(case when stages<2 then 1 when stages<4 then 2 else 3 end) then return false;end if;
  select array_agg(value) into ids from jsonb_array_elements_text((z->'upper')||(z->'lower'));
  if (select count(distinct v) from unnest(ids) v)<>24 then return false;end if;
  allids:=allids||ids;
  if (stages>=5)<>(z->'playin'<>'null'::jsonb) then return false;end if;
  for p in select value from jsonb_array_elements(z->'phases') loop
   if jsonb_array_length(p->'upper'->'seeds')<>16 or jsonb_array_length(p->'lower'->'seeds')<>8 then return false;end if;
  end loop;
 end loop;
 if (select count(distinct v) from unnest(allids) v)<>96 then return false;end if;
 if (stages>=1)<>(s->'firstStand'<>'null'::jsonb) or (stages>=3)<>(s->'challenger'<>'null'::jsonb) or (stages>=6)<>(s->'world'<>'null'::jsonb) then return false;end if;
 select count(*) into n from public.volleyworld_circuit_matches(s);
 if n>1071 or n<>(select count(distinct value->>'id') from public.volleyworld_circuit_matches(s) value) then return false;end if;
 for m in select * from public.volleyworld_circuit_matches(s) loop
  if not (m->>'a'=any(allids)) or not (m->>'b'=any(allids)) or m->>'a'=m->>'b' or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
 end loop;
 if stages=7 and (s->'world'->'bracket'->'final'->0->'sets'='null'::jsonb or s->'world'->'bracket'->'bronze'->0->'sets'='null'::jsonb or n<>1071) then return false;end if;
 return true;
exception when others then return false;
end $$;
