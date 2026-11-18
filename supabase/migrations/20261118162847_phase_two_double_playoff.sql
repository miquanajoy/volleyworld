-- Versioned Phase 2 format; old scored single brackets remain readable.
create or replace function public.volleyworld_circuit_state_valid(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare r text; z jsonb; p jsonb; m jsonb; ids text[]; allids text[]:='{}'; stages integer; n integer; promotion boolean; b jsonb; wc text[]; entrants text[]; flat text[]; i integer; j integer; expected integer;
begin
 if not coalesce(jsonb_typeof(s)='object' and s ?& array['version','mode','seasonId','seasonNumber','createdAt','chainId','previousSeasonId','stage','regions','firstStand','challenger','world'] and s->>'version'='2' and s->>'mode'='circuit' and jsonb_typeof(s->'regions')='object',false) then return false;end if;
 if s->>'version'<>'2' or s->>'mode'<>'circuit' or (s->>'seasonId') !~ '^[a-zA-Z0-9_-]{1,100}$' or (s->>'chainId') !~ '^[a-zA-Z0-9_-]{1,100}$' or (s->>'seasonNumber')::integer<1 or (s->>'stage')::integer not between 0 and (case when s->>'promotionEnabled'='true' then 8 else 7 end) then return false;end if;
 perform (s->>'createdAt')::timestamptz;
 if s ? 'promotionEnabled' and s->'promotionEnabled'<>'true'::jsonb then return false;end if;
 promotion:=coalesce(s->>'promotionEnabled'='true',false);
 if s ? 'phaseTwoDouble' and s->'phaseTwoDouble'<>'true'::jsonb then return false;end if;
 expected:=(case when promotion then 1151 else 1071 end)+(case when s->>'phaseTwoDouble'='true' then 24 else 0 end);
 stages:=(s->>'stage')::integer;
 foreach r in array array['CEV','AVC','NORCECA','CAVB'] loop
  z:=s->'regions'->r;
  if jsonb_array_length(z->'upper')<>16 or jsonb_array_length(z->'lower')<>8 or jsonb_array_length(z->'phases')<>(case when stages<2 then 1 when stages<4 then 2 else 3 end) then return false;end if;
  select array_agg(value) into ids from jsonb_array_elements_text((z->'upper')||(z->'lower'));
  if (select count(distinct v) from unnest(ids) v)<>24 then return false;end if;
  allids:=allids||ids;
  if (stages>=5)<>(z->'playin'<>'null'::jsonb) then return false;end if;
  b:=z->'phases'->1->'upper'->'bracket';
  if b is not null and b<>'null'::jsonb then
   if b->>'kind'<>(case when s->>'phaseTwoDouble'='true' then 'double' else 'single' end) or b->'bronzeRequired'<>to_jsonb(not coalesce(s->>'phaseTwoDouble'='true',false)) then return false;end if;
  end if;
  for p in select value from jsonb_array_elements(z->'phases') loop
   if jsonb_array_length(p->'upper'->'seeds')<>16 or jsonb_array_length(p->'lower'->'seeds')<>8 then return false;end if;
  end loop;
 end loop;
 if (select count(distinct v) from unnest(allids) v)<>96 then return false;end if;
 if (stages>=1)<>(s->'firstStand'<>'null'::jsonb) or (stages>=3)<>(s->'challenger'<>'null'::jsonb) or (stages>=6)<>(s->'world'<>'null'::jsonb) then return false;end if;
 select count(*) into n from public.volleyworld_circuit_matches(s);
 if n>expected or n<>(select count(distinct value->>'id') from public.volleyworld_circuit_matches(s) value) then return false;end if;
 for m in select * from public.volleyworld_circuit_matches(s) loop
  if not (m->>'a'=any(allids)) or not (m->>'b'=any(allids)) or m->>'a'=m->>'b' or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
 end loop;
 if stages=(case when promotion then 8 else 7 end) and (s->'world'->'bracket'->'final'->0->'sets'='null'::jsonb or s->'world'->'bracket'->'bronze'->0->'sets'='null'::jsonb or n<>expected or exists(select 1 from public.volleyworld_circuit_matches(s) q(item) where item->'sets'='null'::jsonb)) then return false;end if;

 if promotion and stages>=7 then
  if coalesce(s->'world'->'bracket'->'final'->0->'sets','null'::jsonb)='null'::jsonb or coalesce(s->'world'->'bracket'->'bronze'->0->'sets','null'::jsonb)='null'::jsonb then return false;end if;
 end if;
 foreach r in array array['CEV','AVC','NORCECA','CAVB'] loop
  z:=s->'regions'->r;
  if (promotion and stages>=7)<>(z ? 'promotion') then return false;end if;
  if promotion and stages>=7 then
   select array_agg(value) into ids from jsonb_array_elements_text((z->'upper')||(z->'lower'));
   select array_agg(value #>> '{}') into wc from jsonb_path_query(s->'world','$.groups[*].teamIds[*]') value where (value #>> '{}')=any(ids);
   if array_length(wc,1)<>8 then return false;end if;
   select array_agg(v) into entrants from unnest(ids) v where not v=any(wc);
   b:=z->'promotion';
   if jsonb_typeof(b)<>'object' or jsonb_array_length(b->'seeds')<>16 or jsonb_array_length(b->'tie')<>16 or jsonb_array_length(b->'pots')<>4 or jsonb_array_length(b->'groups')<>4 then return false;end if;
   select array_agg(value) into flat from jsonb_array_elements_text(b->'seeds');
   if not(flat @> entrants and flat <@ entrants) or (select count(distinct v) from unnest(flat) v)<>16 then return false;end if;
   select array_agg(value) into flat from jsonb_array_elements_text(b->'tie');
   if not(flat @> entrants and flat <@ entrants) or (select count(distinct v) from unnest(flat) v)<>16 then return false;end if;
   for i in 0..3 loop
    if jsonb_array_length(b->'pots'->i)<>4 then return false;end if;
    select array_agg(value) into flat from jsonb_array_elements_text(b->'pots'->i);
    select array_agg(value) into entrants from jsonb_array_elements_text(b->'seeds') with ordinality q(value,ord) where ord between i*4+1 and i*4+4;
    if not(flat @> entrants and flat <@ entrants) or (select count(distinct v) from unnest(flat) v)<>4 then return false;end if;
    if not public.volleyworld_circuit_gsl_valid(b->'groups'->i) or b->'groups'->i->>'prefix'<>r||'PRG'||i then return false;end if;
    for j in 0..3 loop
     if b->'groups'->i->'seeds'->j is distinct from b->'pots'->j->i then return false;end if;
    end loop;
   end loop;
  end if;
 end loop;
 return true;
exception when others then return false;
end $$;

alter table public.volleyworld_circuit_seasons drop constraint volleyworld_circuit_seasons_played_check;
alter table public.volleyworld_circuit_seasons add constraint volleyworld_circuit_seasons_played_check check(played between 0 and 1175);
