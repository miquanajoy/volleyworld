-- Independent Tour snapshots; shared competitions retain their original schemas.
create function public.volleyworld_tour_matches(s jsonb) returns setof jsonb language sql immutable security invoker set search_path='' as $$
 select value from jsonb_path_query(s,'$.league.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.league.playin[*]') q(value)
 union all select value from jsonb_path_query(s,'$.league.bracket.*[*]') q(value) where jsonb_typeof(value)='object'
 union all select value from jsonb_path_query(s,'$.challenger.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.challenger.bracket.*[*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.regions.*.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.regions.*.playoff.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.intercontinental.branches[*].rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.world.groups[*].rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.world.bracket.*[*]') q(value)
$$;
create function public.volleyworld_tour_league_valid(l jsonb,roster jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare norm jsonb; ranked jsonb; b jsonb:=l->'bracket';p jsonb:=l->'playin';m jsonb;ms jsonb;k text;prior text;prefix text;idx integer;i integer;expected integer;seed integer;id text;used text[]:='{}';keys text[]:='{}';orders bigint[]:='{}';prior_ms jsonb;done boolean:=false;prior_max bigint;
begin
 if l->>'version' is distinct from '1' or l->>'playoffFormat' is distinct from 'single' or l->>'playoffEntry' is distinct from 'top16' or l->'setupConfirmed' is distinct from 'true'::jsonb then return false;end if;
 select jsonb_set(l,'{rounds}',jsonb_agg(row_data order by r)) into norm from (select r,jsonb_agg(jsonb_set(m,'{id}',to_jsonb(regexp_replace(m->>'id','^L','L-'))) order by n) row_data from jsonb_array_elements(l->'rounds') with ordinality x(rd,r) cross join lateral jsonb_array_elements(rd) with ordinality q(m,n) group by r) q;
 if not public.volleyworld_full_league_valid(norm,roster,'L') then return false;end if;
 -- All matches of a League round must finish before the next round can start.
 for ms in select value from jsonb_array_elements(l->'rounds') loop
  if done and exists(select 1 from jsonb_array_elements(ms) q(m) where m->'sets'<>'null'::jsonb) then return false;end if;
  if exists(select 1 from jsonb_array_elements(ms) q(m) where m->'sets'='null'::jsonb) then done:=true;end if;
 end loop;
 for m in select value from public.volleyworld_tour_matches(jsonb_build_object('league',l)) q(value) loop
  if jsonb_typeof(m)<>'object' or not(roster ? (m->>'a')) or not(roster ? (m->>'b')) or m->>'a'=m->>'b' or coalesce(m->>'id','') !~ '^[LPRQSFBD0-9-]+$' or m->>'id'=any(keys) or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;keys:=array_append(keys,m->>'id');
  if m->'sets'<>'null'::jsonb then
   if jsonb_typeof(m->'resultOrder') is distinct from 'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 or (m->>'resultOrder')::bigint=any(orders) then return false;end if;orders:=array_append(orders,(m->>'resultOrder')::bigint);
  elsif m ? 'resultOrder' then return false;end if;
 end loop;
 if p='null'::jsonb then return b='null'::jsonb;end if;
 if done or jsonb_typeof(p)<>'array' or jsonb_array_length(p)<>4 then return false;end if;
 ranked:=public.volleyworld_full_group_table(l);i:=0;
 for m in select value from jsonb_array_elements(p) loop
  if m->>'id' is distinct from 'P'||i or m->>'a' is distinct from ranked->>(16+i) or m->>'b' is distinct from ranked->>(23-i) then return false;end if;i:=i+1;
 end loop;
 if b='null'::jsonb then return true;end if;
 if jsonb_typeof(b)<>'object' or exists(select 1 from jsonb_array_elements(p) q(m) where m->'sets'='null'::jsonb) or (select count(*) from jsonb_object_keys(b))<>7 or not(b ?& array['seeds','r20','r16','qf','sf','bronze','final']) or jsonb_array_length(b->'r20')<>4 then return false;end if;
 i:=0;for m in select value from jsonb_array_elements(b->'r20') loop
  if m->>'id' is distinct from 'D'||i or m->>'a' is distinct from ranked->>(12+i) or m->>'b' is distinct from public.volleyworld_full_winner(p->(3-i)) then return false;end if;i:=i+1;
 end loop;
 if jsonb_array_length(b->'r16')=0 then
  return b->'seeds'='{}'::jsonb and b->'qf'='[]'::jsonb and b->'sf'='[]'::jsonb and b->'bronze'='[]'::jsonb and b->'final'='[]'::jsonb;
 end if;
 if jsonb_array_length(b->'r16')<>8 or exists(select 1 from jsonb_array_elements(b->'r20') q(m) where m->'sets'='null'::jsonb) or jsonb_typeof(b->'seeds')<>'object' or (select count(*) from jsonb_object_keys(b->'seeds'))<>16 then return false;end if;
 i:=0;for id in select value from jsonb_array_elements_text(ranked) limit 12 loop
  if b->'seeds'->>id is distinct from (i/4+1)::text then return false;end if;i:=i+1;
 end loop;
 for m in select value from jsonb_array_elements(b->'r20') loop
  if b->'seeds'->>public.volleyworld_full_winner(m) is distinct from '4' then return false;end if;
 end loop;
 i:=0;for m in select value from jsonb_array_elements(b->'r16') loop
  if m->>'id' is distinct from 'R'||i then return false;end if;
  if b->'seeds'->>(m->>'a') is distinct from (case when i%2=0 then '1' else '2' end) or b->'seeds'->>(m->>'b') is distinct from (case when i%2=0 then '4' else '3' end) then return false;end if;
  foreach id in array array[m->>'a',m->>'b'] loop if id=any(used) then return false;end if;used:=array_append(used,id);end loop;i:=i+1;
 end loop;
 foreach k in array array['qf','sf','bronze','final'] loop
  prior:=case k when 'qf' then 'r16' when 'sf' then 'qf' else 'sf' end;prior_ms:=b->prior;
  prefix:=case k when 'qf' then 'Q' when 'sf' then 'S' when 'bronze' then 'B' else 'F' end;
  expected:=case when jsonb_array_length(prior_ms)>0 and not exists(select 1 from jsonb_array_elements(prior_ms) q(m) where m->'sets'='null'::jsonb) then case when k='bronze' then 1 else jsonb_array_length(prior_ms)/2 end else 0 end;
  if jsonb_array_length(b->k)<>expected then return false;end if;
  i:=0;for m in select value from jsonb_array_elements(b->k) loop
   if m->>'id' is distinct from prefix||i or m->>'a' is distinct from public.volleyworld_full_winner(prior_ms->(i*2),k<>'bronze') or m->>'b' is distinct from public.volleyworld_full_winner(prior_ms->(i*2+1),k<>'bronze') then return false;end if;i:=i+1;
  end loop;
 end loop;
 if b->'final'->0->'sets' is not null and b->'final'->0->'sets'<>'null'::jsonb and (b->'bronze'->0->'sets' is null or b->'bronze'->0->'sets'='null'::jsonb or (b->'final'->0->>'resultOrder')::bigint <= (b->'bronze'->0->>'resultOrder')::bigint) then return false;end if;
 return true;
exception when others then return false;
end $$;

create function public.volleyworld_tour_state_valid(s jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
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
create table public.volleyworld_tour_seasons (
 user_id uuid not null references auth.users(id) on delete cascade,
 season_id text not null,season_number integer not null,created_at timestamptz not null,
 status text not null check(status in ('active','completed')),
 played integer not null check(played between 0 and 968),podium jsonb not null,
 state jsonb not null check(public.volleyworld_tour_state_valid(state)),
 revision bigint not null default 1 check(revision>=1),updated_at timestamptz not null default now(),
 primary key(user_id,season_id),unique(user_id,season_number)
);
alter table public.volleyworld_tour_seasons enable row level security;
revoke all on public.volleyworld_tour_seasons from public,anon,authenticated;
grant select,insert,update on public.volleyworld_tour_seasons to authenticated;
create policy tour_select_owner on public.volleyworld_tour_seasons for select to authenticated using((select auth.uid())=user_id);
create policy tour_insert_owner on public.volleyworld_tour_seasons for insert to authenticated with check((select auth.uid())=user_id);
create policy tour_update_owner on public.volleyworld_tour_seasons for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

create function public.volleyworld_tour_derive() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not coalesce(public.volleyworld_tour_state_valid(new.state),false) then raise exception 'INVALID_TOUR';end if;
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id or old.season_id<>new.state->>'seasonId' or old.season_number<>(new.state->>'seasonNumber')::integer or old.created_at<>(new.state->>'createdAt')::timestamptz then raise exception 'IMMUTABLE_TOUR_METADATA';end if;
  if old.state->'roster' is distinct from new.state->'roster' then raise exception 'IMMUTABLE_TOUR_ROSTER';end if;
  if old.status='completed' and old.state is distinct from new.state then raise exception 'SAVE_CONFLICT: completed Tour is immutable';end if;
  if new.revision<>old.revision+1 then raise exception 'SAVE_CONFLICT: invalid revision';end if;
 elsif new.revision<>1 then raise exception 'SAVE_CONFLICT: invalid initial revision';end if;
 new.season_id:=new.state->>'seasonId';new.season_number:=(new.state->>'seasonNumber')::integer;new.created_at:=(new.state->>'createdAt')::timestamptz;new.updated_at:=now();
 select count(*) into new.played from public.volleyworld_tour_matches(new.state) q(m) where m->'sets'<>'null'::jsonb;
 new.status:='active';new.podium:='[]'::jsonb;
 if new.state->>'stage'='8' then
  new.status:='completed';new.podium:=jsonb_build_array(public.volleyworld_full_winner(new.state->'worldcup'->'world'->'bracket'->'final'->0),public.volleyworld_full_winner(new.state->'worldcup'->'world'->'bracket'->'final'->0,false),public.volleyworld_full_winner(new.state->'worldcup'->'world'->'bracket'->'bronze'->0));
 end if;
 return new;
end $$;
create trigger tour_derive before insert or update on public.volleyworld_tour_seasons for each row execute function public.volleyworld_tour_derive();

create function public.save_volleyworld_tour_season(p_state jsonb,p_expected_revision bigint)
returns table(revision bigint,updated_at timestamptz) language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid();saved public.volleyworld_tour_seasons%rowtype;
begin
 if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if p_expected_revision is null or p_expected_revision<0 or not coalesce(public.volleyworld_tour_state_valid(p_state),false) then raise exception 'INVALID_TOUR';end if;
 select * into saved from public.volleyworld_tour_seasons f where f.user_id=actor and f.season_id=p_state->>'seasonId' for update;
 if found then
  if saved.revision<>p_expected_revision then raise exception 'SAVE_CONFLICT';end if;
  if saved.status='completed' then
   if saved.state is distinct from p_state then raise exception 'SAVE_CONFLICT: completed Tour is immutable';end if;
   return query select saved.revision,saved.updated_at;return;
  end if;
  update public.volleyworld_tour_seasons f set state=p_state,revision=f.revision+1 where f.user_id=actor and f.season_id=p_state->>'seasonId' returning f.* into saved;
 else
  if p_expected_revision<>0 then raise exception 'SAVE_CONFLICT';end if;
  insert into public.volleyworld_tour_seasons(user_id,state,revision) values(actor,p_state,1) returning * into saved;
 end if;
 return query select saved.revision,saved.updated_at;
exception when unique_violation then raise exception 'SAVE_CONFLICT: Tour identity or season number already exists';
end $$;
revoke all on function public.volleyworld_tour_state_valid(jsonb),public.volleyworld_tour_derive(),public.save_volleyworld_tour_season(jsonb,bigint) from public,anon;
grant execute on function public.volleyworld_tour_state_valid(jsonb),public.save_volleyworld_tour_season(jsonb,bigint) to authenticated;

create trigger z_reset_guard before insert or update on public.volleyworld_tour_seasons for each row execute function public.volleyworld_reset_guard();
revoke all on function public.volleyworld_tour_matches(jsonb),public.volleyworld_tour_league_valid(jsonb,jsonb) from public,anon;
grant execute on function public.volleyworld_tour_matches(jsonb),public.volleyworld_tour_league_valid(jsonb,jsonb) to authenticated;
