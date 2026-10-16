begin;
create table if not exists public.volleyworld_saves (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null check (jsonb_typeof(state) = 'object' and state->>'version' = '1' and octet_length(state::text) <= 524288),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.volleyworld_saves enable row level security;
revoke all on public.volleyworld_saves from anon, authenticated;
grant select, insert, update on public.volleyworld_saves to authenticated;
create policy "Read own tournament" on public.volleyworld_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own tournament" on public.volleyworld_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own tournament" on public.volleyworld_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create or replace function public.save_volleyworld(p_state jsonb, p_expected_revision bigint)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_count integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if p_expected_revision is null or p_expected_revision < 0 then raise exception 'INVALID_REVISION'; end if;
 if p_expected_revision = 0 then
  return query insert into public.volleyworld_saves as s (user_id,state,revision) values(v_uid,p_state,1) on conflict (user_id) do nothing returning s.revision,s.updated_at;
 else
  return query update public.volleyworld_saves as s set state=p_state,revision=s.revision+1,updated_at=clock_timestamp() where s.user_id=v_uid and s.revision=p_expected_revision returning s.revision,s.updated_at;
 end if;
 get diagnostics v_count = row_count;
 if v_count = 0 then raise exception 'SAVE_CONFLICT' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.save_volleyworld(jsonb,bigint) from public, anon;
grant execute on function public.save_volleyworld(jsonb,bigint) to authenticated;
commit;
