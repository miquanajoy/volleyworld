-- Additive merit-v1 format. Existing Tour and World Cup snapshots retain exact legacy validation.
-- This migration is intentionally prepared on a feature branch; it has not been applied remotely.
create function public.volleyworld_tour_state_valid_pre_merit(s jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare catalog jsonb:='{"CEV":["POL","ITA","RUS","SLO","FRA","BUL","FIN","GER","UKR","BEL","TUR","SRB","CZE","GRE","ROU","NED","DEN","EST","POR","SUI","ISR","ESP","SWE","BLR","CRO","LAT","HUN","SVK","MKD","AUT","SMR","SCO","MNE","CYP","ALB","NOR","BIH","NIR","FRO"],"AVC":["JPN","IRI","KOR","CHN","PAK","AUS","QAT","BRN","INA","IND","THA","TPE","VIE","OMA","TKM","KGZ","KAZ","UAE","BAN","KSA","SRI","PHI","IRQ","KUW"],"NORCECA":["USA","CUB","CAN","MEX","PUR","DOM","DMA","LCA","BIZ","BAR","JAM","NCA","ANT","GUA","CUW","GRN","ESA","BAH"],"CAVB":["EGY","TUN","CMR","KEN","NGR","ALG","GHA","RWA","LBA","NIG","UGA","SEN","MAR"],"CSV":["BRA","ARG","CHI","COL","VEN","BOL"]}'::jsonb;q jsonb:='{"CEV":7,"AVC":7,"CSV":6,"NORCECA":7,"CAVB":5}';l jsonb:=s->'league';c jsonb:=s->'challenger';f jsonb:=s->'worldcup';r text;st integer;last_round integer;i integer;
begin
 if jsonb_typeof(s)<>'object' or octet_length(s::text)>2000000 or s->>'mode' is distinct from 'tour' or s->'version' is distinct from '1'::jsonb or coalesce(s->>'seasonId','') !~ '^[a-zA-Z0-9-]{1,100}$' or jsonb_typeof(s->'seasonNumber') is distinct from 'number' or (s->>'seasonNumber')::numeric<>trunc((s->>'seasonNumber')::numeric) or (s->>'seasonNumber')::numeric not between 1 and 2147483647 or coalesce(s->>'createdAt','')='' then return false;end if;
 perform (s->>'createdAt')::timestamptz;
 if jsonb_typeof(s->'stage') is distinct from 'number' or (s->>'stage')::numeric<>trunc((s->>'stage')::numeric) or (s->>'stage')::int not between 0 and 8 or jsonb_typeof(s->'roster') is distinct from 'array' or jsonb_array_length(s->'roster')<>32 or (select count(distinct value) from jsonb_array_elements_text(s->'roster'))<>32 then return false;end if;
 st:=(s->>'stage')::int;
 for r in select jsonb_object_keys(q) loop
  if (select count(*) from jsonb_array_elements_text(s->'roster') t(id) where catalog->r ? id)<>(q->>r)::int then return false;end if;
 end loop;
 if not public.volleyworld_tour_league_valid(l,s->'roster') or not public.volleyworld_full_state_valid(f) or f->>'regionalFormat' is distinct from 'qualification-v2' then return false;end if;
 if (st>=3) is distinct from (c is not null and c<>'null'::jsonb) then return false;end if;
 if st>=3 and (not public.volleyworld_challenger_state_valid(c) or not(c->'roster' @> (s->'roster') and s->'roster' @> (c->'roster'))) then return false;end if;
 last_round:=case when st<2 then 10 when st<4 then 20 else 31 end;
 for i in 0..30 loop
  if i>=last_round and exists(select 1 from jsonb_array_elements(l->'rounds'->i) x(m) where m->'sets'<>'null'::jsonb) then return false;end if;
  if (st>0 and i<10 or st>2 and i<20 or st>4) and exists(select 1 from jsonb_array_elements(l->'rounds'->i) x(m) where m->'sets'='null'::jsonb) then return false;end if;
 end loop;
 if st=0 and exists(select 1 from jsonb_path_query(f,'$.regions.*.rounds[*][*]') x(m) where m->'sets'<>'null'::jsonb) then return false;end if;
 if st>1 then
  if exists(select 1 from jsonb_path_query(f,'$.regions.*.rounds[*][*]') x(m) where m->'sets'='null'::jsonb) then return false;end if;
  foreach r in array array['CEV','AVC','NORCECA','CAVB'] loop if public.volleyworld_qual_champion(f->'regions'->r->'playoff') is null then return false;end if;end loop;
 end if;
 if st>3 and public.volleyworld_full_winner(c->'bracket'->'final'->0) is null then return false;end if;
 if (st>=5) is distinct from (f->'intercontinental' is not null and f->'intercontinental'<>'null'::jsonb) then return false;end if;
 if st>5 and exists(select 1 from jsonb_array_elements(f->'intercontinental'->'branches') b where public.volleyworld_qual_champion(b) is null) then return false;end if;
 if (st>=6) is distinct from (l->'playin' is not null and l->'playin'<>'null'::jsonb) then return false;end if;
 if st>6 and public.volleyworld_full_winner(l->'bracket'->'final'->0) is null then return false;end if;
 if (st>=7) is distinct from (f->'world' is not null and f->'world'<>'null'::jsonb) then return false;end if;
 if st=8 and public.volleyworld_full_winner(f->'world'->'bracket'->'final'->0) is null then return false;end if;
 return true;
exception when others then return false;
end $$;

create function public.volleyworld_merit_table(s jsonb,r text) returns table(id text,group_index integer,group_position integer,eligible_position integer,w integer,played integer,sd integer,pd integer,world_rank integer)
language sql immutable security invoker set search_path='' as $$
 with groups as (
  select public.volleyworld_region_group(s->'regions'->r,ord::integer-1) g,ord::integer-1 gi from jsonb_array_elements(s->'regions'->r->'groups') with ordinality q(ids,ord)
  union all select s->'regions'->r,0 where not(s->'regions'->r ? 'groups')
 ), eligible as (
  select t.*,gi,row_number() over(partition by gi order by t.group_position)::integer ep from groups cross join lateral public.volleyworld_qual_table(g) t where not(coalesce(s->'automatic','[]'::jsonb) ? t.id)
 ) select id,gi,group_position,ep,w,played,sd,pd,world_rank from eligible
$$;
create function public.volleyworld_merit_seeds(s jsonb,r text) returns jsonb language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(id order by eligible_position,w::numeric/nullif(played,0) desc,sd::numeric/nullif(played,0) desc,pd::numeric/nullif(played,0) desc,world_rank),'[]'::jsonb) from public.volleyworld_merit_table(s,r) where eligible_position in (2,3)
$$;
create function public.volleyworld_merit_advancers(b jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select case when b is null or b='null'::jsonb or jsonb_array_length(b->'rounds'->-1)<>coalesce((b->>'advanceSlots')::int,1) or exists(select 1 from jsonb_array_elements(b->'rounds'->-1) q(m) where m->'sets'='null'::jsonb) then '[]'::jsonb else (select coalesce(jsonb_agg(public.volleyworld_full_winner(m) order by ord),'[]'::jsonb) from jsonb_array_elements(b->'rounds'->-1) with ordinality q(m,ord)) end
$$;
create function public.volleyworld_merit_bracket_valid(b jsonb,expected jsonb,prefix text,advance_slots integer default 1) returns boolean language plpgsql immutable security invoker set search_path='' as $$
#variable_conflict use_column
declare slots integer[]:=array[1,2];next_slots integer[];players text[]:='{}';next_players text[];size integer;depth integer;v integer;r integer;i integer;j integer;ms jsonb;m jsonb;a text;c text;ready boolean:=true;next_ready boolean;
begin
 if jsonb_typeof(b) is distinct from 'object' or (select count(*) from jsonb_object_keys(b))<>(case when advance_slots=4 then 3 else 2 end) or b->'seeds' is distinct from expected or jsonb_typeof(b->'rounds') is distinct from 'array' then return false;end if;
 if advance_slots not in (1,4) or advance_slots=4 and b->'advanceSlots' is distinct from '4'::jsonb or advance_slots=1 and b ? 'advanceSlots' then return false;end if;
 size:=jsonb_array_length(expected);if size not in (4,5,6,8,12) or size<=advance_slots then return false;end if;
 while array_length(slots,1)<size loop
  next_slots:='{}';foreach v in array slots loop next_slots:=next_slots||array[v,array_length(slots,1)*2+1-v];end loop;slots:=next_slots;
 end loop;
 depth:=ceil(log(2,array_length(slots,1)::numeric))-case when advance_slots=4 then 2 else 0 end;
 if jsonb_array_length(b->'rounds')<>depth then return false;end if;
 foreach v in array slots loop players:=array_append(players,expected->>(v-1));end loop;
 for r in 0..depth-1 loop
  ms:=b->'rounds'->r;if jsonb_typeof(ms) is distinct from 'array' then return false;end if;
  if not ready then if ms<>'[]'::jsonb then return false;end if;continue;end if;
  j:=0;next_players:='{}';next_ready:=true;
  for i in 0..array_length(players,1)/2-1 loop
   a:=players[i*2+1];c:=players[i*2+2];
   if a is not null and c is not null then
    m:=ms->j;
    if jsonb_typeof(m) is distinct from 'object' or m->>'id' is distinct from prefix||'K'||r||'-'||i or m->>'a' is distinct from a or m->>'b' is distinct from c or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
    next_players:=array_append(next_players,public.volleyworld_full_winner(m));if public.volleyworld_full_winner(m) is null then next_ready:=false;end if;j:=j+1;
   else next_players:=array_append(next_players,coalesce(a,c));end if;
  end loop;
  if jsonb_array_length(ms)<>j then return false;end if;players:=next_players;ready:=next_ready;
 end loop;
 return true;
exception when others then return false;
end $$;
create function public.volleyworld_merit_direct(s jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(t.id order by ord,group_index,eligible_position),'[]'::jsonb) from unnest(array['CEV','AVC','NORCECA','CAVB','CSV']) with ordinality q(r,ord) cross join lateral public.volleyworld_merit_table(s,r) t where eligible_position<=case when r='CSV' then 2 else 1 end
$$;
create function public.volleyworld_merit_pool(s jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 with candidate_ids as (
  select value id from jsonb_array_elements_text(public.volleyworld_merit_advancers(s->'regions'->'CEV'->'playoff'))
  union all select value from jsonb_array_elements_text(public.volleyworld_merit_advancers(s->'regions'->'AVC'->'playoff'))
  union all select value from jsonb_array_elements_text(s->'regions'->'NORCECA'->'playoff'->'seeds') where value is distinct from public.volleyworld_qual_champion(s->'regions'->'NORCECA'->'playoff')
  union all select value from jsonb_array_elements_text(s->'regions'->'CAVB'->'playoff'->'seeds') where value is distinct from public.volleyworld_qual_champion(s->'regions'->'CAVB'->'playoff')
  union all select id from public.volleyworld_merit_table(s,'CSV') where eligible_position=3
 ), ranked as (
  select t.* from unnest(array['CEV','AVC','NORCECA','CAVB','CSV']) q(r) cross join lateral public.volleyworld_merit_table(s,r) t where id in (select id from candidate_ids)
 ) select coalesce(jsonb_agg(id order by group_position,w::numeric/nullif(played,0) desc,sd::numeric/nullif(played,0) desc,pd::numeric/nullif(played,0) desc,world_rank),'[]'::jsonb) from ranked
$$;
create function public.volleyworld_merit_entrants(s jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select coalesce(s->'automatic','[]'::jsonb)||public.volleyworld_merit_direct(s)||jsonb_build_array(public.volleyworld_qual_champion(s->'regions'->'NORCECA'->'playoff'),public.volleyworld_qual_champion(s->'regions'->'CAVB'->'playoff'))||(select coalesce(jsonb_agg(public.volleyworld_qual_champion(b) order by ord),'[]'::jsonb) from jsonb_array_elements(s->'intercontinental'->'branches') with ordinality q(b,ord))
$$;
create function public.volleyworld_merit_region_groups_valid(g jsonb,expected jsonb,prefix text) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare n integer:=jsonb_array_length(expected); cnt integer:=case prefix when 'CEV' then 6 when 'AVC' then 4 when 'NORCECA' then 3 else 2 end;
 i integer; j integer; size integer; max_rounds integer:=case prefix when 'CEV' then 7 when 'AVC' then 5 when 'NORCECA' then 5 else 7 end;
 ids jsonb; all_ids jsonb:='[]'; rows jsonb; row_data jsonb; filtered jsonb; item jsonb; pot jsonb; expected_pot jsonb;
 m jsonb; group_g jsonb; direct integer:=case prefix when 'AVC' then 2 else 1 end; decider_ids jsonb:='[]'; done boolean;
begin
 if g->'directSlots' is distinct from '1'::jsonb or g ? 'decider' then return false;end if;
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
 return true;
exception when others then return false;
end $$;

create function public.volleyworld_merit_world_valid(s jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare catalog jsonb := '{"CEV":["POL","ITA","RUS","SLO","FRA","BUL","FIN","GER","UKR","BEL","TUR","SRB","CZE","GRE","ROU","NED","DEN","EST","POR","SUI","ISR","ESP","SWE","BLR","CRO","LAT","HUN","SVK","MKD","AUT","SMR","SCO","MNE","CYP","ALB","NOR","BIH","NIR","FRO"],"AVC":["JPN","IRI","KOR","CHN","PAK","AUS","QAT","BRN","INA","IND","THA","TPE","VIE","OMA","TKM","KGZ","KAZ","UAE","BAN","KSA","SRI","PHI","IRQ","KUW"],"NORCECA":["USA","CUB","CAN","MEX","PUR","DOM","DMA","LCA","BIZ","BAR","JAM","NCA","ANT","GUA","CUW","GRN","ESA","BAH"],"CAVB":["EGY","TUN","CMR","KEN","NGR","ALG","GHA","RWA","LBA","NIG","UGA","SEN","MAR"],"CSV":["BRA","ARG","CHI","COL","VEN","BOL"]}'::jsonb; quotas jsonb:='{"CEV":9,"AVC":5,"NORCECA":4,"CAVB":3,"CSV":3}';
 r text; g jsonb; world_state jsonb; m jsonb; item jsonb; k text; n integer; i integer:=0; regional_done integer:=0; world_done integer:=0; all_ids jsonb:='[]'; pot_ids jsonb:='[]'; match_keys text[]:='{}'; participants text[]; orders bigint[]:='{}'; stage_count integer; prior text; expected_count integer; pool jsonb; ic jsonb; seed_ids jsonb; eligible jsonb; leaders jsonb; thirds jsonb; expected_pot jsonb; gi integer; ga integer; gb integer; prior_ms jsonb; prefix text; seeds_sorted jsonb;
begin
 select count(*) into regional_done from (select value from jsonb_path_query(s,'$.regions.*.rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.regions.*.playoff.rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.intercontinental.branches[*].rounds[*][*]') q(value)) q where value->'sets'<>'null'::jsonb;
 world_state:=s->'world';if world_state is null then return false;end if;if world_state='null'::jsonb then return true;end if;
 if regional_done<>298 or jsonb_typeof(world_state)<>'object' or jsonb_typeof(world_state->'groups')<>'array' or jsonb_array_length(world_state->'groups')<>6 or jsonb_typeof(world_state->'pots')<>'array' or jsonb_array_length(world_state->'pots')<>4 or jsonb_typeof(world_state->'tie')<>'array' or jsonb_array_length(world_state->'tie')<>24 then return false;end if;
 for g in select value from jsonb_array_elements(world_state->'groups') loop
  if jsonb_array_length(g->'teamIds')<>4 or not public.volleyworld_full_league_valid(g,g->'teamIds','WG'||i) then return false;end if;
  all_ids:=all_ids||(g->'teamIds');
  for r in select jsonb_object_keys(catalog) loop
   if (select count(*) from jsonb_array_elements_text(g->'teamIds') t where catalog->r ? t)>2 then return false;end if;
  end loop;i:=i+1;
 end loop;
 if (select count(distinct value) from jsonb_array_elements_text(all_ids))<>24 or not(world_state->'tie' @> all_ids and all_ids @> (world_state->'tie')) then return false;end if;
 eligible:=public.volleyworld_merit_entrants(s);
 if jsonb_array_length(eligible)<>24 or not(eligible @> all_ids and all_ids @> eligible) then return false;end if;
 select jsonb_agg(value order by public.volleyworld_qual_rank(value#>>'{}')) into seeds_sorted from jsonb_array_elements(eligible);
 for gi in 0..3 loop
  select jsonb_agg(value order by ord) into expected_pot from jsonb_array_elements(seeds_sorted) with ordinality q(value,ord) where ord>gi*6 and ord<=gi*6+6;
  if world_state->'pots'->gi is distinct from expected_pot then return false;end if;
 end loop;
 for item in select value from jsonb_array_elements(world_state->'pots') loop
  if jsonb_typeof(item) is distinct from 'array' or jsonb_array_length(item)<>6 then return false;end if;pot_ids:=pot_ids||item;
  for g in select value from jsonb_array_elements(world_state->'groups') loop
   if (select count(*) from jsonb_array_elements_text(g->'teamIds') t where item ? t)<>1 then return false;end if;
  end loop;
 end loop;
 if (select count(distinct value) from jsonb_array_elements_text(pot_ids))<>24 or not(pot_ids @> all_ids and all_ids @> pot_ids) then return false;end if;
 if world_state->'bracket'='null'::jsonb then return true;end if;
 select count(*) into world_done from jsonb_path_query(world_state,'$.groups[*].rounds[*][*]') as q(value) where value->'sets'<>'null'::jsonb;
 if world_done<>36 or jsonb_typeof(world_state->'bracket') is distinct from 'object' or not(world_state->'bracket' ?& array['r16','qf','sf','final','bronze']) or (select count(*) from jsonb_object_keys(world_state->'bracket'))<>5 then return false;end if;
 foreach k in array array['r16','qf','sf','final','bronze'] loop
  item:=world_state->'bracket'->k;
  if jsonb_typeof(item) is distinct from 'array' then return false;end if;
  prior:=case k when 'qf' then 'r16' when 'sf' then 'qf' when 'final' then 'sf' when 'bronze' then 'sf' else null end;
  if prior is null then expected_count:=8;
  elsif (select count(*) from jsonb_array_elements(world_state->'bracket'->prior) q where q->'sets'='null'::jsonb)=0 then expected_count:=case k when 'qf' then 4 when 'sf' then 2 else 1 end;
  else expected_count:=0;end if;
  -- Empty predecessors are not ready.
  if prior is not null and jsonb_array_length(world_state->'bracket'->prior)=0 then expected_count:=0;end if;
  if jsonb_array_length(item)<>expected_count then return false;end if;participants:='{}';
  for m in select value from jsonb_array_elements(item) loop
   if jsonb_typeof(m)<>'object' or not(all_ids ? (m->>'a')) or not(all_ids ? (m->>'b')) or m->>'a'=m->>'b' or m->>'a'=any(participants) or m->>'b'=any(participants) or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
   participants:=participants||array[m->>'a',m->>'b'];
  end loop;
 end loop;

 leaders:='[]';eligible:='[]';thirds:='[]';
 for g in select value from jsonb_array_elements(world_state->'groups') loop
  item:=public.volleyworld_full_group_table(g);leaders:=leaders||jsonb_build_array(item->0);eligible:=eligible||jsonb_build_array(item->0,item->1);
 end loop;
 select jsonb_agg(id order by ord) into thirds from (select t.id,row_number() over(order by t.w desc,t.sd desc,t.pd desc,array_position(array(select jsonb_array_elements_text(world_state->'tie')),t.id)) ord from jsonb_array_elements(world_state->'groups') q(group_data) cross join lateral public.volleyworld_qual_table(group_data) t where group_position=3) q where ord<=4;
 eligible:=eligible||thirds;seed_ids:='[]';
 for gi in 0..7 loop
  m:=world_state->'bracket'->'r16'->gi;seed_ids:=seed_ids||jsonb_build_array(m->>'a',m->>'b');
  if m->>'id' is distinct from 'WR'||gi then return false;end if;
  select ord::integer into ga from jsonb_array_elements(world_state->'groups') with ordinality q(group_data,ord) where group_data->'teamIds' ? (m->>'a');
  select ord::integer into gb from jsonb_array_elements(world_state->'groups') with ordinality q(group_data,ord) where group_data->'teamIds' ? (m->>'b');
  if ga=gb or ((leaders ? (m->>'a')) and (leaders ? (m->>'b'))) or ((thirds ? (m->>'a')) and not(leaders ? (m->>'b'))) or ((thirds ? (m->>'b')) and not(leaders ? (m->>'a'))) then return false;end if;
 end loop;
 if (select count(distinct value) from jsonb_array_elements(seed_ids))<>16 or not(eligible @> seed_ids and seed_ids @> eligible) then return false;end if;
 foreach k in array array['qf','sf','final','bronze'] loop
  prior:=case k when 'qf' then 'r16' when 'sf' then 'qf' else 'sf' end;
  prefix:=case k when 'qf' then 'WQ' when 'sf' then 'WS' when 'final' then 'WF' else 'WB' end;
  gi:=0;prior_ms:=world_state->'bracket'->prior;
  for m in select value from jsonb_array_elements(world_state->'bracket'->k) loop
   if m->>'id' is distinct from prefix||gi or m->>'a' is distinct from public.volleyworld_full_winner(prior_ms->(gi*2),k<>'bronze') or m->>'b' is distinct from public.volleyworld_full_winner(prior_ms->(gi*2+1),k<>'bronze') then return false;end if;gi:=gi+1;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
create function public.volleyworld_full_merit_state_valid(s jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
#variable_conflict use_column
declare catalog jsonb:='{"CEV":["POL","ITA","RUS","SLO","FRA","BUL","FIN","GER","UKR","BEL","TUR","SRB","CZE","GRE","ROU","NED","DEN","EST","POR","SUI","ISR","ESP","SWE","BLR","CRO","LAT","HUN","SVK","MKD","AUT","SMR","SCO","MNE","CYP","ALB","NOR","BIH","NIR","FRO"],"AVC":["JPN","IRI","KOR","CHN","PAK","AUS","QAT","BRN","INA","IND","THA","TPE","VIE","OMA","TKM","KGZ","KAZ","UAE","BAN","KSA","SRI","PHI","IRQ","KUW"],"NORCECA":["USA","CUB","CAN","MEX","PUR","DOM","DMA","LCA","BIZ","BAR","JAM","NCA","ANT","GUA","CUW","GRN","ESA","BAH"],"CAVB":["EGY","TUN","CMR","KEN","NGR","ALG","GHA","RWA","LBA","NIG","UGA","SEN","MAR"],"CSV":["BRA","ARG","CHI","COL","VEN","BOL"]}';r text;g jsonb;m jsonb;auto_ids jsonb:=s->'automatic';ic jsonb:=s->'intercontinental';pool jsonb;expected jsonb;all_seeds jsonb:='[]';branch jsonb;i integer;j integer;n integer;regional_ready boolean:=true;match_keys text[]:='{}';orders bigint[]:='{}';
begin
 if jsonb_typeof(s) is distinct from 'object' or octet_length(s::text)>1000000 or s->>'mode' is distinct from 'full-season' or s->'version' is distinct from '1'::jsonb or s->>'regionalFormat' is distinct from 'merit-v1' or jsonb_typeof(s->'seasonNumber') is distinct from 'number' or (s->>'seasonNumber')::numeric<>trunc((s->>'seasonNumber')::numeric) or (s->>'seasonNumber')::numeric not between 1 and 2147483647 or coalesce(s->>'seasonId','') !~ '^[a-zA-Z0-9-]{1,100}$' or coalesce(s->>'createdAt','')='' or jsonb_typeof(s->'regions') is distinct from 'object' or (select count(*) from jsonb_object_keys(s->'regions'))<>5 or auto_ids is null or ic is null or s->'world' is null then return false;end if;
 perform (s->>'createdAt')::timestamptz;
 if auto_ids<>'null'::jsonb then
  if jsonb_typeof(auto_ids) is distinct from 'array' or jsonb_array_length(auto_ids)<>2 or (select count(distinct value) from jsonb_array_elements_text(auto_ids))<>2 or exists(select 1 from jsonb_array_elements_text(auto_ids) q(id) where public.volleyworld_qual_rank(id) is null) then return false;end if;
 end if;
 for r in select jsonb_object_keys(catalog) loop
  g:=s->'regions'->r;
  if r='CSV' then
   if g->'directSlots' is distinct from '2'::jsonb or g ?| array['groups','pots','decider','playoff'] or not public.volleyworld_full_league_valid(g,catalog->r,r) then return false;end if;
  else
   if not public.volleyworld_merit_region_groups_valid(g,catalog->r,r) then return false;end if;
   if auto_ids='null'::jsonb then
    if g->'playoff' is distinct from 'null'::jsonb then return false;end if;
   else
    expected:=public.volleyworld_merit_seeds(s,r);
    if not public.volleyworld_merit_bracket_valid(g->'playoff',expected,r,case when r in ('CEV','AVC') then 4 else 1 end) then return false;end if;
    if jsonb_array_length(public.volleyworld_merit_advancers(g->'playoff'))<>(case when r in ('CEV','AVC') then 4 else 1 end) then regional_ready:=false;end if;
   end if;
  end if;
  if auto_ids<>'null'::jsonb and exists(select 1 from jsonb_path_query(g,'$.rounds[*][*]') q(m) where m->'sets'='null'::jsonb) then return false;end if;
 end loop;
 for m in select value from jsonb_path_query(s,'$.regions.*.rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.regions.*.playoff.rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.intercontinental.branches[*].rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.world.groups[*].rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.world.bracket.*[*]') q(value) loop
  if coalesce(m->>'id','') !~ '^[A-Z0-9-]{1,64}$' or m->>'id'=any(match_keys) then return false;end if;match_keys:=array_append(match_keys,m->>'id');
  if m ? 'resultOrder' then
   if m->'sets'='null'::jsonb or jsonb_typeof(m->'resultOrder') is distinct from 'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 or (m->>'resultOrder')::bigint=any(orders) then return false;end if;orders:=array_append(orders,(m->>'resultOrder')::bigint);
  end if;
 end loop;
 if auto_ids='null'::jsonb then return ic='null'::jsonb and s->'world'='null'::jsonb;end if;
 if ic<>'null'::jsonb then
  if not regional_ready or jsonb_typeof(ic) is distinct from 'object' or (select count(*) from jsonb_object_keys(ic))<>2 or jsonb_typeof(ic->'pots') is distinct from 'array' or jsonb_array_length(ic->'pots')<>6 or jsonb_typeof(ic->'branches') is distinct from 'array' or jsonb_array_length(ic->'branches')<>3 then return false;end if;
  pool:=public.volleyworld_merit_pool(s);if jsonb_array_length(pool)<>17 then return false;end if;
  for i in 0..5 loop
   select jsonb_agg(value order by ord) into expected from jsonb_array_elements(pool) with ordinality q(value,ord) where ord>i*3 and ord<=i*3+3;
   if ic->'pots'->i is distinct from expected then return false;end if;
  end loop;
  if (select array_agg(jsonb_array_length(b->'seeds') order by jsonb_array_length(b->'seeds')) from jsonb_array_elements(ic->'branches') q(b)) is distinct from array[5,6,6] then return false;end if;
  for i in 0..2 loop
   branch:=ic->'branches'->i;n:=jsonb_array_length(branch->'seeds');
   if not public.volleyworld_merit_bracket_valid(branch,branch->'seeds','IC'||i) then return false;end if;
   all_seeds:=all_seeds||(branch->'seeds');
   for j in 0..n-1 loop if not(ic->'pots'->j ? (branch->'seeds'->>j)) then return false;end if;end loop;
  end loop;
  if jsonb_array_length(all_seeds)<>17 or (select count(distinct value) from jsonb_array_elements_text(all_seeds))<>17 or not(all_seeds @> pool and pool @> all_seeds) then return false;end if;
 end if;
 return public.volleyworld_merit_world_valid(s);
exception when others then return false;
end $$;

create function public.volleyworld_tour_merit_state_valid(s jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
#variable_conflict use_column
declare catalog jsonb:='{"CEV":["POL","ITA","RUS","SLO","FRA","BUL","FIN","GER","UKR","BEL","TUR","SRB","CZE","GRE","ROU","NED","DEN","EST","POR","SUI","ISR","ESP","SWE","BLR","CRO","LAT","HUN","SVK","MKD","AUT","SMR","SCO","MNE","CYP","ALB","NOR","BIH","NIR","FRO"],"AVC":["JPN","IRI","KOR","CHN","PAK","AUS","QAT","BRN","INA","IND","THA","TPE","VIE","OMA","TKM","KGZ","KAZ","UAE","BAN","KSA","SRI","PHI","IRQ","KUW"],"NORCECA":["USA","CUB","CAN","MEX","PUR","DOM","DMA","LCA","BIZ","BAR","JAM","NCA","ANT","GUA","CUW","GRN","ESA","BAH"],"CAVB":["EGY","TUN","CMR","KEN","NGR","ALG","GHA","RWA","LBA","NIG","UGA","SEN","MAR"],"CSV":["BRA","ARG","CHI","COL","VEN","BOL"]}';q jsonb:='{"CEV":7,"AVC":7,"CSV":6,"NORCECA":7,"CAVB":5}';l jsonb:=s->'league';c jsonb:=s->'challenger';f jsonb:=s->'worldcup';r text;st integer;last_round integer;i integer;auto_expected jsonb;league_w text;challenger_w text;regional_ready boolean:=true;
begin
 if jsonb_typeof(s) is distinct from 'object' or octet_length(s::text)>2000000 or s->>'mode' is distinct from 'tour' or s->'version' is distinct from '1'::jsonb or s->>'rules' is distinct from 'merit-v1' or coalesce(s->>'seasonId','') !~ '^[a-zA-Z0-9-]{1,100}$' or jsonb_typeof(s->'seasonNumber') is distinct from 'number' or (s->>'seasonNumber')::numeric<>trunc((s->>'seasonNumber')::numeric) or (s->>'seasonNumber')::numeric not between 1 and 2147483647 or coalesce(s->>'createdAt','')='' then return false;end if;
 perform (s->>'createdAt')::timestamptz;
 if jsonb_typeof(s->'stage') is distinct from 'number' or (s->>'stage')::numeric<>trunc((s->>'stage')::numeric) or (s->>'stage')::int not between 0 and 8 or jsonb_typeof(s->'roster') is distinct from 'array' or jsonb_array_length(s->'roster')<>32 or (select count(distinct value) from jsonb_array_elements_text(s->'roster'))<>32 then return false;end if;
 st:=(s->>'stage')::int;
 for r in select jsonb_object_keys(q) loop
  if (select count(*) from jsonb_array_elements_text(s->'roster') t(id) where catalog->r ? id)<>(q->>r)::int then return false;end if;
 end loop;
 if l ? 'playoffEntry' or not public.volleyworld_tour_league_valid(l,s->'roster') or not public.volleyworld_full_merit_state_valid(f) then return false;end if;
 if (st>=3) is distinct from (c is not null and c<>'null'::jsonb) then return false;end if;
 if st>=3 and (not public.volleyworld_challenger_state_valid(c) or not(c->'roster' @> (s->'roster') and s->'roster' @> (c->'roster'))) then return false;end if;
 last_round:=case when st<2 then 10 when st<4 then 20 else 31 end;
 for i in 0..30 loop
  if i>=last_round and exists(select 1 from jsonb_array_elements(l->'rounds'->i) q(m) where m->'sets'<>'null'::jsonb) then return false;end if;
  if (st>0 and i<10 or st>2 and i<20 or st>4) and exists(select 1 from jsonb_array_elements(l->'rounds'->i) q(m) where m->'sets'='null'::jsonb) then return false;end if;
 end loop;
 if st=0 and exists(select 1 from jsonb_path_query(f,'$.regions.*.rounds[*][*]') q(m) where m->'sets'<>'null'::jsonb) then return false;end if;
 if st>1 and exists(select 1 from jsonb_path_query(f,'$.regions.*.rounds[*][*]') q(m) where m->'sets'='null'::jsonb) then return false;end if;
 if st>3 and public.volleyworld_full_winner(c->'bracket'->'final'->0) is null then return false;end if;
 if (st>=5) is distinct from (l->'playin' is not null and l->'playin'<>'null'::jsonb) then return false;end if;
 if st<5 and l->'bracket' is distinct from 'null'::jsonb then return false;end if;
 if st<6 then
  if f->'automatic' is distinct from 'null'::jsonb or f->'intercontinental' is distinct from 'null'::jsonb then return false;end if;
 else
  league_w:=public.volleyworld_full_winner(l->'bracket'->'final'->0);challenger_w:=public.volleyworld_full_winner(c->'bracket'->'final'->0);
  if league_w is null or challenger_w is null then return false;end if;
  auto_expected:=jsonb_build_array(league_w,case when league_w=challenger_w then public.volleyworld_full_winner(c->'bracket'->'final'->0,false) else challenger_w end);
  if f->'automatic' is distinct from auto_expected then return false;end if;
  foreach r in array array['CEV','AVC','NORCECA','CAVB'] loop
   if jsonb_array_length(public.volleyworld_merit_advancers(f->'regions'->r->'playoff'))<>(case when r in ('CEV','AVC') then 4 else 1 end) then regional_ready:=false;end if;
  end loop;
  if regional_ready is distinct from (f->'intercontinental'<>'null'::jsonb) then return false;end if;
 end if;
 if st>6 and exists(select 1 from jsonb_array_elements(f->'intercontinental'->'branches') q(b) where public.volleyworld_qual_champion(b) is null) then return false;end if;
 if (st>=7) is distinct from (f->'world' is not null and f->'world'<>'null'::jsonb) then return false;end if;
 if st=8 and public.volleyworld_full_winner(f->'world'->'bracket'->'final'->0) is null then return false;end if;
 return true;
exception when others then return false;
end $$;

create or replace function public.volleyworld_tour_state_valid(s jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
begin
 if s->>'rules'='merit-v1' then return public.volleyworld_tour_merit_state_valid(s);end if;
 if s ? 'rules' then return false;end if;
 return public.volleyworld_tour_state_valid_pre_merit(s);
exception when others then return false;
end $$;
create or replace function public.volleyworld_full_state_valid(s jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
begin
 if s->>'regionalFormat'='merit-v1' then return public.volleyworld_full_merit_state_valid(s);end if;
 if s->>'regionalFormat'='qualification-v2' then return public.volleyworld_full_state_valid_v2(s);end if;
 if s ? 'intercontinental' or exists(select 1 from jsonb_each(s->'regions') q where q.value ?| array['directSlots','playoff']) then return false;end if;
 return public.volleyworld_full_state_valid_legacy(s);
exception when others then return false;
end $$;


do $$ declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.volleyworld_tour_seasons'::regclass and contype='c' and pg_get_constraintdef(oid) like '%total_matches%' loop
  execute format('alter table public.volleyworld_tour_seasons drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.volleyworld_tour_seasons add constraint volleyworld_tour_total_matches_check check(total_matches in (948,964,968));
create or replace function public.volleyworld_tour_derive() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not coalesce(public.volleyworld_tour_state_valid(new.state),false) then raise exception 'INVALID_TOUR';end if;
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id or old.season_id<>new.state->>'seasonId' or old.season_number<>(new.state->>'seasonNumber')::integer or old.created_at<>(new.state->>'createdAt')::timestamptz then raise exception 'IMMUTABLE_TOUR_METADATA';end if;
  if old.state->'worldcup'->'regionalFormat' is distinct from new.state->'worldcup'->'regionalFormat' then raise exception 'IMMUTABLE_TOUR_WORLD_FORMAT';end if;
  if old.state->'rules' is distinct from new.state->'rules' then raise exception 'IMMUTABLE_TOUR_RULES';end if;
  if old.state->'roster' is distinct from new.state->'roster' then raise exception 'IMMUTABLE_TOUR_ROSTER';end if;
  if old.status='completed' and old.state is distinct from new.state then raise exception 'SAVE_CONFLICT: completed Tour is immutable';end if;
  if new.revision<>old.revision+1 then raise exception 'SAVE_CONFLICT: invalid revision';end if;
 elsif new.revision<>1 then raise exception 'SAVE_CONFLICT: invalid initial revision';end if;
 new.season_id:=new.state->>'seasonId';new.season_number:=(new.state->>'seasonNumber')::integer;new.created_at:=(new.state->>'createdAt')::timestamptz;new.updated_at:=now();
 select count(*) into new.played from public.volleyworld_tour_matches(new.state) q(m) where m->'sets'<>'null'::jsonb;
 new.honours:=public.volleyworld_tour_honours(new.state);
 new.total_matches:=case when new.state->>'rules'='merit-v1' then 948 when new.state->'league'->>'playoffEntry'='top16' then 968 else 964 end;
 new.status:='active';new.podium:='[]'::jsonb;
 if new.state->>'stage'='8' then
  new.status:='completed';new.podium:=jsonb_build_array(public.volleyworld_full_winner(new.state->'worldcup'->'world'->'bracket'->'final'->0),public.volleyworld_full_winner(new.state->'worldcup'->'world'->'bracket'->'final'->0,false),public.volleyworld_full_winner(new.state->'worldcup'->'world'->'bracket'->'bronze'->0));
 end if;
 return new;
end $$;
revoke all on function public.volleyworld_tour_state_valid_pre_merit(jsonb) from public,anon;
grant execute on function public.volleyworld_tour_state_valid_pre_merit(jsonb) to authenticated;
revoke all on function public.volleyworld_merit_table(jsonb,text) from public,anon;
grant execute on function public.volleyworld_merit_table(jsonb,text) to authenticated;
revoke all on function public.volleyworld_merit_seeds(jsonb,text) from public,anon;
grant execute on function public.volleyworld_merit_seeds(jsonb,text) to authenticated;
revoke all on function public.volleyworld_merit_advancers(jsonb) from public,anon;
grant execute on function public.volleyworld_merit_advancers(jsonb) to authenticated;
revoke all on function public.volleyworld_merit_bracket_valid(jsonb,jsonb,text,integer) from public,anon;
grant execute on function public.volleyworld_merit_bracket_valid(jsonb,jsonb,text,integer) to authenticated;
revoke all on function public.volleyworld_merit_direct(jsonb) from public,anon;
grant execute on function public.volleyworld_merit_direct(jsonb) to authenticated;
revoke all on function public.volleyworld_merit_pool(jsonb) from public,anon;
grant execute on function public.volleyworld_merit_pool(jsonb) to authenticated;
revoke all on function public.volleyworld_merit_entrants(jsonb) from public,anon;
grant execute on function public.volleyworld_merit_entrants(jsonb) to authenticated;
revoke all on function public.volleyworld_merit_region_groups_valid(jsonb,jsonb,text) from public,anon;
grant execute on function public.volleyworld_merit_region_groups_valid(jsonb,jsonb,text) to authenticated;
revoke all on function public.volleyworld_merit_world_valid(jsonb) from public,anon;
grant execute on function public.volleyworld_merit_world_valid(jsonb) to authenticated;
revoke all on function public.volleyworld_full_merit_state_valid(jsonb) from public,anon;
grant execute on function public.volleyworld_full_merit_state_valid(jsonb) to authenticated;
revoke all on function public.volleyworld_tour_merit_state_valid(jsonb) from public,anon;
grant execute on function public.volleyworld_tour_merit_state_valid(jsonb) to authenticated;
