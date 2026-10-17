-- Replace __FRESH__ and __COMPLETE__ with generated snapshots from the actual engine.
-- Fixtures and every write are rolled back. No existing player's rows are touched.
begin;
insert into auth.users(id,aud,role,email) values
('77777777-7777-4777-8777-777777777777','authenticated','authenticated','full-test-a@example.invalid'),
('88888888-8888-4888-8888-888888888888','authenticated','authenticated','full-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',true);
do $$
declare fresh jsonb:='__FRESH__'::jsonb; complete jsonb:='__COMPLETE__'::jsonb; partial jsonb; row record; blocked boolean; invalid jsonb;
begin
 if not public.volleyworld_full_state_valid(fresh) or not public.volleyworld_full_state_valid(complete) then raise exception 'FAIL generated state validation';end if;
 select * into row from public.save_volleyworld_full_season(fresh,0);
 if row.revision<>1 or (select played from public.volleyworld_full_seasons)<>0 then raise exception 'FAIL initial save';end if;
 partial:=jsonb_set(fresh,'{regions,CEV,rounds,0,0,sets}',complete#>'{regions,CEV,rounds,0,0,sets}');
 select * into row from public.save_volleyworld_full_season(partial,1);
 if row.revision<>2 or (select played from public.volleyworld_full_seasons)<>1 then raise exception 'FAIL partial save';end if;
 blocked:=false;begin perform public.save_volleyworld_full_season(partial,1);exception when others then if sqlerrm like '%SAVE_CONFLICT%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL stale revision accepted';end if;
 invalid:=jsonb_set(fresh,'{world}',complete->'world');
 if public.volleyworld_full_state_valid(invalid) then raise exception 'FAIL early world allowed';end if;
 blocked:=false;begin perform public.save_volleyworld_full_season(invalid,2);exception when others then if sqlerrm like '%INVALID_FULL_SEASON%' then blocked:=true;else raise;end if;end;
 if not blocked or (select revision from public.volleyworld_full_seasons)<>2 then raise exception 'FAIL invalid state rollback';end if;
 invalid:=jsonb_set(fresh,'{regions,CEV,rounds,0,0,sets}','[[25,24],[25,20],[25,20]]');
 if public.volleyworld_full_state_valid(invalid) then raise exception 'FAIL invalid set score';end if;
 select * into row from public.save_volleyworld_full_season(complete,2);
 if row.revision<>3 or (select played from public.volleyworld_full_seasons)<>1315 or (select status from public.volleyworld_full_seasons)<>'completed' or (select jsonb_array_length(podium) from public.volleyworld_full_seasons)<>3 then raise exception 'FAIL full completion';end if;
 select * into row from public.save_volleyworld_full_season(complete,3);
 if row.revision<>3 then raise exception 'FAIL identical completed save must be idempotent';end if;
 invalid:=jsonb_set(complete,'{world,bracket,final,0,sets}','[[25,9],[25,9],[25,9]]');
 blocked:=false;begin perform public.save_volleyworld_full_season(invalid,3);exception when others then if sqlerrm like '%SAVE_CONFLICT%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL completed history mutated';end if;
 blocked:=false;begin update public.volleyworld_full_seasons set user_id='88888888-8888-4888-8888-888888888888',revision=4;exception when others then blocked:=true;end;
 if not blocked then raise exception 'FAIL reassigned owner';end if;
 blocked:=false;begin delete from public.volleyworld_full_seasons;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL delete grant';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.volleyworld_full_seasons)<>0 then raise exception 'FAIL cross-account read';end if;
end $$;
set local role anon;
do $$ declare blocked boolean:=false;begin
 begin perform * from public.volleyworld_full_seasons;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL anonymous read';end if;
 blocked:=false;begin perform public.save_volleyworld_full_season('{}',0);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL anonymous RPC';end if;
end $$;
reset role;
rollback;
select 'PASS Full Season SQL: fresh/partial/1315-match saves, revision CAS, gate, invalid scores, immutable completion, owner isolation, denied reassignment/delete/anonymous access; fixtures rolled back.' as result;
