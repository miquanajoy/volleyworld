-- Additive compatibility: completed legacy seasons remain immutable at stage 7.
create or replace function public.volleyworld_circuit_gsl_valid(b jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare r integer; j integer; row jsonb; m jsonb; a text; c text; prefix text; n integer;
begin
 if b->>'kind'<>'gsl' or b->'bronzeRequired'<>'false'::jsonb or b->'bronze'<>'null'::jsonb or b ? 'opening' or jsonb_array_length(b->'seeds')<>4 then return false;end if;
 n:=jsonb_array_length(b->'rounds'); prefix:=b->>'prefix';
 if n not between 1 and 4 then return false;end if;
 for r in 0..n-1 loop
  row:=b->'rounds'->r;
  if jsonb_array_length(row)<>(case when r=0 then 2 else 1 end) then return false;end if;
  if r>0 and exists(select 1 from jsonb_array_elements(b->'rounds'->(r-1)) q(item) where item->'sets'='null'::jsonb) then return false;end if;
  for j in 0..jsonb_array_length(row)-1 loop
   m:=row->j;
   if r=0 then a:=b->'seeds'->>j;c:=b->'seeds'->>(3-j);
   elsif r=1 then a:=public.volleyworld_full_winner(b->'rounds'->0->0);c:=public.volleyworld_full_winner(b->'rounds'->0->1);
   elsif r=2 then a:=public.volleyworld_full_winner(b->'rounds'->0->0,false);c:=public.volleyworld_full_winner(b->'rounds'->0->1,false);
   else a:=public.volleyworld_full_winner(b->'rounds'->1->0,false);c:=public.volleyworld_full_winner(b->'rounds'->2->0);end if;
   if m->>'a' is distinct from a or m->>'b' is distinct from c or m->>'id' is distinct from prefix||(array['O','W','L','Q'])[r+1]||'-'||j then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function public.volleyworld_circuit_gsl_valid(jsonb) from public,anon;
grant execute on function public.volleyworld_circuit_gsl_valid(jsonb) to authenticated;
create or replace function public.volleyworld_circuit_state_valid(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare r text; z jsonb; p jsonb; m jsonb; ids text[]; allids text[]:='{}'; stages integer; n integer; promotion boolean; b jsonb; wc text[]; entrants text[]; flat text[]; i integer; j integer;
begin
 if not coalesce(jsonb_typeof(s)='object' and s ?& array['version','mode','seasonId','seasonNumber','createdAt','chainId','previousSeasonId','stage','regions','firstStand','challenger','world'] and s->>'version'='2' and s->>'mode'='circuit' and jsonb_typeof(s->'regions')='object',false) then return false;end if;
 if s->>'version'<>'2' or s->>'mode'<>'circuit' or (s->>'seasonId') !~ '^[a-zA-Z0-9_-]{1,100}$' or (s->>'chainId') !~ '^[a-zA-Z0-9_-]{1,100}$' or (s->>'seasonNumber')::integer<1 or (s->>'stage')::integer not between 0 and (case when s->>'promotionEnabled'='true' then 8 else 7 end) then return false;end if;
 perform (s->>'createdAt')::timestamptz;
 if s ? 'promotionEnabled' and s->'promotionEnabled'<>'true'::jsonb then return false;end if;
 promotion:=coalesce(s->>'promotionEnabled'='true',false);
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
 if n>(case when promotion then 1151 else 1071 end) or n<>(select count(distinct value->>'id') from public.volleyworld_circuit_matches(s) value) then return false;end if;
 for m in select * from public.volleyworld_circuit_matches(s) loop
  if not (m->>'a'=any(allids)) or not (m->>'b'=any(allids)) or m->>'a'=m->>'b' or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
 end loop;
 if stages=(case when promotion then 8 else 7 end) and (s->'world'->'bracket'->'final'->0->'sets'='null'::jsonb or s->'world'->'bracket'->'bronze'->0->'sets'='null'::jsonb or n<>(case when promotion then 1151 else 1071 end) or exists(select 1 from public.volleyworld_circuit_matches(s) q(item) where item->'sets'='null'::jsonb)) then return false;end if;

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

