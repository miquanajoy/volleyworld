-- Third mode; no mutation of World League or World Cup tables.
create function public.volleyworld_nations_same(a jsonb,b jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_typeof(a)='array' and jsonb_typeof(b)='array' and jsonb_array_length(a)=jsonb_array_length(b) and (select count(distinct value) from jsonb_array_elements(a))=jsonb_array_length(a) and a @> b and b @> a,false)
$$;
create function public.volleyworld_nations_winner(m jsonb, win boolean default true) returns text
language sql immutable security invoker set search_path='' as $$
 select case when m->'sets' is null or m->'sets'='null'::jsonb then null when ((select count(*) from jsonb_array_elements(m->'sets') p where (p->>0)::numeric>(p->>1)::numeric)=3)=win then m->>'a' else m->>'b' end
$$;
create function public.volleyworld_nations_state_valid(s jsonb) returns boolean
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
create function public.volleyworld_nations_transition(p jsonb,s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare tiers text[]:=array['A','B','C','D']; ti integer; t text; g jsonb; ids jsonb; expected jsonb; remove_ids jsonb; tab jsonb;
begin
 if not public.volleyworld_nations_state_valid(p) or not public.volleyworld_nations_state_valid(s) or public.volleyworld_nations_winner(p->'playoff'->'final'->0) is null or public.volleyworld_nations_winner(p->'playoff'->'bronze'->0) is null
 or s->>'campaignId' is distinct from p->>'campaignId' or s->>'previousSeasonId' is distinct from p->>'seasonId' or (s->>'cycleNumber')::integer<>(p->>'cycleNumber')::integer+1 or s->>'seasonId'=p->>'seasonId' then return false;end if;
 for ti in 1..4 loop
  t:=tiers[ti];expected:='[]';
  for g in select value from jsonb_array_elements(p->'divisions'->t->'groups') loop
   tab:=public.volleyworld_full_group_table(g);
   for ids in select value from jsonb_array_elements(tab) with ordinality q(value,ord) where (ti=1 or ord<>1) and (ti=4 or ord<>4) loop expected:=expected||jsonb_build_array(ids);end loop;
  end loop;
  if ti>1 then for g in select value from jsonb_array_elements(p->'divisions'->tiers[ti-1]->'groups') loop expected:=expected||jsonb_build_array(public.volleyworld_full_group_table(g)->3);end loop;end if;
  if ti<4 then for g in select value from jsonb_array_elements(p->'divisions'->tiers[ti+1]->'groups') loop expected:=expected||jsonb_build_array(public.volleyworld_full_group_table(g)->0);end loop;end if;
  if not public.volleyworld_nations_same(s->'divisions'->t->'teamIds',expected) then return false;end if;
 end loop;return true;
exception when others then return false;
end $$;
-- Stable draw signature: scores may change before lock, participants and seeded draw may not.
create function public.volleyworld_nations_draw(s jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('roster',s->'roster','divisions',jsonb_object_agg(t.key,jsonb_build_object('teamIds',t.value->'teamIds','pots',t.value->'pots','groups',(select jsonb_agg(jsonb_build_object('teamIds',g->'teamIds','tie',g->'tie','matches',(select jsonb_agg(jsonb_build_array(m->'id',m->'a',m->'b') order by m->>'id') from jsonb_path_query(g,'$.rounds[*][*]') q(m)))) from jsonb_array_elements(t.value->'groups') q(g))))) from jsonb_each(s->'divisions') t
$$;
create table public.volleyworld_nations_seasons(
 user_id uuid not null references auth.users(id) on delete cascade,
 season_id text not null,season_number integer not null,created_at timestamptz not null,
 campaign_id text not null,cycle_number integer not null,previous_id text,
 status text not null check(status in ('active','completed')),played integer not null check(played between 0 and 200),podium jsonb not null,
 state jsonb not null check(public.volleyworld_nations_state_valid(state)),revision bigint not null default 1 check(revision>=1),updated_at timestamptz not null default now(),
 primary key(user_id,season_id),unique(user_id,season_number),unique(user_id,campaign_id,cycle_number),
 foreign key(user_id,previous_id) references public.volleyworld_nations_seasons(user_id,season_id)
);
create index volleyworld_nations_previous on public.volleyworld_nations_seasons(user_id,previous_id);
alter table public.volleyworld_nations_seasons enable row level security;
revoke all on public.volleyworld_nations_seasons from public,anon,authenticated;
grant select,insert,update on public.volleyworld_nations_seasons to authenticated;
create policy nations_select_owner on public.volleyworld_nations_seasons for select to authenticated using((select auth.uid())=user_id);
create policy nations_insert_owner on public.volleyworld_nations_seasons for insert to authenticated with check((select auth.uid())=user_id);
create policy nations_update_owner on public.volleyworld_nations_seasons for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create function public.volleyworld_nations_derive() returns trigger
language plpgsql security invoker set search_path='' as $$
declare parent_state jsonb;final jsonb;bronze jsonb;
begin
 if not public.volleyworld_nations_state_valid(new.state) then raise exception 'INVALID_NATIONS_SEASON';end if;
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id or old.season_id<>new.state->>'seasonId' or old.season_number<>(new.state->>'seasonNumber')::integer or old.created_at<>(new.state->>'createdAt')::timestamptz or old.campaign_id<>new.state->>'campaignId' or old.cycle_number<>(new.state->>'cycleNumber')::integer or old.previous_id is distinct from new.state->>'previousSeasonId' then raise exception 'IMMUTABLE_NATIONS_METADATA';end if;
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
 select count(*) into new.played from (select value from jsonb_path_query(new.state,'$.divisions.*.groups[*].rounds[*][*]') q(value) union all select value from jsonb_path_query(new.state,'$.playoff.*[*]') q(value)) q where value->'sets'<>'null'::jsonb;
 final:=new.state->'playoff'->'final'->0;bronze:=new.state->'playoff'->'bronze'->0;new.status:='active';new.podium:='[]';
 if public.volleyworld_nations_winner(final) is not null and public.volleyworld_nations_winner(bronze) is not null then
  new.status:='completed';new.podium:=jsonb_build_array(public.volleyworld_nations_winner(final),public.volleyworld_nations_winner(final,false),public.volleyworld_nations_winner(bronze));
 end if;return new;
end $$;
create trigger volleyworld_nations_derive before insert or update on public.volleyworld_nations_seasons for each row execute function public.volleyworld_nations_derive();
create function public.save_volleyworld_nations_season(p_state jsonb,p_expected_revision bigint) returns table(revision bigint,updated_at timestamptz)
language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid();saved public.volleyworld_nations_seasons%rowtype;
begin
 if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not coalesce(public.volleyworld_nations_state_valid(p_state),false) or p_expected_revision is null or p_expected_revision<0 then raise exception 'INVALID_NATIONS_SEASON';end if;
 select * into saved from public.volleyworld_nations_seasons f where f.user_id=actor and f.season_id=p_state->>'seasonId' for update;
 if found then
  if saved.revision<>p_expected_revision then raise exception 'SAVE_CONFLICT';end if;
  if saved.status='completed' then
   if saved.state is distinct from p_state then raise exception 'SAVE_CONFLICT: completed season is immutable';end if;
   return query select saved.revision,saved.updated_at;return;
  end if;
  update public.volleyworld_nations_seasons f set state=p_state,revision=f.revision+1 where f.user_id=actor and f.season_id=p_state->>'seasonId' returning f.* into saved;
 else
  if p_expected_revision<>0 then raise exception 'SAVE_CONFLICT';end if;
  insert into public.volleyworld_nations_seasons(user_id,state,revision) values(actor,p_state,1) returning * into saved;
 end if;
 return query select saved.revision,saved.updated_at;
exception when unique_violation then raise exception 'SAVE_CONFLICT: Nations League season or campaign cycle already exists';
end $$;
revoke all on function public.volleyworld_nations_same(jsonb,jsonb),public.volleyworld_nations_winner(jsonb,boolean),public.volleyworld_nations_state_valid(jsonb),public.volleyworld_nations_transition(jsonb,jsonb),public.volleyworld_nations_draw(jsonb),public.volleyworld_nations_derive(),public.save_volleyworld_nations_season(jsonb,bigint) from public,anon;
grant execute on function public.volleyworld_nations_same(jsonb,jsonb),public.volleyworld_nations_winner(jsonb,boolean),public.volleyworld_nations_state_valid(jsonb),public.volleyworld_nations_transition(jsonb,jsonb),public.volleyworld_nations_draw(jsonb),public.save_volleyworld_nations_season(jsonb,bigint) to authenticated;
