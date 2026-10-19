-- All synthetic users and progress are rolled back.
do $$
declare f record;s jsonb;p jsonb;c jsonb;bad jsonb;r text;b jsonb;seeds jsonb;actor uuid:=gen_random_uuid();other_actor uuid:=gen_random_uuid();rev bigint;n integer;
begin
 for f in select * from qualification_fixtures loop
  assert public.volleyworld_full_state_valid(f.state),'valid fixture: '||f.key;
 end loop;
 select state into s from qualification_fixtures where key='fresh';select state into p from qualification_fixtures where key='partial';select state into c from qualification_fixtures where key='complete';
 foreach r in array array['CEV','AVC','NORCECA','CAVB'] loop
  assert public.volleyworld_qual_seeds(c->'regions'->r)=c->'regions'->r->'playoff'->'seeds','normalized regional seeds: '||r;
  assert not public.volleyworld_full_state_valid(jsonb_set(c,array['regions',r,'playoff','seeds','0'],to_jsonb('INVALID'::text))),'seed corruption';
 end loop;
 assert public.volleyworld_qual_pool(c)=(select jsonb_agg(value order by po,ord) from jsonb_array_elements(c->'intercontinental'->'pots') with ordinality q(pot,po) cross join lateral jsonb_array_elements(pot) with ordinality x(value,ord)),'27-team normalized pool parity';
 bad:=jsonb_set(c,'{intercontinental,branches,0,rounds,1,0,b}',c->'intercontinental'->'branches'->0->'seeds'->8);
 assert not public.volleyworld_full_state_valid(bad),'wrong bye predecessor';
 assert not public.volleyworld_full_state_valid(jsonb_set(c,'{intercontinental,branches,0,rounds,0,0,resultOrder}',c->'regions'->'CEV'->'rounds'->0->0->'resultOrder')),'global result-order collision';
 bad:=jsonb_set(p,'{world}',c->'world');assert not public.volleyworld_full_state_valid(bad),'World Cup before third Play-in final rejected';
 assert not public.volleyworld_full_state_valid(s-'intercontinental'),'missing Play-in state';
 insert into auth.users(id,email) values(actor,actor::text||'@qualification.invalid'),(other_actor,other_actor::text||'@qualification.invalid');
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('role','authenticated',true);
 select revision into rev from public.save_volleyworld_full_season(s,0);assert rev=1,'initial CAS';
 begin perform public.save_volleyworld_full_season(s,0);raise exception 'stale accepted';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 select revision into rev from public.save_volleyworld_full_season(p,1);assert rev=2,'partial Play-in save';
 assert (select played=313 and status='active' and podium='[]'::jsonb from public.volleyworld_full_seasons where user_id=actor and season_id=s->>'seasonId'),'313-match progress includes regional playoffs and Play-in';
 select revision into rev from public.save_volleyworld_full_season(c,2);assert rev=3,'complete CAS';
 assert (select played=366 and status='completed' and jsonb_array_length(podium)=3 from public.volleyworld_full_seasons where user_id=actor and season_id=s->>'seasonId'),'366-match derived completion';
 select revision into rev from public.save_volleyworld_full_season(c,3);assert rev=3,'completed retry';
 for f in select * from qualification_fixtures where key in ('legacy','groups') loop
  select revision into rev from public.save_volleyworld_full_season(f.state,0);assert rev=1,'old format still writable';
  assert (select played=case f.key when 'legacy' then 1315 else 543 end and status='completed' from public.volleyworld_full_seasons where user_id=actor and season_id=f.state->>'seasonId'),'legacy metadata preserved';
 end loop;
 perform set_config('request.jwt.claim.sub',other_actor::text,true);select count(*) into n from public.volleyworld_full_seasons;assert n=0,'cross-account RLS';
 perform set_config('role','postgres',true);
 assert not has_function_privilege('anon','public.save_volleyworld_full_season(jsonb,bigint)','EXECUTE'),'anonymous RPC blocked';
end $$;
rollback;
