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
    thumbColors: { bg: "#1A2E4A", fg: "#4A8ABB" },
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
