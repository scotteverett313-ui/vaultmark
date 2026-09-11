import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ONBOARDING_STEPS,
  ONBOARDING_VERSION,
  hasCompletedOnboarding,
  parseStoredOnboarding,
  serializeOnboarding,
} from "./onboarding.ts";

test("a completed marker round-trips and counts as seen", () => {
  const raw = serializeOnboarding({ completedVersion: ONBOARDING_VERSION });
  assert.deepEqual(parseStoredOnboarding(raw), { completedVersion: ONBOARDING_VERSION });
  assert.ok(hasCompletedOnboarding(raw));
});

// Anything unreadable must show the introduction rather than hide it: a first
// visit and a corrupt marker should look the same.
test("absent or unreadable storage means not yet seen", () => {
  for (const raw of [null, "", "{not json", '"a string"', "[]", "{}", JSON.stringify({ completedVersion: "1" })]) {
    assert.ok(!hasCompletedOnboarding(raw), `${JSON.stringify(raw)} must not count as completed`);
  }
});

test("a marker from an older version re-shows the introduction; a newer one does not", () => {
  const seenV1 = serializeOnboarding({ completedVersion: 1 });
  assert.ok(hasCompletedOnboarding(seenV1, 1));
  assert.ok(!hasCompletedOnboarding(seenV1, 2), "bumping the version brings the introduction back");
  assert.ok(hasCompletedOnboarding(serializeOnboarding({ completedVersion: 3 }), 2));
});

test("every step is complete enough to render", () => {
  assert.ok(ONBOARDING_STEPS.length >= 3);
  const ids = new Set<string>();
  for (const step of ONBOARDING_STEPS) {
    assert.ok(step.id && !ids.has(step.id), `${step.id} must be a unique id`);
    ids.add(step.id);
    assert.ok(step.eyebrow.length > 0);
    assert.ok(step.title.length > 0);
    assert.ok(step.body.length > 0 && step.body.every((p) => p.trim().length > 0));
  }
});

// The introduction is the one place these are stated, so losing one to an edit
// would quietly remove the only warning a user gets.
test("the introduction still states the things that surprise people", () => {
  const all = ONBOARDING_STEPS.flatMap((s) => [s.title, ...s.body, s.note ?? ""]).join(" ").toLowerCase();
  assert.ok(all.includes("never uploaded") || all.includes("not uploaded"), "nothing leaves the browser");
  assert.ok(all.includes("cannot be reissued"), "a lost key is unrecoverable");
  assert.ok(all.includes("amendment"), "sealed records are amended, not edited");
  assert.ok(all.includes("backup"), "records live in this browser and need a backup");
});
