create or replace function public.volleyworld_full_qual_region_valid(g jsonb,expected jsonb,prefix text) returns boolean
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
 select not exists(select 1 from jsonb_path_query(g,'$.rounds[*][*]') q(value) where value->'sets'='null'::jsonb) into done;
 if not done then return g->'playoff' is not distinct from 'null'::jsonb;end if;
 if not public.volleyworld_qual_bracket_valid(g->'playoff',public.volleyworld_qual_seeds(g),prefix) then return false;end if;
 return true;
exception when others then return false;
end $$;
create or replace function public.volleyworld_full_state_valid_v2(s jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare catalog jsonb := '{"CEV":["POL","ITA","RUS","SLO","FRA","BUL","FIN","GER","UKR","BEL","TUR","SRB","CZE","GRE","ROU","NED","DEN","EST","POR","SUI","ISR","ESP","SWE","BLR","CRO","LAT","HUN","SVK","MKD","AUT","SMR","SCO","MNE","CYP","ALB","NOR","BIH","NIR","FRO"],"AVC":["JPN","IRI","KOR","CHN","PAK","AUS","QAT","BRN","INA","IND","THA","TPE","VIE","OMA","TKM","KGZ","KAZ","UAE","BAN","KSA","SRI","PHI","IRQ","KUW"],"NORCECA":["USA","CUB","CAN","MEX","PUR","DOM","DMA","LCA","BIZ","BAR","JAM","NCA","ANT","GUA","CUW","GRN","ESA","BAH"],"CAVB":["EGY","TUN","CMR","KEN","NGR","ALG","GHA","RWA","LBA","NIG","UGA","SEN","MAR"],"CSV":["BRA","ARG","CHI","COL","VEN","BOL"]}'::jsonb; quotas jsonb:='{"CEV":9,"AVC":5,"NORCECA":4,"CAVB":3,"CSV":3}';
 r text; g jsonb; w jsonb; m jsonb; item jsonb; k text; n integer; i integer:=0; regional_done integer:=0; world_done integer:=0; all_ids jsonb:='[]'; pot_ids jsonb:='[]'; match_keys text[]:='{}'; participants text[]; orders bigint[]:='{}'; stage_count integer; prior text; expected_count integer; pool jsonb; ic jsonb; seed_ids jsonb; eligible jsonb; leaders jsonb; thirds jsonb; expected_pot jsonb; gi integer; ga integer; gb integer; prior_ms jsonb; prefix text; seeds_sorted jsonb;
begin
 if jsonb_typeof(s)<>'object' or octet_length(s::text)>1000000 or s->>'mode' is distinct from 'full-season' or s->>'version' is distinct from '1' or jsonb_typeof(s->'version') is distinct from 'number' or jsonb_typeof(s->'seasonNumber')<>'number' or (s->>'seasonNumber')::numeric not between 1 and 2147483647 or (s->>'seasonNumber')::numeric<>trunc((s->>'seasonNumber')::numeric) or coalesce(s->>'seasonId','') !~ '^[a-zA-Z0-9-]{1,100}$' or coalesce(s->>'createdAt','')='' or jsonb_typeof(s->'regions')<>'object' or (select count(*) from jsonb_object_keys(s->'regions'))<>5 then return false;end if;
 if s ? 'regionalFormat' and s->>'regionalFormat' is distinct from 'qualification-v2' then return false;end if;
 for r in select jsonb_object_keys(catalog) loop
  if s->>'regionalFormat'='qualification-v2' and r<>'CSV' then
   if not public.volleyworld_full_qual_region_valid(s->'regions'->r,catalog->r,r) then return false;end if;
  else
   if s->'regions'->r->'directSlots' is distinct from '2'::jsonb or (s->'regions'->r) ?| array['groups','pots','decider','playoff'] or not public.volleyworld_full_league_valid(s->'regions'->r,catalog->r,r) then return false;end if;
  end if;
 end loop;
 select count(*) into regional_done from (select value from jsonb_path_query(s,'$.regions.*.rounds[*][*]') as q(value) union all select value from jsonb_path_query(s,'$.regions.*.playoff.rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.intercontinental.branches[*].rounds[*][*]') q(value)) q where value->'sets'<>'null'::jsonb;
 for m in select value from jsonb_path_query(s,'$.regions.*.rounds[*][*]') as q(value) union all select value from jsonb_path_query(s,'$.regions.*.playoff.rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.intercontinental.branches[*].rounds[*][*]') q(value) union all select value from jsonb_path_query(s,'$.world.groups[*].rounds[*][*]') as q(value) union all select value from jsonb_path_query(s,'$.world.bracket.*[*]') as q(value) loop
  if coalesce(m->>'id','') !~ '^[A-Z0-9-]{1,64}$' or m->>'id'=any(match_keys) then return false;end if;match_keys:=array_append(match_keys,m->>'id');
  if m ? 'resultOrder' then
   if m->'sets'='null'::jsonb or jsonb_typeof(m->'resultOrder')<>'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 or (m->>'resultOrder')::bigint=any(orders) then return false;end if;orders:=array_append(orders,(m->>'resultOrder')::bigint);
  end if;
 end loop;
 ic:=s->'intercontinental';
 if ic is distinct from 'null'::jsonb then
  if jsonb_typeof(ic) is distinct from 'object' or (select count(*) from jsonb_object_keys(ic))<>2 or jsonb_typeof(ic->'pots') is distinct from 'array' or jsonb_array_length(ic->'pots')<>9 or jsonb_typeof(ic->'branches') is distinct from 'array' or jsonb_array_length(ic->'branches')<>3 then return false;end if;
  foreach r in array array['CEV','AVC','NORCECA','CAVB'] loop if public.volleyworld_qual_champion(s->'regions'->r->'playoff') is null then return false;end if;end loop;
  if exists(select 1 from jsonb_path_query(s->'regions'->'CSV','$.rounds[*][*]') q(value) where value->'sets'='null'::jsonb) then return false;end if;
  pool:=public.volleyworld_qual_pool(s);if jsonb_array_length(pool)<>27 then return false;end if;
  for gi in 0..8 loop
   select jsonb_agg(value order by ord) into expected_pot from jsonb_array_elements(pool) with ordinality q(value,ord) where ord>gi*3 and ord<=gi*3+3;
   if ic->'pots'->gi is distinct from expected_pot then return false;end if;
  end loop;
  seed_ids:='[]';
  for gi in 0..2 loop
   item:=ic->'branches'->gi;seed_ids:=seed_ids||(item->'seeds');
   if jsonb_array_length(item->'seeds')<>9 or not public.volleyworld_qual_bracket_valid(item,item->'seeds','IC'||gi) then return false;end if;
   for n in 0..8 loop if not(ic->'pots'->n ? (item->'seeds'->>n)) then return false;end if;end loop;
  end loop;
  if jsonb_array_length(seed_ids)<>27 or (select count(distinct value) from jsonb_array_elements(seed_ids))<>27 or not(seed_ids @> pool and pool @> seed_ids) then return false;end if;
 end if;
 w:=s->'world';if w is null then return false;end if;if w='null'::jsonb then return true;end if;
 if regional_done<>314 or jsonb_typeof(w)<>'object' or jsonb_typeof(w->'groups')<>'array' or jsonb_array_length(w->'groups')<>6 or jsonb_typeof(w->'pots')<>'array' or jsonb_array_length(w->'pots')<>4 or jsonb_typeof(w->'tie')<>'array' or jsonb_array_length(w->'tie')<>24 then return false;end if;
 for g in select value from jsonb_array_elements(w->'groups') loop
  if jsonb_array_length(g->'teamIds')<>4 or not public.volleyworld_full_league_valid(g,g->'teamIds','WG'||i) then return false;end if;
  all_ids:=all_ids||(g->'teamIds');
  for r in select jsonb_object_keys(catalog) loop
   if (select count(*) from jsonb_array_elements_text(g->'teamIds') t where catalog->r ? t)>2 then return false;end if;
  end loop;i:=i+1;
 end loop;
 if (select count(distinct value) from jsonb_array_elements_text(all_ids))<>24 or not(w->'tie' @> all_ids and all_ids @> (w->'tie')) then return false;end if;
 eligible:=public.volleyworld_qual_entrants(s);
 if jsonb_array_length(eligible)<>24 or not(eligible @> all_ids and all_ids @> eligible) then return false;end if;
 select jsonb_agg(value order by public.volleyworld_qual_rank(value#>>'{}')) into seeds_sorted from jsonb_array_elements(eligible);
 for gi in 0..3 loop
  select jsonb_agg(value order by ord) into expected_pot from jsonb_array_elements(seeds_sorted) with ordinality q(value,ord) where ord>gi*6 and ord<=gi*6+6;
  if w->'pots'->gi is distinct from expected_pot then return false;end if;
 end loop;
 for item in select value from jsonb_array_elements(w->'pots') loop
  if jsonb_typeof(item) is distinct from 'array' or jsonb_array_length(item)<>6 then return false;end if;pot_ids:=pot_ids||item;
  for g in select value from jsonb_array_elements(w->'groups') loop
   if (select count(*) from jsonb_array_elements_text(g->'teamIds') t where item ? t)<>1 then return false;end if;
  end loop;
 end loop;
 if (select count(distinct value) from jsonb_array_elements_text(pot_ids))<>24 or not(pot_ids @> all_ids and all_ids @> pot_ids) then return false;end if;
 if w->'bracket'='null'::jsonb then return true;end if;
 select count(*) into world_done from jsonb_path_query(w,'$.groups[*].rounds[*][*]') as q(value) where value->'sets'<>'null'::jsonb;
 if world_done<>36 or jsonb_typeof(w->'bracket') is distinct from 'object' or not(w->'bracket' ?& array['r16','qf','sf','final','bronze']) or (select count(*) from jsonb_object_keys(w->'bracket'))<>5 then return false;end if;
 foreach k in array array['r16','qf','sf','final','bronze'] loop
  item:=w->'bracket'->k;
  if jsonb_typeof(item) is distinct from 'array' then return false;end if;
  prior:=case k when 'qf' then 'r16' when 'sf' then 'qf' when 'final' then 'sf' when 'bronze' then 'sf' else null end;
  if prior is null then expected_count:=8;
  elsif (select count(*) from jsonb_array_elements(w->'bracket'->prior) q where q->'sets'='null'::jsonb)=0 then expected_count:=case k when 'qf' then 4 when 'sf' then 2 else 1 end;
  else expected_count:=0;end if;
  -- Empty predecessors are not ready.
  if prior is not null and jsonb_array_length(w->'bracket'->prior)=0 then expected_count:=0;end if;
  if jsonb_array_length(item)<>expected_count then return false;end if;participants:='{}';
  for m in select value from jsonb_array_elements(item) loop
   if jsonb_typeof(m)<>'object' or not(all_ids ? (m->>'a')) or not(all_ids ? (m->>'b')) or m->>'a'=m->>'b' or m->>'a'=any(participants) or m->>'b'=any(participants) or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
   participants:=participants||array[m->>'a',m->>'b'];
  end loop;
 end loop;

 leaders:='[]';eligible:='[]';thirds:='[]';
 for g in select value from jsonb_array_elements(w->'groups') loop
  item:=public.volleyworld_full_group_table(g);leaders:=leaders||jsonb_build_array(item->0);eligible:=eligible||jsonb_build_array(item->0,item->1);
 end loop;
 select jsonb_agg(id order by ord) into thirds from (select t.id,row_number() over(order by t.w desc,t.sd desc,t.pd desc,array_position(array(select jsonb_array_elements_text(w->'tie')),t.id)) ord from jsonb_array_elements(w->'groups') q(g) cross join lateral public.volleyworld_qual_table(g) t where group_position=3) q where ord<=4;
 eligible:=eligible||thirds;seed_ids:='[]';
 for gi in 0..7 loop
  m:=w->'bracket'->'r16'->gi;seed_ids:=seed_ids||jsonb_build_array(m->>'a',m->>'b');
  if m->>'id' is distinct from 'WR'||gi then return false;end if;
  select ord::integer into ga from jsonb_array_elements(w->'groups') with ordinality q(g,ord) where g->'teamIds' ? (m->>'a');
  select ord::integer into gb from jsonb_array_elements(w->'groups') with ordinality q(g,ord) where g->'teamIds' ? (m->>'b');
  if ga=gb or ((leaders ? (m->>'a')) and (leaders ? (m->>'b'))) or ((thirds ? (m->>'a')) and not(leaders ? (m->>'b'))) or ((thirds ? (m->>'b')) and not(leaders ? (m->>'a'))) then return false;end if;
 end loop;
 if (select count(distinct value) from jsonb_array_elements(seed_ids))<>16 or not(eligible @> seed_ids and seed_ids @> eligible) then return false;end if;
 foreach k in array array['qf','sf','final','bronze'] loop
  prior:=case k when 'qf' then 'r16' when 'sf' then 'qf' else 'sf' end;
  prefix:=case k when 'qf' then 'WQ' when 'sf' then 'WS' when 'final' then 'WF' else 'WB' end;
  gi:=0;prior_ms:=w->'bracket'->prior;
  for m in select value from jsonb_array_elements(w->'bracket'->k) loop
   if m->>'id' is distinct from prefix||gi or m->>'a' is distinct from public.volleyworld_full_winner(prior_ms->(gi*2),k<>'bronze') or m->>'b' is distinct from public.volleyworld_full_winner(prior_ms->(gi*2+1),k<>'bronze') then return false;end if;gi:=gi+1;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;

