-- Generated fixture JSON is supplied by scripts/challenger-sql.cjs.
-- All trial writes occur inside a subtransaction that always rolls back.
do $$
declare fixtures jsonb:=__FIXTURE_JSON__;f record;actor uuid:=gen_random_uuid();other_actor uuid:=gen_random_uuid();rev bigint:=0;s jsonb;n integer;bad jsonb;
begin
 begin
 for f in select * from jsonb_to_recordset(fixtures) as t(seq integer,key text,state jsonb,expected boolean) order by seq loop
  assert public.volleyworld_challenger_state_valid(f.state)=f.expected,'JS/SQL parity: '||f.key;
 end loop;
 assert not public.volleyworld_challenger_state_valid(null),'SQL null rejected';
 assert not public.volleyworld_challenger_state_valid('{}'::jsonb),'missing schema rejected';
 select user_id into actor from public.volleyworld_full_seasons limit 1;
 assert actor is not null,'Need an existing owner for FK validation';
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('role','authenticated',true);
 for f in select * from jsonb_to_recordset(fixtures) as t(seq integer,key text,state jsonb,expected boolean) where expected order by seq loop
  select revision into rev from public.save_volleyworld_challenger_season(f.state,rev);
  assert rev=f.seq+1,'CAS acknowledgement: '||f.key;
 end loop;
 select state into s from jsonb_to_recordset(fixtures) as t(key text,state jsonb) where key='playoff-final';
 assert (select played=82 and status='completed' and jsonb_array_length(podium)=3 from public.volleyworld_challenger_seasons where user_id=actor and season_id=s->>'seasonId'),'derived completed metadata';
 perform public.save_volleyworld_challenger_season(s,rev);
 begin perform public.save_volleyworld_challenger_season(s,0);raise exception 'stale accepted';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 bad:=jsonb_set(s,'{tie}',(select jsonb_agg(value order by ord desc) from jsonb_array_elements(s->'tie') with ordinality t(value,ord)));
 assert public.volleyworld_challenger_state_valid(bad),'alternate valid completed snapshot';
 begin perform public.save_volleyworld_challenger_season(bad,rev);raise exception 'immutable overwritten';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',other_actor::text,true);
 select count(*) into n from public.volleyworld_challenger_seasons;assert n=0,'cross-account SELECT denied';
 assert (select qual like '%auth.uid%' and with_check like '%auth.uid%' from pg_policies where schemaname='public' and tablename='volleyworld_challenger_seasons' and policyname='challenger_update_owner'),'UPDATE ownership checks';
 perform set_config('role','postgres',true);
 assert not has_table_privilege('anon','public.volleyworld_challenger_seasons','SELECT'),'anon table denied';
 assert not has_function_privilege('anon','public.save_volleyworld_challenger_season(jsonb,bigint)','EXECUTE'),'anon RPC denied';
 assert (select relrowsecurity from pg_class where oid='public.volleyworld_challenger_seasons'::regclass),'RLS enabled';
 raise exception 'CHALLENGER_TEST_ROLLBACK_OK';
 exception when raise_exception then if sqlerrm<>'CHALLENGER_TEST_ROLLBACK_OK' then raise;end if;end;
end $$;
select 'PASS Challenger SQL: 17 valid + 12 invalid JS parity fixtures, CAS on all phases, derived 82-match completion, immutable history, cross-account RLS and anonymous denial; rollback only' as verification;
