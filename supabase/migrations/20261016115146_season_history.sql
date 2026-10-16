create table public.volleyworld_seasons (
 user_id uuid not null references auth.users(id) on delete cascade,
 season_id text not null check(season_id ~ '^[a-zA-Z0-9-]{1,100}$'),
 season_number integer not null check(season_number>0),
 status text not null check(status in ('completed','cancelled')),
 created_at timestamptz not null,
 ended_at timestamptz not null,
 podium jsonb not null default '[]'::jsonb check(jsonb_typeof(podium)='array'),
 played integer not null check(played between 0 and 516),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and snapshot->>'version'='1' and octet_length(snapshot::text)<=524288),
 primary key(user_id,season_id),
 unique(user_id,season_number)
);
alter table public.volleyworld_seasons enable row level security;
revoke all on public.volleyworld_seasons from anon,authenticated;
grant select,insert on public.volleyworld_seasons to authenticated;
create policy "Read own season history" on public.volleyworld_seasons for select to authenticated using((select auth.uid())=user_id);
create policy "Archive own seasons" on public.volleyworld_seasons for insert to authenticated with check((select auth.uid())=user_id);
create function public.save_volleyworld_with_history(p_state jsonb,p_expected_revision bigint,p_archives jsonb default '[]'::jsonb)
returns table(revision bigint,updated_at timestamptz)
language plpgsql security invoker set search_path='' as $$
declare a jsonb; existing public.volleyworld_seasons%rowtype; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if jsonb_typeof(p_archives)<>'array' or jsonb_array_length(p_archives)>10 then raise exception 'INVALID_HISTORY'; end if;
 -- Active progress and its historical snapshots are committed in one transaction.
 return query select s.revision,s.updated_at from public.save_volleyworld(p_state,p_expected_revision) s;
 for a in select value from jsonb_array_elements(p_archives) loop
  if a->'snapshot'->>'seasonId' is distinct from a->>'season_id'
   or a->'snapshot'->>'seasonNumber' is distinct from a->>'season_number' then raise exception 'INVALID_HISTORY'; end if;
  insert into public.volleyworld_seasons(user_id,season_id,season_number,status,created_at,ended_at,podium,played,snapshot)
  values(uid,a->>'season_id',(a->>'season_number')::integer,a->>'status',(a->>'created_at')::timestamptz,(a->>'ended_at')::timestamptz,coalesce(a->'podium','[]'::jsonb),(a->>'played')::integer,a->'snapshot')
  on conflict(user_id,season_id) do nothing;
  select * into existing from public.volleyworld_seasons where user_id=uid and season_id=a->>'season_id';
  if existing.snapshot is distinct from a->'snapshot' or existing.status is distinct from a->>'status' then
   raise exception 'SAVE_CONFLICT: season already archived with different results' using errcode='P0001';
  end if;
 end loop;
exception when unique_violation then raise exception 'SAVE_CONFLICT: season number already exists' using errcode='P0001';
end;
$$;
revoke all on function public.save_volleyworld_with_history(jsonb,bigint,jsonb) from public,anon;
grant execute on function public.save_volleyworld_with_history(jsonb,bigint,jsonb) to authenticated;
