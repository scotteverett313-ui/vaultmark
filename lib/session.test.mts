import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStoredSession, serializeSession, type StoredSession } from "./session.ts";
import type { VaultPiece } from "./types.ts";

function makePiece(overrides: Partial<VaultPiece> = {}): VaultPiece {
  return {
    id: "VMRK-TEST01",
    certificateNumber: "VMRK-CERT-0001",
    title: "Untitled No. 7",
    artist: "Dominique Okafor",
    year: "2023",
    medium: "Oil on linen",
    dimensions: "48 × 36 in",
    edition: "1 of 1",
    status: "Vaulted",
    value: "$18,500 USD",
    appraiser: "R. Halvorsen, AAA",
    provenance: "Acquired directly from artist.",
    notes: "Excellent condition.",
    qrSymbol: "VM-A",
    maskedPixelCount: 241,
    imageFingerprint: "a".repeat(64),
    pixelHash: "b".repeat(64),
    captureSource: "upload",
    vaultedAt: "2026-01-01T00:00:00.000Z",
    key: "encoded-key",
    gallery: "Meridian Gallery",
    signatory: "M. Chen, Director",
    thumbnailUrl: "data:image/jpeg;base64,x",
    amendments: [],
    ...overrides,
  };
}

const session: StoredSession = {
  sessionType: "gallery",
  startedAt: "2026-01-01T00:00:00.000Z",
  pieces: [makePiece()],
};

test("serialize/parse round-trips an active session", () => {
  const parsed = parseStoredSession(serializeSession(session));
  assert.deepEqual(parsed, session);
});

test("parseStoredSession returns null for absent or unreadable storage", () => {
  assert.equal(parseStoredSession(null), null);
  assert.equal(parseStoredSession(""), null);
  assert.equal(parseStoredSession("{not json"), null);
  assert.equal(parseStoredSession('"a string"'), null);
});

test("parseStoredSession rejects a blob with a bad session shape", () => {
  assert.equal(parseStoredSession(JSON.stringify({ ...session, sessionType: "museum" })), null);
  assert.equal(parseStoredSession(JSON.stringify({ ...session, startedAt: 1735689600000 })), null);
  assert.equal(parseStoredSession(JSON.stringify({ ...session, pieces: "none" })), null);
});

test("parseStoredSession drops malformed pieces but keeps the session", () => {
  const raw = JSON.stringify({
    ...session,
    pieces: [makePiece(), null, "junk", { id: "no-cert-number" }, makePiece({ id: "VMRK-TEST02" })],
  });

  const parsed = parseStoredSession(raw);
  assert.ok(parsed, "session survives partially corrupt pieces");
  assert.deepEqual(
    parsed.pieces.map((p) => p.id),
    ["VMRK-TEST01", "VMRK-TEST02"],
  );
});

test("a piece stored before amendments existed is restored with an empty history", () => {
  const legacy = makePiece() as Partial<VaultPiece>;
  delete legacy.amendments;
  const raw = JSON.stringify({ ...session, pieces: [legacy] });

  const parsed = parseStoredSession(raw);
  assert.deepEqual(parsed?.pieces[0].amendments, []);
});

test("amendment history survives a round-trip and drops entries that are not amendments", () => {
  const amended = makePiece({
    title: "Untitled No. 8",
    amendments: [
      { at: "2026-02-02T00:00:00.000Z", field: "title", from: "Untitled No. 7", to: "Untitled No. 8", reason: "Typo." },
    ],
  });
  const roundTripped = parseStoredSession(serializeSession({ ...session, pieces: [amended] }));
  assert.deepEqual(roundTripped?.pieces[0].amendments, amended.amendments);

  const junk = JSON.stringify({
    ...session,
    pieces: [{ ...amended, amendments: [{ at: "2026-02-02T00:00:00.000Z", field: "pixelHash", from: "a", to: "b", reason: "no" }] }],
  });
  assert.deepEqual(parseStoredSession(junk)?.pieces[0].amendments, []);
});
