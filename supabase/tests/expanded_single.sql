-- Generate __STATE__ from the current engine: fresh() + playoffEntry=top16 + finishAll().
-- Uses only a disposable account and rolls back all writes.
begin;
insert into auth.users(id,aud,role,email) values
('99999999-9999-4999-8999-999999999999','authenticated','authenticated','expanded-single-test@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}',true);
do $$
declare s jsonb := '__STATE__'::jsonb; result record; blocked boolean := false;
begin
 select * into result from public.save_volleyworld(s,0);
 if result.revision<>1 or (select state->>'playoffEntry' from public.volleyworld_saves)<>'top16' then raise exception 'FAIL active top16 save';end if;
 select * into result from public.save_volleyworld_with_history(s,1,jsonb_build_array(jsonb_build_object(
 'season_id',s->>'seasonId','season_number',(s->>'seasonNumber')::integer,'status','completed',
 'created_at',s->>'seasonCreatedAt','ended_at',s->>'seasonCreatedAt','podium','__PODIUM__'::jsonb,'played',520,'snapshot',s)));
 if result.revision<>2 or (select played from public.volleyworld_seasons)<>520 or (select jsonb_array_length(snapshot#>'{bracket,r20}') from public.volleyworld_seasons)<>4 then raise exception 'FAIL 520-match archive';end if;
 begin perform public.save_volleyworld(s,1);exception when others then if sqlerrm like '%SAVE_CONFLICT%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL stale CAS accepted';end if;
end;
$$;
rollback;
select count(*) as remaining_test_users from auth.users where id='99999999-9999-4999-8999-999999999999';
