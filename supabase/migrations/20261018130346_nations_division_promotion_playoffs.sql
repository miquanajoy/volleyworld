-- Preserve existing seasons; only newly created seasons use promotion playoffs.
create function public.volleyworld_nations_state_valid_legacy(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare roster jsonb:='["POL","ITA","RUS","USA","JPN","BRA","SLO","FRA","BUL","FIN","GER","UKR","CUB","ARG","BEL","CAN","TUR","SRB","IRI","CZE","GRE","ROU","NED","MEX","KOR","PUR","DEN","CHI","EGY","EST","TUN","POR","SUI","CHN","ISR","ESP","SWE","BLR","PAK","CRO","AUS","COL","QAT","BRN","INA","IND","CMR","DOM","THA","TPE","VIE","DMA","OMA","LCA","BIZ","BAR","KEN","NGR","JAM","ALG","TKM","NCA","GHA","RWA"]'::jsonb; all_ids jsonb:='[]'; sorted_ids jsonb; d jsonb; g jsonb; m jsonb; base jsonb; rr jsonb; pot jsonb; expected jsonb; leaders jsonb:='[]'; runners jsonb:='[]'; eligible jsonb; table_ids jsonb; b jsonb; ms jsonb; old_ms jsonb; group_a integer; group_b integer; tier text; k text; prior text; prefix text; ti integer:=0; i integer; j integer; r integer; n integer; played integer:=0; match_keys text[]:='{}'; orders bigint[]:='{}'; participants jsonb;
begin
 if jsonb_typeof(s) is distinct from 'object' or octet_length(s::text)>500000 or s->>'mode' is distinct from 'nations-league' or s->'version' is distinct from '1'::jsonb
 or jsonb_typeof(s->'seasonId') is distinct from 'string' or coalesce(s->>'seasonId','') !~ '^[a-zA-Z0-9-]{1,100}$'
 or jsonb_typeof(s->'campaignId') is distinct from 'string' or coalesce(s->>'campaignId','') !~ '^[a-zA-Z0-9-]{1,100}$'
 or jsonb_typeof(s->'createdAt') is distinct from 'string' or coalesce(s->>'createdAt','')='' then return false;end if;
 perform (s->>'createdAt')::timestamptz;
 foreach k in array array['seasonNumber','cycleNumber'] loop
  if jsonb_typeof(s->k) is distinct from 'number' or (s->>k)::numeric not between 1 and 2147483647 or (s->>k)::numeric<>trunc((s->>k)::numeric) then return false;end if;
 end loop;
 if (s->>'cycleNumber')::integer=1 then
  if s->'previousSeasonId' is distinct from 'null'::jsonb then return false;end if;
 elsif jsonb_typeof(s->'previousSeasonId') is distinct from 'string' or coalesce(s->>'previousSeasonId','') !~ '^[a-zA-Z0-9-]{1,100}$' or s->>'previousSeasonId'=s->>'seasonId' then return false;end if;
 if not public.volleyworld_nations_same(s->'roster',roster) or jsonb_typeof(s->'divisions') is distinct from 'object' or (select count(*) from jsonb_object_keys(s->'divisions'))<>4 or not(s->'divisions' ?& array['A','B','C','D']) then return false;end if;
 foreach tier in array array['A','B','C','D'] loop
  d:=s->'divisions'->tier;
  if jsonb_typeof(d->'teamIds') is distinct from 'array' or jsonb_array_length(d->'teamIds')<>16 or jsonb_typeof(d->'pots') is distinct from 'array' or jsonb_array_length(d->'pots')<>4 or jsonb_typeof(d->'groups') is distinct from 'array' or jsonb_array_length(d->'groups')<>4 then return false;end if;
  all_ids:=all_ids||(d->'teamIds');
  select jsonb_agg(value order by ord) into expected from jsonb_array_elements(roster) with ordinality t(value,ord) where ord>ti*16 and ord<=ti*16+16;
  if (s->>'cycleNumber')::integer=1 and not public.volleyworld_nations_same(d->'teamIds',expected) then return false;end if;
  select jsonb_agg(value order by ord) into sorted_ids from jsonb_array_elements(roster) with ordinality t(value,ord) where d->'teamIds' ? (value#>>'{}');
  participants:='[]';
  for i in 0..3 loop
   pot:=d->'pots'->i;
   select jsonb_agg(value order by ord) into expected from jsonb_array_elements(sorted_ids) with ordinality t(value,ord) where ord>i*4 and ord<=i*4+4;
   if not public.volleyworld_nations_same(pot,expected) then return false;end if;
   g:=d->'groups'->i;participants:=participants||(g->'teamIds');
   if jsonb_array_length(g->'teamIds')<>4 or jsonb_typeof(g->'rounds') is distinct from 'array' or jsonb_array_length(g->'rounds')<>6 then return false;end if;
   for pot in select value from jsonb_array_elements(d->'pots') loop
    if (select count(*) from jsonb_array_elements_text(g->'teamIds') ids where pot ? ids)<>1 then return false;end if;
   end loop;
   base:=jsonb_set(g,'{rounds}',jsonb_build_array(g->'rounds'->0,g->'rounds'->1,g->'rounds'->2));
   if not public.volleyworld_full_league_valid(base,g->'teamIds','N'||tier||i) then return false;end if;
   for r in 0..5 loop
    rr:=g->'rounds'->r;
    if jsonb_typeof(rr) is distinct from 'array' or jsonb_array_length(rr)<>2 then return false;end if;
    for j in 0..1 loop
     m:=rr->j;
     if m->>'id' is distinct from 'N'||tier||i||'-'||r||'-'||j or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
     if r>=3 and (m->>'a' is distinct from g->'rounds'->(r-3)->j->>'b' or m->>'b' is distinct from g->'rounds'->(r-3)->j->>'a') then return false;end if;
     if m->'sets'<>'null'::jsonb then played:=played+1;end if;
    end loop;
   end loop;
   if tier='A' then table_ids:=public.volleyworld_full_group_table(g);leaders:=leaders||jsonb_build_array(table_ids->0);runners:=runners||jsonb_build_array(table_ids->1);end if;
  end loop;
  if not public.volleyworld_nations_same(participants,d->'teamIds') then return false;end if;
  ti:=ti+1;
 end loop;
 if not public.volleyworld_nations_same(all_ids,roster) then return false;end if;
 for m in select value from jsonb_path_query(s,'$.divisions.*.groups[*].rounds[*][*]') as q(value) union all select value from jsonb_path_query(s,'$.playoff.*[*]') as q(value) loop
  if m->>'id'=any(match_keys) then return false;end if;match_keys:=array_append(match_keys,m->>'id');
  if m ? 'resultOrder' then
   if m->'sets'='null'::jsonb or jsonb_typeof(m->'resultOrder') is distinct from 'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 or (m->>'resultOrder')::bigint=any(orders) then return false;end if;
   orders:=array_append(orders,(m->>'resultOrder')::bigint);
  end if;
 end loop;
 b:=s->'playoff';if b='null'::jsonb then return true;end if;
 if played<>192 or jsonb_typeof(b) is distinct from 'object' or (select count(*) from jsonb_object_keys(b))<>4 or not(b ?& array['qf','sf','final','bronze']) then return false;end if;
 eligible:=leaders||runners;
 foreach k in array array['qf','sf','bronze','final'] loop
  ms:=b->k;prior:=case k when 'sf' then 'qf' when 'final' then 'sf' when 'bronze' then 'sf' end;
  prefix:=case k when 'qf' then 'NQ' when 'sf' then 'NS' when 'final' then 'NF' else 'NB' end;
  if prior is null then n:=4;
  else
   old_ms:=b->prior;n:=0;
   if jsonb_array_length(old_ms)>0 and not exists(select 1 from jsonb_array_elements(old_ms) q where q->'sets'='null'::jsonb) then n:=case k when 'sf' then 2 else 1 end;end if;
  end if;
  if jsonb_typeof(ms) is distinct from 'array' or jsonb_array_length(ms)<>n then return false;end if;
  participants:='[]';
  if n>0 then for i in 0..n-1 loop
   m:=ms->i;
   if m->>'id' is distinct from prefix||i or not public.volleyworld_full_score_valid(m->'sets') or not(eligible ? (m->>'a')) or not(eligible ? (m->>'b')) or m->>'a'=m->>'b' then return false;end if;
   participants:=participants||jsonb_build_array(m->>'a',m->>'b');
   if k='qf' then
    if not(leaders ? (m->>'a')) or not(runners ? (m->>'b')) then return false;end if;
    select ord::integer into group_a from jsonb_array_elements(s->'divisions'->'A'->'groups') with ordinality q(value,ord) where value->'teamIds' ? (m->>'a');
    select ord::integer into group_b from jsonb_array_elements(s->'divisions'->'A'->'groups') with ordinality q(value,ord) where value->'teamIds' ? (m->>'b');
    if group_a=group_b then return false;end if;
   else
    if m->>'a' is distinct from public.volleyworld_nations_winner(old_ms->(i*2),k<>'bronze') or m->>'b' is distinct from public.volleyworld_nations_winner(old_ms->(i*2+1),k<>'bronze') then return false;end if;
   end if;
  end loop;end if;
  if (select count(distinct value) from jsonb_array_elements(participants))<>n*2 then return false;end if;
 end loop;
 return true;
exception when others then return false;
end $$;

create or replace function public.volleyworld_nations_state_valid(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare tier text; b jsonb; g jsonb; tab jsonb; leaders jsonb; runners jsonb; eligible jsonb; participants jsonb; ms jsonb; prior_ms jsonb; m jsonb; k text; prior text; prefix text; n integer; i integer; ga integer; gb integer; orders bigint[]:='{}'; keys text[]:='{}';
begin
 if not public.volleyworld_nations_state_valid_legacy(s) then return false;end if;
 if not(s ? 'playoffFormat') then return not(s ? 'divisionPlayoffs');end if;
 if s->'playoffFormat' is distinct from '"all-divisions-v1"'::jsonb or jsonb_typeof(s->'divisionPlayoffs') is distinct from 'object' or (select count(*) from jsonb_object_keys(s->'divisionPlayoffs'))<>3 or not(s->'divisionPlayoffs' ?& array['B','C','D']) then return false;end if;
 foreach tier in array array['B','C','D'] loop
  b:=s->'divisionPlayoffs'->tier;
  if s->'playoff'='null'::jsonb then
   if b is distinct from 'null'::jsonb then return false;end if;
   continue;
  end if;
  if jsonb_typeof(b) is distinct from 'object' or (select count(*) from jsonb_object_keys(b))<>4 or not(b ?& array['qf','sf','final','bronze']) or b->'bronze' is distinct from '[]'::jsonb then return false;end if;
  leaders:='[]';runners:='[]';
  for g in select value from jsonb_array_elements(s->'divisions'->tier->'groups') loop
   tab:=public.volleyworld_full_group_table(g);leaders:=leaders||jsonb_build_array(tab->0);runners:=runners||jsonb_build_array(tab->1);
  end loop;
  eligible:=leaders||runners;
  foreach k in array array['qf','sf','final'] loop
   ms:=b->k;prior:=case k when 'sf' then 'qf' when 'final' then 'sf' end;
   prefix:='N'||tier||case k when 'qf' then 'Q' when 'sf' then 'S' else 'F' end;
   if prior is null then n:=4;
   else
    prior_ms:=b->prior;n:=0;
    if jsonb_array_length(prior_ms)>0 and not exists(select 1 from jsonb_array_elements(prior_ms) q where q->'sets'='null'::jsonb) then n:=case k when 'sf' then 2 else 1 end;end if;
   end if;
   if jsonb_typeof(ms) is distinct from 'array' or jsonb_array_length(ms)<>n then return false;end if;
   participants:='[]';
   if n>0 then for i in 0..n-1 loop
    m:=ms->i;
    if m->>'id' is distinct from prefix||i or not public.volleyworld_full_score_valid(m->'sets') or not(eligible ? (m->>'a')) or not(eligible ? (m->>'b')) or m->>'a'=m->>'b' then return false;end if;
    participants:=participants||jsonb_build_array(m->>'a',m->>'b');
    if k='qf' then
     if not(leaders ? (m->>'a')) or not(runners ? (m->>'b')) then return false;end if;
     select ord::integer into ga from jsonb_array_elements(s->'divisions'->tier->'groups') with ordinality q(value,ord) where value->'teamIds' ? (m->>'a');
     select ord::integer into gb from jsonb_array_elements(s->'divisions'->tier->'groups') with ordinality q(value,ord) where value->'teamIds' ? (m->>'b');
     if ga=gb then return false;end if;
    else
     if m->>'a' is distinct from public.volleyworld_nations_winner(prior_ms->(i*2)) or m->>'b' is distinct from public.volleyworld_nations_winner(prior_ms->(i*2+1)) then return false;end if;
    end if;
   end loop;end if;
   if (select count(distinct value) from jsonb_array_elements(participants))<>n*2 then return false;end if;
  end loop;
 end loop;
 for m in select value from jsonb_path_query(s,'$.divisions.*.groups[*].rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.playoff.*[*]') q(value)
 union all select value from jsonb_path_query(s,'$.divisionPlayoffs.*.*[*]') q(value) loop
  if m->>'id'=any(keys) then return false;end if;keys:=array_append(keys,m->>'id');
  if m ? 'resultOrder' then
   if m->'sets'='null'::jsonb or jsonb_typeof(m->'resultOrder') is distinct from 'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 or (m->>'resultOrder')::bigint=any(orders) then return false;end if;
   orders:=array_append(orders,(m->>'resultOrder')::bigint);
  end if;
 end loop;
 return true;
exception when others then return false;
end $$;
create function public.volleyworld_nations_complete(s jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select public.volleyworld_nations_winner(s->'playoff'->'final'->0) is not null
 and public.volleyworld_nations_winner(s->'playoff'->'bronze'->0) is not null
 and (not(s ? 'playoffFormat') or not exists(select 1 from unnest(array['B','C','D']) t where public.volleyworld_nations_winner(s->'divisionPlayoffs'->t->'final'->0) is null))
$$;
create function public.volleyworld_nations_promoted(s jsonb,t text) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select case when t='A' then '[]'::jsonb when s->>'playoffFormat'='all-divisions-v1' then
 coalesce((select jsonb_agg(public.volleyworld_nations_winner(m)) from jsonb_array_elements(s->'divisionPlayoffs'->t->'qf') q(m) where public.volleyworld_nations_winner(m) is not null),'[]'::jsonb)
 else (select jsonb_agg(public.volleyworld_full_group_table(g)->0) from jsonb_array_elements(s->'divisions'->t->'groups') q(g)) end
$$;
create or replace function public.volleyworld_nations_transition(p jsonb,s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare tiers text[]:=array['A','B','C','D'];ti integer;t text;g jsonb;expected jsonb;promoted jsonb;down jsonb;id text;
begin
 if not public.volleyworld_nations_state_valid(p) or not public.volleyworld_nations_state_valid(s) or not public.volleyworld_nations_complete(p)
 or s->>'campaignId' is distinct from p->>'campaignId' or s->>'previousSeasonId' is distinct from p->>'seasonId' or (s->>'cycleNumber')::integer<>(p->>'cycleNumber')::integer+1 or s->>'seasonId'=p->>'seasonId' then return false;end if;
 for ti in 1..4 loop
  t:=tiers[ti];expected:='[]';down:='[]';promoted:=public.volleyworld_nations_promoted(p,t);
  if ti<4 then for g in select value from jsonb_array_elements(p->'divisions'->t->'groups') loop down:=down||jsonb_build_array(public.volleyworld_full_group_table(g)->3);end loop;end if;
  for id in select value from jsonb_array_elements_text(p->'divisions'->t->'teamIds') loop
   if not(promoted ? id) and not(down ? id) then expected:=expected||jsonb_build_array(id);end if;
  end loop;
  if ti>1 then for g in select value from jsonb_array_elements(p->'divisions'->tiers[ti-1]->'groups') loop expected:=expected||jsonb_build_array(public.volleyworld_full_group_table(g)->3);end loop;end if;
  if ti<4 then expected:=expected||public.volleyworld_nations_promoted(p,tiers[ti+1]);end if;
  if not public.volleyworld_nations_same(s->'divisions'->t->'teamIds',expected) then return false;end if;
 end loop;return true;
exception when others then return false;
end $$;
alter table public.volleyworld_nations_seasons drop constraint volleyworld_nations_seasons_played_check;
alter table public.volleyworld_nations_seasons add column total_matches integer generated always as (case when state->>'playoffFormat'='all-divisions-v1' then 221 else 200 end) stored;
alter table public.volleyworld_nations_seasons add constraint volleyworld_nations_seasons_played_check check(played between 0 and total_matches);
create or replace function public.volleyworld_nations_derive() returns trigger
language plpgsql security invoker set search_path='' as $$
declare parent_state jsonb;final jsonb;bronze jsonb;
begin
 if not public.volleyworld_nations_state_valid(new.state) then raise exception 'INVALID_NATIONS_SEASON';end if;
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id or old.season_id<>new.state->>'seasonId' or old.season_number<>(new.state->>'seasonNumber')::integer or old.created_at<>(new.state->>'createdAt')::timestamptz or old.campaign_id<>new.state->>'campaignId' or old.cycle_number<>(new.state->>'cycleNumber')::integer or old.previous_id is distinct from new.state->>'previousSeasonId' then raise exception 'IMMUTABLE_NATIONS_METADATA';end if;
  if old.state->'playoffFormat' is distinct from new.state->'playoffFormat' then raise exception 'IMMUTABLE_NATIONS_FORMAT';end if;
  if old.status='completed' and old.state is distinct from new.state then raise exception 'SAVE_CONFLICT: completed season is immutable';end if;
  if public.volleyworld_nations_draw(old.state) is distinct from public.volleyworld_nations_draw(new.state) then raise exception 'IMMUTABLE_NATIONS_DRAW';end if;
  if new.revision<>old.revision+1 then raise exception 'SAVE_CONFLICT: invalid revision';end if;
 elsif new.revision<>1 then raise exception 'SAVE_CONFLICT: initial revision must be 1';end if;
 new.season_id:=new.state->>'seasonId';new.season_number:=(new.state->>'seasonNumber')::integer;new.created_at:=(new.state->>'createdAt')::timestamptz;
 new.campaign_id:=new.state->>'campaignId';new.cycle_number:=(new.state->>'cycleNumber')::integer;new.previous_id:=new.state->>'previousSeasonId';new.updated_at:=clock_timestamp();
 if new.cycle_number>1 then
  select state into parent_state from public.volleyworld_nations_seasons where user_id=new.user_id and season_id=new.previous_id;
  if parent_state is null or not public.volleyworld_nations_transition(parent_state,new.state) then raise exception 'INVALID_NATIONS_TRANSITION';end if;
 end if;
 select count(*) into new.played from (select value from jsonb_path_query(new.state,'$.divisions.*.groups[*].rounds[*][*]') q(value) union all select value from jsonb_path_query(new.state,'$.playoff.*[*]') q(value) union all select value from jsonb_path_query(new.state,'$.divisionPlayoffs.*.*[*]') q(value)) q where value->'sets'<>'null'::jsonb;
 final:=new.state->'playoff'->'final'->0;bronze:=new.state->'playoff'->'bronze'->0;new.status:='active';new.podium:='[]';
 if public.volleyworld_nations_complete(new.state) then
  new.status:='completed';new.podium:=jsonb_build_array(public.volleyworld_nations_winner(final),public.volleyworld_nations_winner(final,false),public.volleyworld_nations_winner(bronze));
 end if;return new;
end $$;

revoke all on function public.volleyworld_nations_state_valid_legacy(jsonb), public.volleyworld_nations_complete(jsonb),public.volleyworld_nations_promoted(jsonb,text) from public,anon;
grant execute on function public.volleyworld_nations_state_valid_legacy(jsonb),public.volleyworld_nations_complete(jsonb),public.volleyworld_nations_promoted(jsonb,text) to authenticated;
