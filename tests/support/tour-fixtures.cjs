// Arrange pre-career saves for cloud/account compatibility tests. New creation is
// exercised by tour-career-ui; these fixtures deliberately retain merit-v1 rules.
const T = require("../../.test-build/tour-engine.js");
function startMeritFixture(api) {
  const s = T.freshMeritTour(
      Math.max(0, ...api.model.records.map((r) => r.season_number)) + 1,
      api.model.setup?.ids || T.defaultRoster(),
    ),
    r = api.recordOf(s);
  r.dirty = true;
  api.model.records.push(r);
  api.model.selected = s.seasonId;
  api.model.setup = null;
  api.model.stage = 0;
  api.model.round = 0;
  api.persist();
  api.tourCloud.queue(r);
  api.section("journey");
  return r;
}
module.exports = { startMeritFixture };
