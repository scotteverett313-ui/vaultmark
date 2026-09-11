import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROFILE, mergeArtists, parseStoredProfile, serializeProfile, type Profile } from "./profile.ts";

const profile: Profile = {
  galleryName: "Meridian Gallery",
  location: "Detroit, MI",
  signatory: "M. Chen, Director",
  artists: ["Yuki Tanaka", "Marcus Bell"],
};

test("profile round-trips through storage", () => {
  assert.deepEqual(parseStoredProfile(serializeProfile(profile)), profile);
  assert.deepEqual(parseStoredProfile(serializeProfile(EMPTY_PROFILE)), EMPTY_PROFILE);
});

test("unreadable storage yields null rather than a broken profile", () => {
  assert.equal(parseStoredProfile(null), null);
  assert.equal(parseStoredProfile("{oops"), null);
  assert.equal(parseStoredProfile('"a string"'), null);
});

test("missing or wrongly typed fields fall back instead of reaching the form", () => {
  const parsed = parseStoredProfile(JSON.stringify({ galleryName: 42, artists: ["A", 7, "", "  "] }));
  assert.deepEqual(parsed, { galleryName: "", location: "", signatory: "", artists: ["A"] });
});

test("roster merges saved artists with those vaulted this session", () => {
  assert.deepEqual(mergeArtists(["Yuki Tanaka"], ["Marcus Bell"]), ["Marcus Bell", "Yuki Tanaka"]);
  // Case-insensitive dedupe keeps the first spelling seen.
  assert.deepEqual(mergeArtists(["Yuki Tanaka"], ["yuki tanaka"]), ["Yuki Tanaka"]);
  // Placeholder dashes from blank records never enter the roster.
  assert.deepEqual(mergeArtists([], ["—", "  ", "Priya Nair"]), ["Priya Nair"]);
});
