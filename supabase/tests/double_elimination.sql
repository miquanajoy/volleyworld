-- Server contract test. Minimal snapshots deliberately exercise the JSON/RPC
-- storage contract; full tournament validity is covered by test-double.cjs.
begin;
insert into auth.users(id,aud,role,email) values
('55555555-5555-4555-8555-555555555555','authenticated','authenticated','double-test-a@example.invalid'),
('66666666-6666-4666-8666-666666666666','authenticated','authenticated','double-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
do $$
declare ar jsonb; r record; blocked boolean:=false;
begin
 ar:='[{"season_id":"double-test-reset","season_number":1,"status":"completed","created_at":"2026-10-16T00:00:00Z","ended_at":"2026-10-16T01:00:00Z","podium":[],"played":531,"snapshot":{"version":1,"seasonId":"double-test-reset","seasonNumber":1,"playoffFormat":"double","bracket":{"gf":[{"id":"G0"}],"reset":[{"id":"G1"}]}}},{"season_id":"double-test-no-reset","season_number":2,"status":"completed","created_at":"2026-10-16T00:00:00Z","ended_at":"2026-10-16T01:00:00Z","podium":[],"played":530,"snapshot":{"version":1,"seasonId":"double-test-no-reset","seasonNumber":2,"playoffFormat":"double","bracket":{"gf":[{"id":"G0"}],"reset":[]}}}]'::jsonb;
 select * into r from public.save_volleyworld_with_history('{"version":1,"seasonId":"double-test-active","seasonNumber":3,"playoffFormat":"double"}',0,ar);
 if r.revision<>1 or (select count(*) from public.volleyworld_seasons)<>2 then raise exception 'FAIL double archives did not save atomically';end if;
 if (select max(played) from public.volleyworld_seasons)<>531 or (select min(played) from public.volleyworld_seasons)<>530 then raise exception 'FAIL expanded match limits';end if;
 if exists(select 1 from public.volleyworld_seasons where snapshot->>'playoffFormat'<>'double') then raise exception 'FAIL lost format metadata';end if;
 if (select jsonb_array_length(snapshot->'bracket'->'reset') from public.volleyworld_seasons where season_number=1)<>1 then raise exception 'FAIL reset not preserved';end if;
 begin
  perform public.save_volleyworld_with_history('{"version":1,"seasonId":"should-roll-back","seasonNumber":4}',1,
  '[{"season_id":"double-test-invalid","season_number":4,"status":"cancelled","created_at":"2026-10-16T00:00:00Z","ended_at":"2026-10-16T01:00:00Z","podium":[],"played":532,"snapshot":{"version":1,"seasonId":"double-test-invalid","seasonNumber":4}}]');
 exception when check_violation then blocked:=true;end;
 if not blocked then raise exception 'FAIL allowed more than 531 games';end if;
 if (select revision from public.volleyworld_saves)<>1 or (select count(*) from public.volleyworld_seasons)<>2 then raise exception 'FAIL invalid archive did not roll back active save';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.volleyworld_seasons)<>0 then raise exception 'FAIL cross-account double history read';end if;
end $$;
reset role;
rollback;
select 'PASS: 530/531-game archive roundtrip, reset and format JSON preservation, atomic rejection at 532 games, owner isolation; fixtures rolled back.' as result;
