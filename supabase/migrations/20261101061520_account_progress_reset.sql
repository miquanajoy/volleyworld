-- User-authorized reset of playing data only. Authentication is preserved.
create table public.volleyworld_data_resets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reset_at timestamptz not null default now()
);
alter table public.volleyworld_data_resets enable row level security;
revoke all on public.volleyworld_data_resets from anon,authenticated;
grant select on public.volleyworld_data_resets to authenticated;
create policy reset_read_own on public.volleyworld_data_resets for select to authenticated using ((select auth.uid())=user_id);

create function public.volleyworld_reset_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare j jsonb:=to_jsonb(new); s jsonb; cutoff timestamptz; born timestamptz;
begin
 select reset_at into cutoff from public.volleyworld_data_resets where user_id=new.user_id;
 if cutoff is null then return new;end if;
 s:=coalesce(j->'state',j->'snapshot');
 born:=coalesce(s->>'seasonCreatedAt',s->>'createdAt',j->>'created_at')::timestamptz;
 if born is null or born<cutoff then raise exception 'DATA_RESET: old progress cannot be restored';end if;
 return new;
end $$;
revoke all on function public.volleyworld_reset_guard() from public,anon;
grant execute on function public.volleyworld_reset_guard() to authenticated;
do $$ declare t text;begin
 foreach t in array array['volleyworld_saves','volleyworld_seasons','volleyworld_full_seasons','volleyworld_nations_seasons','volleyworld_challenger_seasons'] loop
  execute format('create trigger z_reset_guard before insert or update on public.%I for each row execute function public.volleyworld_reset_guard()',t);
 end loop;
end $$;
-- Owner-authorized reset rows and DELETE statements were executed administratively
-- for the verified accounts, separately from this reusable schema migration.
-- Never publish account identifiers or addresses in migration source.
