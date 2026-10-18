-- Fill fixtures with scripts/full-season-groups-sql.cjs. All writes are rolled back.
begin;
select set_config('volleytest.actor',gen_random_uuid()::text,true);
select set_config('volleytest.other',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email) values
(current_setting('volleytest.actor')::uuid,'authenticated','authenticated','regional-'||current_setting('volleytest.actor')||'@example.invalid'),
(current_setting('volleytest.other')::uuid,'authenticated','authenticated','regional-'||current_setting('volleytest.other')||'@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('volleytest.actor'),'role','authenticated')::text,true);
do $$
declare table_cases jsonb:='__TABLE_CASES__'; test_case jsonb; fresh jsonb:='__FRESH__'; pending jsonb:='__PENDING__'; complete jsonb:='__COMPLETE__'; legacy jsonb:='__LEGACY__';
 draft jsonb; bad jsonb; saved record; blocked boolean; r text; g jsonb; group_g jsonb; ids jsonb; rounds jsonb; row_data jsonb; filtered jsonb; j integer; n integer;
begin
 for test_case in select value from jsonb_array_elements(table_cases) loop
  if public.volleyworld_full_group_table(test_case->'group') is distinct from test_case->'expected' then raise exception 'FAIL table/H2H/lot parity';end if;
 end loop;
 if not public.volleyworld_full_state_valid(fresh) or not public.volleyworld_full_state_valid(pending) or not public.volleyworld_full_state_valid(complete) or not public.volleyworld_full_state_valid(legacy) then raise exception 'FAIL validator compatibility';end if;
 select * into saved from public.save_volleyworld_full_season(fresh,0);
 if saved.revision<>1 or (select played from public.volleyworld_full_seasons)<>0 then raise exception 'FAIL fresh';end if;
 select * into saved from public.save_volleyworld_full_season(pending,1);
 if saved.revision<>2 or (select played from public.volleyworld_full_seasons)<>489 then raise exception 'FAIL pending deciders count';end if;
 bad:=jsonb_set(pending,'{world}',complete->'world');
 if public.volleyworld_full_state_valid(bad) then raise exception 'FAIL world before deciders';end if;
 bad:=jsonb_set(complete,'{regions,AVC,decider,a}',to_jsonb(complete#>>'{regions,AVC,decider,b}'));
 if public.volleyworld_full_state_valid(bad) then raise exception 'FAIL wrong decider';end if;
 bad:=jsonb_set(fresh,'{regions,CEV,groups,0,0}',fresh#>'{regions,CEV,groups,1,0}');
 if public.volleyworld_full_state_valid(bad) then raise exception 'FAIL duplicated participant';end if;
 bad:=jsonb_set(fresh,'{regions,CEV,rounds,0,0,sets}','[[25,24],[25,20],[25,20]]');
 if public.volleyworld_full_state_valid(bad) then raise exception 'FAIL invalid set';end if;
 bad:=jsonb_set(complete,'{regions,AVC,decider,resultOrder}',complete#>'{regions,CAVB,decider,resultOrder}');
 if public.volleyworld_full_state_valid(bad) then raise exception 'FAIL duplicate result order';end if;
 draft:=jsonb_set(pending,'{regions,AVC,decider}',complete#>'{regions,AVC,decider}');
 select * into saved from public.save_volleyworld_full_season(draft,2);
 if saved.revision<>3 or (select played from public.volleyworld_full_seasons)<>490 or (select status from public.volleyworld_full_seasons)<>'active' then raise exception 'FAIL decider counted';end if;
 blocked:=false;begin perform public.save_volleyworld_full_season(draft,2);exception when others then if sqlerrm like '%SAVE_CONFLICT%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL stale revision';end if;
 select * into saved from public.save_volleyworld_full_season(complete,3);
 if saved.revision<>4 or (select played from public.volleyworld_full_seasons)<>543 or (select status from public.volleyworld_full_seasons)<>'completed' or (select jsonb_array_length(podium) from public.volleyworld_full_seasons)<>3 then raise exception 'FAIL complete metadata';end if;
 select * into saved from public.save_volleyworld_full_season(complete,4);
 if saved.revision<>4 then raise exception 'FAIL idempotence';end if;
 bad:=jsonb_set(complete,'{world,bracket,final,0,sets}','[[25,9],[25,9],[25,9]]');
 blocked:=false;begin perform public.save_volleyworld_full_season(bad,4);exception when others then if sqlerrm like '%SAVE_CONFLICT%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL immutable history';end if;
 blocked:=false;begin update public.volleyworld_full_seasons set user_id=current_setting('volleytest.other')::uuid,revision=5;exception when others then blocked:=true;end;
 if not blocked then raise exception 'FAIL owner reassignment';end if;
 blocked:=false;begin delete from public.volleyworld_full_seasons;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL deletion permissions';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('volleytest.other'),'role','authenticated')::text,true);
do $$ begin if (select count(*) from public.volleyworld_full_seasons)<>0 then raise exception 'FAIL account isolation';end if;end $$;
set local role anon;
do $$ declare blocked boolean:=false;begin
 begin perform public.save_volleyworld_full_season('{}',0);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL anonymous RPC';end if;
end $$;
reset role;
rollback;
select 'PASS grouped Full Season SQL: fresh/489/490/543 metadata, deciders/world gate, validation, CAS, immutable completion, account isolation, denied reassignment/delete/anonymous RPC; all synthetic fixtures rolled back.' as result;
