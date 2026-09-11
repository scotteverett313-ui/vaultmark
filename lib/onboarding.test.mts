import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ONBOARDING_STEPS,
  ONBOARDING_VERSION,
  REPLAY_REQUEST,
  hasCompletedOnboarding,
  isReplayRequested,
  parseStoredOnboarding,
  serializeOnboarding,
} from "./onboarding.ts";

test("a completed marker round-trips and counts as seen", () => {
  const raw = serializeOnboarding({ completedVersion: ONBOARDING_VERSION });
  assert.deepEqual(parseStoredOnboarding(raw), { completedVersion: ONBOARDING_VERSION, replayRequested: false });
  assert.ok(hasCompletedOnboarding(raw));
  assert.ok(!isReplayRequested(raw));
});

// Settings clearing the marker outright made Replay do nothing for anyone
// holding records: a cleared marker is a first visit, and a first visit by
// someone with a collection is skipped on purpose.
test("a replay request is distinguishable from never having seen it", () => {
  const requested = serializeOnboarding(REPLAY_REQUEST);
  assert.ok(isReplayRequested(requested), "the request must be readable back");
  assert.ok(!hasCompletedOnboarding(requested), "and it must not count as seen");

  assert.ok(!isReplayRequested(null), "a first visit is not a replay request");
  assert.ok(!isReplayRequested(serializeOnboarding({ completedVersion: ONBOARDING_VERSION })));
});

test("finishing the introduction clears a replay request", () => {
  const done = serializeOnboarding({ completedVersion: ONBOARDING_VERSION });
  assert.ok(hasCompletedOnboarding(done));
  assert.ok(!isReplayRequested(done));
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
