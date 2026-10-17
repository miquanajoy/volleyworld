-- Full Season is stored separately: existing 32-team saves and archives are untouched.
create function public.volleyworld_full_score_valid(p_sets jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare pair jsonb; a numeric; b numeric; aw integer:=0; bw integer:=0; i integer:=0; target integer;
begin
 if p_sets='null'::jsonb then return true; end if;
 if p_sets is null or jsonb_typeof(p_sets)<>'array' or jsonb_array_length(p_sets) not between 3 and 5 then return false; end if;
 for pair in select value from jsonb_array_elements(p_sets) loop
  if aw=3 or bw=3 or jsonb_typeof(pair)<>'array' or jsonb_array_length(pair)<>2 or jsonb_typeof(pair->0)<>'number' or jsonb_typeof(pair->1)<>'number' then return false; end if;
  a:=(pair->>0)::numeric;b:=(pair->>1)::numeric;target:=case when i=4 then 15 else 25 end;
  if a<>trunc(a) or b<>trunc(b) or least(a,b)<0 or greatest(a,b)>9007199254740991 or greatest(a,b)<target or abs(a-b)<2 or greatest(a,b)>target and abs(a-b)<>2 then return false; end if;
  if a>b then aw:=aw+1;else bw:=bw+1;end if;i:=i+1;
 end loop;
 return aw=3 or bw=3;
exception when others then return false;
end $$;

create function public.volleyworld_full_league_valid(g jsonb,expected jsonb,prefix text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare n integer; ri integer:=0; round_data jsonb; m jsonb; seen text[]:='{}'; pair_keys text[]:='{}'; match_keys text[]:='{}'; players text[];
begin
 if jsonb_typeof(g)<>'object' or jsonb_typeof(g->'teamIds')<>'array' or jsonb_typeof(g->'tie')<>'array' or jsonb_typeof(g->'rounds')<>'array' then return false;end if;
 n:=jsonb_array_length(expected);
 if jsonb_array_length(g->'teamIds')<>n or not(g->'teamIds' @> expected and expected @> (g->'teamIds')) or jsonb_array_length(g->'tie')<>n or not(g->'tie' @> expected and expected @> (g->'tie')) or jsonb_array_length(g->'rounds')<>(case when n%2=1 then n else n-1 end) then return false;end if;
 for round_data in select value from jsonb_array_elements(g->'rounds') loop
  if jsonb_typeof(round_data)<>'array' or jsonb_array_length(round_data)<>n/2 then return false;end if;players:='{}';
  for m in select value from jsonb_array_elements(round_data) loop
   if jsonb_typeof(m)<>'object' or coalesce(m->>'id','') !~ ('^'||prefix||'-'||ri||'-[0-9]+$') or not(expected ? (m->>'a')) or not(expected ? (m->>'b')) or m->>'a'=m->>'b' or m->>'a'=any(players) or m->>'b'=any(players) or m->>'id'=any(match_keys) or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;
   seen:=array[least(m->>'a',m->>'b')||':'||greatest(m->>'a',m->>'b')];
   if seen[1]=any(pair_keys) then return false;end if;pair_keys:=pair_keys||seen;
   match_keys:=array_append(match_keys,m->>'id');players:=players||array[m->>'a',m->>'b'];
  end loop;ri:=ri+1;
 end loop;
 return cardinality(pair_keys)=n*(n-1)/2;
exception when others then return false;
end $$;

create function public.volleyworld_full_state_valid(s jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare catalog jsonb := '{"CEV":["POL","ITA","RUS","SLO","FRA","BUL","FIN","GER","UKR","BEL","TUR","SRB","CZE","GRE","ROU","NED","DEN","EST","POR","SUI","ISR","ESP","SWE","BLR","CRO","LAT","HUN","SVK","MKD","AUT","SMR","SCO","MNE","CYP","ALB","NOR","BIH","NIR","FRO"],"AVC":["JPN","IRI","KOR","CHN","PAK","AUS","QAT","BRN","INA","IND","THA","TPE","VIE","OMA","TKM","KGZ","KAZ","UAE","BAN","KSA","SRI","PHI","IRQ","KUW"],"NORCECA":["USA","CUB","CAN","MEX","PUR","DOM","DMA","LCA","BIZ","BAR","JAM","NCA","ANT","GUA","CUW","GRN","ESA","BAH"],"CAVB":["EGY","TUN","CMR","KEN","NGR","ALG","GHA","RWA","LBA","NIG","UGA","SEN","MAR"],"CSV":["BRA","ARG","CHI","COL","VEN","BOL"]}'::jsonb; quotas jsonb:='{"CEV":9,"AVC":5,"NORCECA":4,"CAVB":3,"CSV":3}';
 r text; g jsonb; w jsonb; m jsonb; item jsonb; k text; n integer; i integer:=0; regional_done integer:=0; world_done integer:=0; all_ids jsonb:='[]'; pot_ids jsonb:='[]'; match_keys text[]:='{}'; participants text[]; orders bigint[]:='{}'; stage_count integer; prior text; expected_count integer;
begin
 if jsonb_typeof(s)<>'object' or octet_length(s::text)>1000000 or s->>'mode' is distinct from 'full-season' or s->>'version' is distinct from '1' or jsonb_typeof(s->'version') is distinct from 'number' or jsonb_typeof(s->'seasonNumber')<>'number' or (s->>'seasonNumber')::numeric not between 1 and 2147483647 or (s->>'seasonNumber')::numeric<>trunc((s->>'seasonNumber')::numeric) or coalesce(s->>'seasonId','') !~ '^[a-zA-Z0-9-]{1,100}$' or coalesce(s->>'createdAt','')='' or jsonb_typeof(s->'regions')<>'object' or (select count(*) from jsonb_object_keys(s->'regions'))<>5 then return false;end if;
 for r in select jsonb_object_keys(catalog) loop
  if not public.volleyworld_full_league_valid(s->'regions'->r,catalog->r,r) then return false;end if;
 end loop;
 select count(*) into regional_done from jsonb_path_query(s,'$.regions.*.rounds[*][*]') as q(value) where value->'sets'<>'null'::jsonb;
 w:=s->'world';if w is null then return false;end if;if w='null'::jsonb then return true;end if;
 if regional_done<>1263 or jsonb_typeof(w)<>'object' or jsonb_typeof(w->'groups')<>'array' or jsonb_array_length(w->'groups')<>6 or jsonb_typeof(w->'pots')<>'array' or jsonb_array_length(w->'pots')<>4 or jsonb_typeof(w->'tie')<>'array' or jsonb_array_length(w->'tie')<>24 then return false;end if;
 for g in select value from jsonb_array_elements(w->'groups') loop
  if jsonb_array_length(g->'teamIds')<>4 or not public.volleyworld_full_league_valid(g,g->'teamIds','WG'||i) then return false;end if;
  all_ids:=all_ids||(g->'teamIds');
  for r in select jsonb_object_keys(catalog) loop
   if (select count(*) from jsonb_array_elements_text(g->'teamIds') t where catalog->r ? t)>2 then return false;end if;
  end loop;i:=i+1;
 end loop;
 if (select count(distinct value) from jsonb_array_elements_text(all_ids))<>24 or not(w->'tie' @> all_ids and all_ids @> (w->'tie')) then return false;end if;
 for r in select jsonb_object_keys(catalog) loop
  if (select count(*) from jsonb_array_elements_text(all_ids) t where catalog->r ? t)<>(quotas->>r)::integer then return false;end if;
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
 for m in select value from jsonb_path_query(s,'$.regions.*.rounds[*][*]') as q(value) union all select value from jsonb_path_query(w,'$.groups[*].rounds[*][*]') as q(value) union all select value from jsonb_path_query(w,'$.bracket.*[*]') as q(value) loop
  if coalesce(m->>'id','') !~ '^[A-Z0-9-]{1,64}$' or m->>'id'=any(match_keys) then return false;end if;match_keys:=array_append(match_keys,m->>'id');
  if m ? 'resultOrder' then
   if m->'sets'='null'::jsonb or jsonb_typeof(m->'resultOrder')<>'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 or (m->>'resultOrder')::bigint=any(orders) then return false;end if;orders:=array_append(orders,(m->>'resultOrder')::bigint);
  end if;
 end loop;
 return true;
exception when others then return false;
end $$;

create table public.volleyworld_full_seasons (
 user_id uuid not null references auth.users(id) on delete cascade,
 season_id text not null, season_number integer not null, created_at timestamptz not null,
 status text not null check(status in ('active','completed')),
 played integer not null check(played between 0 and 1315), podium jsonb not null,
 state jsonb not null check(public.volleyworld_full_state_valid(state)),
 revision bigint not null default 1 check(revision>=1), updated_at timestamptz not null default now(),
 primary key(user_id,season_id),unique(user_id,season_number)
);
alter table public.volleyworld_full_seasons enable row level security;
revoke all on public.volleyworld_full_seasons from public,anon,authenticated;
grant select,insert,update on public.volleyworld_full_seasons to authenticated;
create policy "full_season_select_owner" on public.volleyworld_full_seasons for select to authenticated using((select auth.uid())=user_id);
create policy "full_season_insert_owner" on public.volleyworld_full_seasons for insert to authenticated with check((select auth.uid())=user_id);
create policy "full_season_update_owner" on public.volleyworld_full_seasons for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

create function public.volleyworld_full_derive() returns trigger language plpgsql set search_path = '' as $$
declare final jsonb; bronze jsonb; aw integer; bw integer; final_w text; final_l text; third text;
begin
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id or old.season_id<>new.state->>'seasonId' or old.season_number<>(new.state->>'seasonNumber')::integer or old.created_at<>(new.state->>'createdAt')::timestamptz then raise exception 'IMMUTABLE_FULL_METADATA';end if;
  if old.status='completed' and old.state is distinct from new.state then raise exception 'SAVE_CONFLICT: completed Full Season is immutable';end if;
  if new.revision<>old.revision+1 then raise exception 'SAVE_CONFLICT: invalid revision';end if;
 elsif new.revision<>1 then raise exception 'SAVE_CONFLICT: initial revision must be 1';end if;
 new.season_id:=new.state->>'seasonId';new.season_number:=(new.state->>'seasonNumber')::integer;new.created_at:=(new.state->>'createdAt')::timestamptz;new.updated_at:=clock_timestamp();
 select count(*) into new.played from (select value from jsonb_path_query(new.state,'$.regions.*.rounds[*][*]') as q(value) union all select value from jsonb_path_query(new.state,'$.world.groups[*].rounds[*][*]') as q(value) union all select value from jsonb_path_query(new.state,'$.world.bracket.*[*]') as q(value)) q where value->'sets'<>'null'::jsonb;
 final:=new.state->'world'->'bracket'->'final'->0;bronze:=new.state->'world'->'bracket'->'bronze'->0;
 new.status:='active';new.podium:='[]'::jsonb;
 if final->'sets' is not null and final->'sets'<>'null'::jsonb and bronze->'sets' is not null and bronze->'sets'<>'null'::jsonb then
  select count(*) into aw from jsonb_array_elements(final->'sets') p where (p->>0)::numeric>(p->>1)::numeric;
  final_w:=case when aw=3 then final->>'a' else final->>'b' end;final_l:=case when aw=3 then final->>'b' else final->>'a' end;
  select count(*) into bw from jsonb_array_elements(bronze->'sets') p where (p->>0)::numeric>(p->>1)::numeric;
  third:=case when bw=3 then bronze->>'a' else bronze->>'b' end;new.podium:=jsonb_build_array(final_w,final_l,third);new.status:='completed';
 end if;return new;
end $$;
create trigger full_season_derive before insert or update on public.volleyworld_full_seasons for each row execute function public.volleyworld_full_derive();

create function public.save_volleyworld_full_season(p_state jsonb,p_expected_revision bigint)
returns table(revision bigint,updated_at timestamptz) language plpgsql security invoker set search_path = '' as $$
declare actor uuid:=auth.uid(); saved public.volleyworld_full_seasons%rowtype;
begin
 if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not coalesce(public.volleyworld_full_state_valid(p_state),false) or p_expected_revision<0 or p_expected_revision is null then raise exception 'INVALID_FULL_SEASON';end if;
 select * into saved from public.volleyworld_full_seasons f where f.user_id=actor and f.season_id=p_state->>'seasonId' for update;
 if found then
  if saved.revision<>p_expected_revision then raise exception 'SAVE_CONFLICT';end if;
  if saved.status='completed' then
   if saved.state is distinct from p_state then raise exception 'SAVE_CONFLICT: completed Full Season is immutable';end if;
   return query select saved.revision,saved.updated_at;return;
  end if;
  update public.volleyworld_full_seasons f set state=p_state,revision=f.revision+1 where f.user_id=actor and f.season_id=p_state->>'seasonId' returning f.* into saved;
 else
  if p_expected_revision<>0 then raise exception 'SAVE_CONFLICT';end if;
  insert into public.volleyworld_full_seasons(user_id,state,revision) values(actor,p_state,1) returning * into saved;
 end if;
 return query select saved.revision,saved.updated_at;
exception when unique_violation then raise exception 'SAVE_CONFLICT: Full Season identity or number already exists';
end $$;
revoke all on function public.volleyworld_full_score_valid(jsonb),public.volleyworld_full_league_valid(jsonb,jsonb,text),public.volleyworld_full_state_valid(jsonb),public.volleyworld_full_derive(),public.save_volleyworld_full_season(jsonb,bigint) from public,anon;
grant execute on function public.volleyworld_full_score_valid(jsonb),public.volleyworld_full_league_valid(jsonb,jsonb,text),public.volleyworld_full_state_valid(jsonb),public.save_volleyworld_full_season(jsonb,bigint) to authenticated;
