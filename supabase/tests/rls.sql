-- Run against the provisioned project with pgTAP available. Transaction rolls back all fixtures.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
insert into auth.users(id,aud,role,email) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','rls-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','rls-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select lives_ok($$ select * from public.save_volleyworld('{"version":1}'::jsonb,0) $$,'Owner can create a save');
select is((select count(*)::integer from public.volleyworld_saves),1,'Owner can read own save');
select lives_ok($$ select * from public.save_volleyworld('{"version":1,"test":true}'::jsonb,1) $$,'Matching revision can update');
select throws_ok($$ select * from public.save_volleyworld('{"version":1}'::jsonb,1) $$,'P0001','SAVE_CONFLICT','Stale write is rejected');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select is((select count(*)::integer from public.volleyworld_saves),0,'Other account cannot read save');
select lives_ok($$ update public.volleyworld_saves set revision=99 where user_id='11111111-1111-4111-8111-111111111111' $$,'Cross-account update is filtered');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select is((select revision::integer from public.volleyworld_saves),2,'Cross-account update did not change owner save');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select throws_ok($$ insert into public.volleyworld_saves(user_id,state) values('11111111-1111-4111-8111-111111111111','{"version":1}') $$,'42501',null,'Other account cannot insert under owner');
set local role anon;
select throws_ok($$ select * from public.volleyworld_saves $$,'42501',null,'Signed out cannot read');
select throws_ok($$ select * from public.save_volleyworld('{"version":1}'::jsonb,0) $$,'42501',null,'Signed out cannot write');
reset role;
select * from finish();
rollback;
