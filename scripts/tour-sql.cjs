// Run build-test + tour.cjs first. Test queries never retain playing data.
const fs = require("node:fs"),
  path = require("node:path");
const dir = ".test-build/tour-fixtures",
  entries = JSON.parse(fs.readFileSync(path.join(dir, "index.json")));
const fixtures = entries.map((f) =>
  JSON.parse(fs.readFileSync(path.join(dir, f.file))),
);
const quote = (s) => "'" + JSON.stringify(s).replaceAll("'", "''") + "'::jsonb";
const checks = fixtures
  .map(
    (f) =>
      `do $$ begin assert public.volleyworld_tour_state_valid(${quote(f.state)}) is ${f.expected},'${f.key}';end $$;`,
  )
  .join("\n");
fs.writeFileSync(
  ".test-build/tour-readonly.sql",
  checks +
    `\nselect '${fixtures.filter((f) => f.expected).length} valid / ${fixtures.filter((f) => !f.expected).length} invalid Tour fixtures passed' result;\n`,
);
const sequence = fixtures
  .filter((f) => f.expected && (f.key === "fresh" || /^stage-/.test(f.key)))
  .map((f) => f.state);
fs.writeFileSync(
  ".test-build/tour-verification.sql",
  `do $$ declare fixtures jsonb:=${quote(sequence)}; s jsonb; actor uuid; other_actor uuid; rev bigint:=0; n integer; bad jsonb; begin
 select id into actor from auth.users order by created_at limit 1;
 select id into other_actor from auth.users where id<>actor limit 1;
 assert actor is not null and other_actor is not null;
 select coalesce(max(season_number),0)+1 into n from public.volleyworld_tour_seasons where user_id=actor;
 begin
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('role','authenticated',true);
 for s in select value from jsonb_array_elements(fixtures) loop
  s:=jsonb_set(s,'{seasonNumber}',to_jsonb(n));
  select revision into rev from public.save_volleyworld_tour_season(s,rev);
 end loop;
 assert rev=9,'all eight transitions stored with CAS';
 assert (select played=968 and status='completed' and jsonb_array_length(podium)=3 from public.volleyworld_tour_seasons where user_id=actor and season_id=s->>'seasonId'),'server derives correct completed metadata';
 begin perform public.save_volleyworld_tour_season(s,0);raise exception 'stale accepted';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 bad:=jsonb_set(s,'{league,tie}',(select jsonb_agg(value order by ord desc) from jsonb_array_elements(s->'league'->'tie') with ordinality q(value,ord)));
 begin perform public.save_volleyworld_tour_season(bad,rev);raise exception 'completed overwritten';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',other_actor::text,true);
 assert not exists(select 1 from public.volleyworld_tour_seasons where user_id=actor),'RLS hides other account';
 begin update public.volleyworld_tour_seasons set user_id=other_actor where user_id=actor;exception when insufficient_privilege then null;end;
 perform set_config('role','anon',true);
 begin perform count(*) from public.volleyworld_tour_seasons;raise exception 'anon read allowed';exception when insufficient_privilege then null;end;
 raise exception 'TOUR_ROLLBACK_OK';
 exception when raise_exception then if sqlerrm<>'TOUR_ROLLBACK_OK' then raise;end if;end;
end $$;
select 'PASS Tour CAS all stages, 968-match derived metadata, stale conflicts, immutable completion, cross-account RLS, anon denied; rolled back' result;`,
);
console.log("Generated Tour readonly and rollback-only verification SQL");
