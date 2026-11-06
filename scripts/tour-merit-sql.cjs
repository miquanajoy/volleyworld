// Prepare reviewable SQL from the same merit/legacy snapshots exercised by TypeScript.
// This script writes files only. It never connects to a database.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
function load(dir) {
  const index = path.join(dir, "index.json");
  if (!fs.existsSync(index)) return [];
  return JSON.parse(fs.readFileSync(index)).map((f) =>
    JSON.parse(fs.readFileSync(path.join(dir, f.file))),
  );
}
const fixtures = load(".test-build/tour-merit-fixtures"),
  legacy = load(".test-build/tour-fixtures");
assert(
  fixtures.length,
  "Run build-test.cjs and tests/features/tour-merit.cjs first",
);
const T = require("../.test-build/tour-engine.js");
const clone = (value) => JSON.parse(JSON.stringify(value));
const extra = [],
  partial = T.freshMeritTour(77);
for (let stage = 0; stage < 8; stage++) {
  const available = T.batch(partial).find((m) => !m.sets);
  assert(available, "No match available for partial stage " + stage);
  T.recordScore(partial, available.id, [
    [25, 20],
    [25, 20],
    [25, 20],
  ]);
  assert(T.validTour(partial), "Partial JS state " + stage);
  extra.push({
    key: "partial-" + stage,
    expected: true,
    state: clone(partial),
  });
  if ([5, 6, 7].includes(stage)) {
    let step = 0;
    while (!T.stageDone(partial)) {
      T.simulateBatch(partial);
      assert(T.validTour(partial));
      extra.push({
        key: `batch-${stage}-${step++}`,
        expected: true,
        state: clone(partial),
      });
    }
  } else T.finishStage(partial);
  T.nextStage(partial);
}
const at6 = fixtures.find((f) => f.key === "stage-6").state;
for (const [key, corrupt] of [
  [
    "duplicate-automatic",
    (s) => (s.worldcup.automatic[1] = s.worldcup.automatic[0]),
  ],
  [
    "extra-automatic",
    (s) =>
      s.worldcup.automatic.push(
        s.roster.find((id) => !s.worldcup.automatic.includes(id)),
      ),
  ],
  ["missing-automatic", (s) => (s.worldcup.automatic = null)],
  [
    "automatic-in-regional-seeds",
    (s) => (s.worldcup.regions.CEV.playoff.seeds[0] = s.worldcup.automatic[0]),
  ],
  ["playoff-before-league-end", (s) => (s.stage = 5)],
]) {
  const state = clone(at6);
  corrupt(state);
  assert(!T.validTour(state), key);
  extra.push({ key, expected: false, state });
}
const legacyFresh = T.freshTour(90),
  meritFresh = T.freshMeritTour(90);
fs.writeFileSync(
  ".test-build/tour-merit-extra-fixtures.json",
  JSON.stringify(extra),
);
fs.writeFileSync(
  ".test-build/tour-merit-format-fixtures.json",
  JSON.stringify({ legacyFresh, meritFresh }),
);
const quote = (s) => "'" + JSON.stringify(s).replaceAll("'", "''") + "'::jsonb";
const checks = [
  ...fixtures,
  ...extra,
  ...legacy.map((f) => ({ ...f, key: "legacy-" + f.key })),
]
  .map(
    (f) =>
      `do $$ begin assert public.volleyworld_tour_state_valid(${quote(f.state)}) is ${f.expected},'${f.key}';end $$;`,
  )
  .join("\n");
fs.writeFileSync(
  ".test-build/tour-merit-readonly.sql",
  checks +
    `\nselect '${fixtures.length + extra.length} merit + ${legacy.length} legacy parity fixtures passed' result;\n`,
);
const sequence = fixtures
  .filter((f) => f.expected && (f.key === "fresh" || /^stage-/.test(f.key)))
  .map((f) => f.state);
assert.equal(
  sequence.length,
  9,
  "Need fresh and all eight calendar transitions",
);
fs.writeFileSync(
  ".test-build/tour-merit-verification.sql",
  `do $$
declare fixtures jsonb:=${quote(sequence)}; s jsonb; actor uuid; other_actor uuid; rev bigint:=0; n integer; bad jsonb; old_fresh jsonb:=${quote(legacyFresh)}; new_fresh jsonb:=${quote(meritFresh)}; fmt_rev bigint;
begin
 select id into actor from auth.users order by created_at limit 1;
 select id into other_actor from auth.users where id<>actor order by created_at limit 1;
 assert actor is not null and other_actor is not null,'Need two local test accounts';
 select coalesce(max(season_number),0)+1 into n from public.volleyworld_tour_seasons where user_id=actor;
 begin
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('role','authenticated',true);
 for s in select value from jsonb_array_elements(fixtures) loop
  s:=jsonb_set(s,'{seasonNumber}',to_jsonb(n));
  select revision into rev from public.save_volleyworld_tour_season(s,rev);
 end loop;
 assert rev=9,'fresh and eight transitions use CAS';
 assert (select played=948 and total_matches=948 and status='completed' and jsonb_array_length(podium)=3 and jsonb_array_length(honours->'league')=3 and jsonb_array_length(honours->'challenger')=3 and jsonb_array_length(honours->'worldcup')=3 from public.volleyworld_tour_seasons where user_id=actor and season_id=s->>'seasonId'),'derived merit metadata';
 begin perform public.save_volleyworld_tour_season(s,0);raise exception 'stale accepted';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;
 bad:=jsonb_set(s,'{league,tie}',(select jsonb_agg(value order by ord desc) from jsonb_array_elements(s->'league'->'tie') with ordinality q(value,ord)));
 assert public.volleyworld_tour_state_valid(bad),'different but valid completed snapshot';
 begin perform public.save_volleyworld_tour_season(bad,rev);raise exception 'completed overwritten';exception when raise_exception then if sqlerrm not like 'SAVE_CONFLICT%' then raise;end if;end;

 old_fresh:=jsonb_set(old_fresh,'{seasonNumber}',to_jsonb(n+1));
 select revision into fmt_rev from public.save_volleyworld_tour_season(old_fresh,0);
 assert (select total_matches=964 and state=old_fresh from public.volleyworld_tour_seasons where user_id=actor and season_id=old_fresh->>'seasonId'),'legacy snapshot and964 metadata unchanged';
 new_fresh:=jsonb_set(jsonb_set(jsonb_set(new_fresh,'{seasonId}',old_fresh->'seasonId'),'{seasonNumber}',to_jsonb(n+1)),'{createdAt}',old_fresh->'createdAt');
 assert public.volleyworld_tour_state_valid(new_fresh),'merit replacement is individually valid';
 begin perform public.save_volleyworld_tour_season(new_fresh,fmt_rev);raise exception 'legacy format changed';exception when raise_exception then if sqlerrm not like 'IMMUTABLE_TOUR%' then raise;end if;end;
 assert (select state=old_fresh from public.volleyworld_tour_seasons where user_id=actor and season_id=old_fresh->>'seasonId'),'failed format conversion preserves old snapshot';
 perform set_config('request.jwt.claim.sub',other_actor::text,true);
 assert not exists(select 1 from public.volleyworld_tour_seasons where user_id=actor),'RLS hides other account';
 begin update public.volleyworld_tour_seasons set user_id=other_actor where user_id=actor;exception when insufficient_privilege then null;end;
 perform set_config('role','anon',true);
 begin perform count(*) from public.volleyworld_tour_seasons;raise exception 'anonymous read allowed';exception when insufficient_privilege then null;end;
 raise exception 'MERIT_ROLLBACK_OK';
 exception when raise_exception then if sqlerrm<>'MERIT_ROLLBACK_OK' then raise;end if;end;
end $$;
select 'PASS merit CAS,948 derived metadata,immutable completion,cross-account RLS,anonymous denial;rolled back' result;
`,
);
console.log(
  `Prepared ${fixtures.length + extra.length} merit and ${legacy.length} legacy SQL parity fixtures; rollback-only CAS/RLS verification`,
);
