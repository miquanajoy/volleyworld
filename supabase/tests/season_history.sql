begin;
insert into auth.users(id,aud,role,email) values
('33333333-3333-4333-8333-333333333333','authenticated','authenticated','season-test-a@example.invalid'),
('44444444-4444-4444-8444-444444444444','authenticated','authenticated','season-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$
declare r record; blocked boolean; ar jsonb;
begin
 ar:='[{"season_id":"test-season-1","season_number":1,"status":"completed","created_at":"2026-10-16T00:00:00Z","ended_at":"2026-10-16T01:00:00Z","podium":[],"played":516,"snapshot":{"version":1,"seasonId":"test-season-1","seasonNumber":1}}]'::jsonb;
 select * into r from public.save_volleyworld_with_history('{"version":1,"seasonId":"test-season-1","seasonNumber":1}',0,'[]');
 if r.revision<>1 then raise exception 'FAIL initial active save'; end if;
 select * into r from public.save_volleyworld_with_history('{"version":1,"seasonId":"test-season-2","seasonNumber":2}',1,ar);
 if r.revision<>2 or (select count(*) from public.volleyworld_seasons)<>1 then raise exception 'FAIL atomic rollover'; end if;
 if (select snapshot->>'seasonId' from public.volleyworld_seasons)<>'test-season-1' then raise exception 'FAIL archive snapshot'; end if;
 perform public.save_volleyworld_with_history('{"version":1,"seasonId":"test-season-2","seasonNumber":2}',2,ar);
 if (select count(*) from public.volleyworld_seasons)<>1 then raise exception 'FAIL duplicate archive'; end if;
 blocked:=false;
 begin perform public.save_volleyworld_with_history('{"version":1,"seasonId":"test-bad","seasonNumber":99}',3,jsonb_set(ar,'{0,snapshot,tampered}','true'));
 exception when sqlstate 'P0001' then if SQLERRM like 'SAVE_CONFLICT%' then blocked:=true; else raise; end if; end;
 if not blocked then raise exception 'FAIL immutable archive'; end if;
 if (select revision from public.volleyworld_saves)<>3 or (select state->>'seasonId' from public.volleyworld_saves)<>'test-season-2' then raise exception 'FAIL failed archive did not roll back active write'; end if;
 blocked:=false;
 begin perform public.save_volleyworld_with_history('{"version":1,"seasonId":"test-bad","seasonNumber":99}',1,ar);
 exception when sqlstate 'P0001' then if SQLERRM like 'SAVE_CONFLICT%' then blocked:=true; else raise; end if; end;
 if not blocked or (select count(*) from public.volleyworld_seasons)<>1 then raise exception 'FAIL stale rollover'; end if;
 blocked:=false;begin update public.volleyworld_seasons set status='cancelled';exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL archive update privilege';end if;
 blocked:=false;begin delete from public.volleyworld_seasons;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL archive delete privilege';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
do $$ declare blocked boolean:=false;begin
 if (select count(*) from public.volleyworld_seasons)<>0 then raise exception 'FAIL cross-account history read';end if;
 begin insert into public.volleyworld_seasons(user_id,season_id,season_number,status,created_at,ended_at,podium,played,snapshot)values('33333333-3333-4333-8333-333333333333','forged',2,'cancelled',now(),now(),'[]',0,'{"version":1}');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL forged history ownership';end if;
end $$;
set local role anon;
do $$ declare blocked boolean:=false;begin
 begin perform * from public.volleyworld_seasons;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL anon history read';end if;
 blocked:=false;begin perform public.save_volleyworld_with_history('{"version":1}',0,'[]');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL anon rollover';end if;
end $$;
reset role;
rollback;
select 'PASS: archive roundtrip, atomic rollover, duplicate retry, immutable history, stale-device protection, rollback on archive conflict, owner-only history, no archive edits/deletes, signed-out denial; fixtures rolled back.' as result;
