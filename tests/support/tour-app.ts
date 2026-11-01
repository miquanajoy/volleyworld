// Test-only facade for the actual single-mode application composition.
import { bootstrap } from "../../src/app/bootstrap";
import { initializeActions } from "../../src/app/actions";
import * as Tour from "../../src/features/tour/controller";
import * as Model from "../../src/features/tour/model";
import { tourCloud } from "../../src/features/tour/cloud";
import * as Account from "../../src/features/account/controller";
import { accountState } from "../../src/features/account/model";
import { applyAccountReset } from "../../src/data/repositories/account-reset";
import { store } from "../../src/app/store";
const target = globalThis as unknown as Record<string, unknown>;
bootstrap();
initializeActions();
target.__tour = { ...Tour, ...Model, tourCloud };
target.__account = { ...Account, accountState };
target.__applyAccountReset = applyAccountReset;
Object.defineProperty(target, "state", { get: () => store.state });
