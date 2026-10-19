create or replace function public.volleyworld_full_state_valid_v2(s jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare catalog jsonb := '{"CEV":["POL","ITA","RUS","SLO","FRA","BUL","FIN","GER","UKR","BEL","TUR","SRB","CZE","GRE","ROU","NED","DEN","EST","POR","SUI","ISR","ESP","SWE","BLR","CRO","LAT","HUN","SVK","MKD","AUT","SMR","SCO","MNE","CYP","ALB","NOR","BIH","NIR","FRO"],"AVC":["JPN","IRI","KOR","CHN","PAK","AUS","QAT","BRN","INA","IND","THA","TPE","VIE","OMA","TKM","KGZ","KAZ","UAE","BAN","KSA","SRI","PHI","IRQ","KUW"],"NORCECA":["USA","CUB","CAN","MEX","PUR","DOM","DMA","LCA","BIZ","BAR","JAM","NCA","ANT","GUA","CUW","GRN","ESA","BAH"],"CAVB":["EGY","TUN","CMR","KEN","NGR","ALG","GHA","RWA","LBA","NIG","UGA","SEN","MAR"],"CSV":["BRA","ARG","CHI","COL","VEN","BOL"]}'::jsonb; quotas jsonb:='{"CEV":9,"AVC":5,"NORCECA":4,"CAVB":3,"CSV":3}';
 r text; g jsonb; world_state jsonb; m jsonb; item jsonb; k text; n integer; i integer:=0; regional_done integer:=0; world_done integer:=0; all_ids jsonb:='[]'; pot_ids jsonb:='[]'; match_keys text[]:='{}'; participants text[]; orders bigint[]:='{}'; stage_count integer; prior text; expected_count integer; pool jsonb; ic jsonb; seed_ids jsonb; eligible jsonb; leaders jsonb; thirds jsonb; expected_pot jsonb; gi integer; ga integer; gb integer; prior_ms jsonb; prefix text; seeds_sorted jsonb;
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
 world_state:=s->'world';if world_state is null then return false;end if;if world_state='null'::jsonb then return true;end if;
 if regional_done<>314 or jsonb_typeof(world_state)<>'object' or jsonb_typeof(world_state->'groups')<>'array' or jsonb_array_length(world_state->'groups')<>6 or jsonb_typeof(world_state->'pots')<>'array' or jsonb_array_length(world_state->'pots')<>4 or jsonb_typeof(world_state->'tie')<>'array' or jsonb_array_length(world_state->'tie')<>24 then return false;end if;
 for g in select value from jsonb_array_elements(world_state->'groups') loop
  if jsonb_array_length(g->'teamIds')<>4 or not public.volleyworld_full_league_valid(g,g->'teamIds','WG'||i) then return false;end if;
  all_ids:=all_ids||(g->'teamIds');
  for r in select jsonb_object_keys(catalog) loop
   if (select count(*) from jsonb_array_elements_text(g->'teamIds') t where catalog->r ? t)>2 then return false;end if;
  end loop;i:=i+1;
 end loop;
 if (select count(distinct value) from jsonb_array_elements_text(all_ids))<>24 or not(world_state->'tie' @> all_ids and all_ids @> (world_state->'tie')) then return false;end if;
 eligible:=public.volleyworld_qual_entrants(s);
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

