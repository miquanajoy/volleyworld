-- Prefix this script with a transaction and temporary nations_fixtures(key,state).
-- Fixtures: empty and complete share identity/draw; child uses the complete result.
-- scripts/nations-sql-fixtures.cjs generates the exact payload and tests.
do $$
declare s jsonb; p jsonb; c jsonb; bad jsonb; actor uuid:=gen_random_uuid(); other_actor uuid:=gen_random_uuid(); rev bigint; sid text; n integer;
begin
 select state into s from nations_fixtures where key='empty';select state into p from nations_fixtures where key='complete';select state into c from nations_fixtures where key='child';
 assert public.volleyworld_nations_state_valid(s),'empty state';assert public.volleyworld_nations_state_valid(p),'complete state';assert public.volleyworld_nations_state_valid(c),'child state';assert public.volleyworld_nations_transition(p,c),'promotion parity';
 assert not public.volleyworld_nations_state_valid(jsonb_set(s,'{divisions,A,groups,0,rounds,3,0,a}',s->'divisions'->'A'->'groups'->0->'rounds'->0->0->'a')),'mirror mismatch rejected';
 assert not public.volleyworld_nations_state_valid(jsonb_set(s,'{divisions,A,groups,0,rounds,0,0,sets}','[[25,24],[25,20],[25,20]]')),'bad BO5 rejected';
 bad:=jsonb_set(p,'{playoff,qf,0,a}',to_jsonb(public.volleyworld_nations_winner(p->'playoff'->'qf'->1)));
 assert not public.volleyworld_nations_state_valid(bad),'malformed bracket rejected';
 assert not public.volleyworld_nations_transition(s,c),'incomplete parent rejected';
 insert into auth.users(id,email) values(actor,actor::text||'@nations.invalid'),(other_actor,other_actor::text||'@nations.invalid');
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('role','authenticated',true);
 select revision into rev from public.save_volleyworld_nations_season(s,0);assert rev=1,'initial CAS';
 begin perform public.save_volleyworld_nations_season(s,0);raise exception 'stale accepted';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 begin perform public.save_volleyworld_nations_season(c,0);raise exception 'premature child accepted';exception when raise_exception then if sqlerrm not like 'INVALID_NATIONS_TRANSITION%' then raise;end if;end;
 select revision into rev from public.save_volleyworld_nations_season(p,1);assert rev=2,'completed CAS';
 assert (select played=200 and status='completed' and jsonb_array_length(podium)=3 from public.volleyworld_nations_seasons where season_id=p->>'seasonId'),'derived progress';
 select revision into rev from public.save_volleyworld_nations_season(p,2);assert rev=2,'completed retry idempotent';
 begin perform public.save_volleyworld_nations_season(s,2);raise exception 'immutable accepted';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 select revision into rev from public.save_volleyworld_nations_season(c,0);assert rev=1,'next-cycle CAS';
 bad:=jsonb_set(jsonb_set(c,'{seasonId}',to_jsonb(gen_random_uuid()::text)),'{seasonNumber}','3');
 begin perform public.save_volleyworld_nations_season(bad,0);raise exception 'duplicate cycle accepted';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',other_actor::text,true);
 select count(*) into n from public.volleyworld_nations_seasons;assert n=0,'other-user RLS';
 begin perform public.save_volleyworld_nations_season(c,0);raise exception 'other parent accepted';exception when raise_exception then if sqlerrm not like 'INVALID_NATIONS_TRANSITION%' then raise;end if;end;
 perform set_config('role','postgres',true);
 assert not has_table_privilege('anon','public.volleyworld_nations_seasons','SELECT'),'anon no table';assert not has_function_privilege('anon','public.save_volleyworld_nations_season(jsonb,bigint)','EXECUTE'),'anon no RPC';
 assert (select relrowsecurity from pg_class where oid='public.volleyworld_nations_seasons'::regclass),'RLS enabled';
end $$;
rollback;
