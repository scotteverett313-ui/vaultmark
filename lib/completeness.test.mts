import { test } from "node:test";
import assert from "node:assert/strict";
import { recordCompleteness } from "./completeness.ts";
import type { LabelDraft } from "../components/IntakeContext.tsx";

function draft(overrides: Partial<LabelDraft> = {}): LabelDraft {
  return {
    title: "Threshold (Diptych, Left)",
    artist: "Yuki Tanaka",
    year: "2024",
    medium: "Acrylic and graphite on canvas",
    height: "60",
    width: "48",
    depth: "",
    weight: "",
    unit: "in",
    editionType: "1of1",
    editionNumber: "",
    provenance: "",
    gallery: "",
    signatory: "",
    value: "",
    appraiser: "",
    notes: "",
    ...overrides,
  };
}

const ids = (label: LabelDraft, session: "private" | "gallery" = "private") =>
  recordCompleteness(label, session).missing.map((f) => f.id);

test("a filled private record is complete", () => {
  const result = recordCompleteness(draft(), "private");
  assert.deepEqual(result.missing, []);
  assert.ok(result.complete);
  assert.ok(result.sealable);
  assert.equal(result.filled, result.total);
});

test("a missing title blocks sealing; a missing year does not", () => {
  const noTitle = recordCompleteness(draft({ title: "  " }), "private");
  assert.deepEqual(noTitle.missingRequired.map((f) => f.id), ["title"]);
  assert.ok(!noTitle.sealable);

  const noYear = recordCompleteness(draft({ year: "" }), "private");
  assert.deepEqual(noYear.missingRecommended.map((f) => f.id), ["year"]);
  assert.ok(noYear.sealable);
  assert.ok(!noYear.complete);
});

test("dimensions count as present when any one measurement is given", () => {
  assert.ok(ids(draft({ height: "", width: "", depth: "" })).includes("height"));
  assert.ok(!ids(draft({ height: "", width: "", depth: "2" })).includes("height"));
});

// Fields that do not apply are not gaps: a 1-of-1 has no edition number, and a
// private session has no gallery to name.
test("conditional fields only count when they apply", () => {
  assert.ok(!ids(draft()).includes("editionNumber"));
  assert.ok(ids(draft({ editionType: "limited" })).includes("editionNumber"));
  assert.ok(!ids(draft({ editionType: "limited", editionNumber: "2 of 5" })).includes("editionNumber"));

  assert.ok(!ids(draft()).includes("gallery"));
  const gallerySession = ids(draft(), "gallery");
  assert.ok(gallerySession.includes("gallery"));
  assert.ok(gallerySession.includes("signatory"));
});

test("the total grows with the fields that apply", () => {
  assert.ok(
    recordCompleteness(draft(), "gallery").total > recordCompleteness(draft(), "private").total,
    "a gallery record is held to more fields",
  );
});

// Deliberately optional — flagging these on every honest record would train
// people to ignore the panel.
test("valuation, provenance, weight, and notes are never reported as gaps", () => {
  const bare = ids(draft({ provenance: "", value: "", appraiser: "", notes: "", weight: "" }));
  for (const id of ["provenance", "value", "appraiser", "notes", "weight"]) {
    assert.ok(!bare.includes(id), `${id} must not be reported as missing`);
  }
});

test("an empty record reports both required fields and stays unsealable", () => {
  const empty = recordCompleteness(draft({ title: "", artist: "", year: "", medium: "", height: "", width: "" }), "private");
  assert.deepEqual(empty.missingRequired.map((f) => f.id), ["title", "artist"]);
  assert.equal(empty.filled, 0);
  assert.ok(!empty.sealable);
});
