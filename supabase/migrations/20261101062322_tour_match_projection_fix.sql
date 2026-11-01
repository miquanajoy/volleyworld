create or replace function public.volleyworld_tour_matches(s jsonb) returns setof jsonb language sql immutable security invoker set search_path='' as $$
 select value from (select value from jsonb_path_query(s,'$.league.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.league.playin[*]') q(value)
 union all select value from jsonb_path_query(s,'$.league.bracket.*[*]') q(value) where jsonb_typeof(value)='object'
 union all select value from jsonb_path_query(s,'$.challenger.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.challenger.bracket.*[*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.regions.*.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.regions.*.playoff.rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.intercontinental.branches[*].rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.world.groups[*].rounds[*][*]') q(value)
 union all select value from jsonb_path_query(s,'$.worldcup.world.bracket.*[*]') q(value)
) all_matches where jsonb_typeof(value)='object' and value ? 'id'
$$;
