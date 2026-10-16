# VolleyWorld architecture

This is a structural refactor of main `2b77b1f3b20d53f7471c3a0d5a6bf78fd71287ff`. It keeps the existing product, tournament rules, Vietnamese copy and version-one save contract.

## Layers

| Layer        | Owns                                                                                                                   | Dependency rule                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `app`        | Composition, state, navigation, application commands, delegated DOM actions                                            | Wires feature controllers through typed `RuntimePorts`                                                |
| `domain`     | Scheduling, scoring, standings, form, qualification certificates, roster validation, single/double playoff progression | No DOM, network, SDK or storage; only domain modules and immutable team catalog                       |
| `features`   | Setup, league, match editing, playoff, seasons, account                                                                | Controllers coordinate commands; models own draft/account/history state; views create existing markup |
| `components` | Shared team/form/match markup                                                                                          | Reads explicit/displayed tournament state; never persists                                             |
| `data`       | Static teams, local/cloud repositories, backup history, version-one metadata migration, CAS write queue                | Never imports application/features/DOM                                                                |
| `shared`     | Typed DOM lookup, escaping and short feedback                                                                          | Small UI utilities                                                                                    |

The domain intentionally retains mutation of the supplied tournament object. Converting the engine to immutable state in this same change would enlarge the behavioral risk and invalidate the direct compatibility contract. Shared arrays, object shapes, result ordering and RNG call order stay stable.

## Feature boundaries

`setup` and `seasons` each separate `model.ts`, `views.ts` and `controller.ts`. `account` separates account state/configuration, rendering and coordination; repositories contain endpoint selections, filters and RPC payloads. `playoff/controller.ts` owns view switches and match dialogs; `playoff/views.ts` renders the branches and bracket tree. League simulation and league rendering are separate. Match input inspection remains in the pure scoring domain, while focus/error presentation belongs to the match editor.

The composition root is `src/app/bootstrap.ts`. It initializes the typed store, registers ports, binds forms, performs the original initial save and renders. `src/main.ts` then installs delegated actions and account lifecycle listeners. Features call application commands through ports, avoiding imports back into the application renderer. Account SDK initialization is explicit and accepts a factory for testing; production uses the pinned Supabase SDK.

Rendering keeps the existing template markup. Buttons carry declarative `data-action`, `data-arg` and `data-trigger` attributes resolved by an explicit command table. There is no `eval`, executable handler string, or production `window.V/Settings/Seasons/Cloud` API. Historical globals exist only in `tests/support/compat-app.ts`, which is absent from the production entry graph.

## Data compatibility

- Save `version` remains **1**; no database migration is introduced.
- Guest: `volleyworld-v1`; signed in: `volleyworld-user-<uid>`.
- Scoped history: active key + `-seasons`; backups: `volleyworld-backups`.
- Missing `playoffFormat` remains single elimination.
- Metadata migration preserves legacy identity and never regenerates scores, fixtures or seed draws.
- Cloud endpoints remain `volleyworld_saves`, `volleyworld_seasons` and `save_volleyworld_with_history`.
- Revision checks, immutable archive acknowledgement, failed-write retention, account epochs, explicit conflict choices and five cached acknowledged snapshots remain intact.
- Existing SQL migrations and public cloud configuration are unchanged.

`src/styles/app.css` is byte-identical to the frozen main CSS and deliberately excluded from formatting. This is a parity migration, not a visual redesign.

## Build and tests

Node.js 24, TypeScript strict/no-unused checks, Vite production build and exact dependency pins are defined in the root manifests. `dist/` is generated and ignored. Vercel and GitHub CI run `npm run check`. The Supabase SDK is a separate lazy-loaded chunk.

Frozen main files live in `tests/fixtures/main` with the exact commit and SHA-256 manifest. Legacy assertion files use a test-only bundle in `.test-build`. Differential suites run main and refactor with the same RNG, time and UUID sequence, compare JSON storage and canonical DOM, and dispatch real DOM events. Only event-handler implementation attributes are normalized. The built-module smoke test executes actual Vite ESM and the actual bundled SDK in a DOM context; it does not substitute the compatibility entry.

See `REFACTOR-VALIDATION.md` for evidence and the remaining real-browser visual gate.
