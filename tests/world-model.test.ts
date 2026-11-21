import { test } from "node:test";
import assert from "node:assert/strict";
import {
  entrance,
  destinations,
  slideMove,
  isBlocked,
  outdoorBoxes,
  indoorBoxes,
  parseSave,
  safeCarExit,
  sectionAnswer,
  sectionContext,
  agentPosition,
} from "../src/components/world/model";
test("the guide's standing path clears the desk and room furniture", () => {
  for (let p = 0.12; p <= 1; p += 0.01)
    assert.equal(isBlocked(agentPosition(p), indoorBoxes, 0.28, 6.8), false);
});

test("every doorway is safely outside its building", () => {
  for (const d of destinations)
    assert.equal(isBlocked(entrance(d.id), outdoorBoxes, 0.38, 27), false);
});
test("large movement cannot tunnel through a building", () => {
  const p = slideMove({ x: 0, z: 3 }, -30, 0, outdoorBoxes, 0.38, 27);
  assert.ok(p.x > -12.2);
  assert.equal(isBlocked(p, outdoorBoxes, 0.38, 27), false);
});
test("diagonal movement slides along solid desks and walls", () => {
  const stopped = slideMove({ x: 2, z: 0 }, 0.5, -8, indoorBoxes, 0.38, 6.8);
  assert.ok(stopped.z > -2.2);
  const p = slideMove({ x: 2, z: 0 }, 2, -8, indoorBoxes, 0.38, 6.8);
  assert.equal(isBlocked(p, indoorBoxes, 0.38, 6.8), false);
  assert.ok(p.x > 3);
});
test("world boundary cannot be crossed", () => {
  assert.ok(slideMove({ x: 0, z: 5 }, 100, 0, [], 0.38, 27).x < 27);
});
test("saved progress accepts only real destinations and known characters", () => {
  assert.equal(parseSave("{bad"), null);
  assert.equal(parseSave('{"character":"unknown"}'), null);
  assert.deepEqual(
    parseSave('{"character":"robot","completed":["projects","made-up","projects","contact"]}'),
    { character: "robot", completed: ["projects", "contact"] },
  );
});
test("car exit avoids nearby buildings", () => {
  const p = safeCarExit({ x: -10, z: 0, yaw: 0, speed: 0 });
  assert.ok(p);
  assert.equal(isBlocked(p!, outdoorBoxes, 0.4, 27), false);
});
test("grounded lookup preserves dates, estimates and unavailable information", () => {
  assert.match(sectionAnswer("What did he do at TCS?", "experience"), /Jan 2025 — Present/);
  assert.match(sectionAnswer("What problem does SeatPeekr solve?", "projects"), /estimat/);
  assert.match(sectionAnswer("Which degree does he have?", "about"), /not published/);
  assert.match(sectionAnswer("How can I contact him?", "contact"), /pradyumnaaher05@gmail.com/);
  assert.match(sectionContext("thinking"), /Research notes incoming/);
  assert.match(sectionContext("projects", "ai-finance-tracker"), /FastAPI/);
  assert.doesNotMatch(sectionContext("projects", "ai-finance-tracker"), /SeatPeekr/);
});
