-- Regional circuit saves have their own identity and never accept legacy Tour states.
create function public.volleyworld_circuit_matches(s jsonb) returns setof jsonb
language sql immutable security invoker set search_path='' as $$
 select value from pg_catalog.jsonb_path_query(s,'strict $.** ? (exists(@.id) && exists(@.a) && exists(@.b) && exists(@.sets))') value;
$$;
create function public.volleyworld_circuit_state_valid(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare r text; z jsonb; p jsonb; m jsonb; ids text[]; allids text[]:='{}'; stages integer; n integer;
begin
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
create table public.volleyworld_circuit_seasons (
 user_id uuid not null references auth.users(id) on delete cascade,
 season_id text not null,season_number integer not null,created_at timestamptz not null,
 status text not null check(status in ('active','completed')),
 played integer not null check(played between 0 and 1071),podium jsonb not null,
 state jsonb not null check(public.volleyworld_circuit_state_valid(state)),
 revision bigint not null default 1 check(revision>=1),updated_at timestamptz not null default now(),
 primary key(user_id,season_id),unique(user_id,season_number)
);
alter table public.volleyworld_circuit_seasons enable row level security;
revoke all on public.volleyworld_circuit_seasons from public,anon,authenticated;
grant select,insert,update,delete on public.volleyworld_circuit_seasons to authenticated;
create policy circuit_select_owner on public.volleyworld_circuit_seasons for select to authenticated using((select auth.uid())=user_id);
create policy circuit_insert_owner on public.volleyworld_circuit_seasons for insert to authenticated with check((select auth.uid())=user_id);
create policy circuit_update_owner on public.volleyworld_circuit_seasons for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy circuit_delete_owner on public.volleyworld_circuit_seasons for delete to authenticated using((select auth.uid())=user_id);
create function public.volleyworld_circuit_derive() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not coalesce(public.volleyworld_circuit_state_valid(new.state),false) then raise exception 'INVALID_CIRCUIT';end if;
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id or old.season_id<>new.state->>'seasonId' or old.season_number<>(new.state->>'seasonNumber')::integer or old.created_at<>(new.state->>'createdAt')::timestamptz or old.state->>'chainId'<>new.state->>'chainId' or old.state->'previousSeasonId' is distinct from new.state->'previousSeasonId' then raise exception 'IMMUTABLE_CIRCUIT_METADATA';end if;
  if exists(select 1 from jsonb_each(old.state->'regions') o where o.value->'upper' is distinct from new.state->'regions'->o.key->'upper' or o.value->'lower' is distinct from new.state->'regions'->o.key->'lower') then raise exception 'IMMUTABLE_CIRCUIT_ROSTER';end if;
  if old.status='completed' and old.state is distinct from new.state then raise exception 'SAVE_CONFLICT: completed season is immutable';end if;
  if new.revision<>old.revision+1 then raise exception 'SAVE_CONFLICT: invalid revision';end if;
 elsif new.revision<>1 then raise exception 'SAVE_CONFLICT: invalid initial revision';end if;
 new.season_id:=new.state->>'seasonId';new.season_number:=(new.state->>'seasonNumber')::integer;new.created_at:=(new.state->>'createdAt')::timestamptz;new.updated_at:=now();
 select count(*) into new.played from public.volleyworld_circuit_matches(new.state) q(m) where m->'sets'<>'null'::jsonb;
 new.status:='active';new.podium:='[]'::jsonb;
 if new.state->>'stage'='7' then
  new.status:='completed';new.podium:=jsonb_build_array(public.volleyworld_full_winner(new.state->'world'->'bracket'->'final'->0),public.volleyworld_full_winner(new.state->'world'->'bracket'->'final'->0,false),public.volleyworld_full_winner(new.state->'world'->'bracket'->'bronze'->0));
 end if;
 return new;
end $$;
create trigger circuit_derive before insert or update on public.volleyworld_circuit_seasons for each row execute function public.volleyworld_circuit_derive();
create trigger z_reset_guard before insert or update on public.volleyworld_circuit_seasons for each row execute function public.volleyworld_reset_guard();
create function public.save_volleyworld_circuit_season(p_state jsonb,p_expected_revision bigint)
returns table(revision bigint,updated_at timestamptz) language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid();saved public.volleyworld_circuit_seasons%rowtype;
begin
 if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if p_expected_revision is null or p_expected_revision<0 or not coalesce(public.volleyworld_circuit_state_valid(p_state),false) then raise exception 'INVALID_CIRCUIT';end if;
 if p_expected_revision=0 then
  insert into public.volleyworld_circuit_seasons(user_id,season_id,season_number,created_at,status,played,podium,state,revision)
  values(actor,p_state->>'seasonId',(p_state->>'seasonNumber')::integer,(p_state->>'createdAt')::timestamptz,'active',0,'[]',p_state,1) returning * into saved;
 else
  update public.volleyworld_circuit_seasons set state=p_state,revision=p_expected_revision+1 where user_id=actor and season_id=p_state->>'seasonId' and volleyworld_circuit_seasons.revision=p_expected_revision returning * into saved;
  if not found then raise exception 'SAVE_CONFLICT: stale revision';end if;
 end if;
 return query select saved.revision,saved.updated_at;
exception when unique_violation then raise exception 'SAVE_CONFLICT: duplicate season';
end $$;
revoke all on function public.volleyworld_circuit_matches(jsonb),public.volleyworld_circuit_state_valid(jsonb),public.volleyworld_circuit_derive(),public.save_volleyworld_circuit_season(jsonb,bigint) from public,anon;
grant execute on function public.volleyworld_circuit_matches(jsonb),public.volleyworld_circuit_state_valid(jsonb),public.save_volleyworld_circuit_season(jsonb,bigint) to authenticated;
