import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_VAULT,
  LEGACY_SESSION_KEY,
  VAULT_STORAGE_KEY,
  isEmptyVault,
  loadVault,
  mergePieces,
  parseStoredVault,
  piecesThisSession,
  serializeVault,
  type StoredVault,
} from "./session.ts";
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

const vault: StoredVault = {
  sessionType: "gallery",
  startedAt: "2026-01-01T00:00:00.000Z",
  pieces: [makePiece()],
};

const store = (entries: Record<string, string>) => (key: string) => entries[key] ?? null;

test("serialize/parse round-trips a vault with a session running", () => {
  assert.deepEqual(parseStoredVault(serializeVault(vault)), vault);
});

// The whole point of the split: records are not owned by a sitting.
test("a vault with no session but pieces in it is valid and restores", () => {
  const resting: StoredVault = { sessionType: null, startedAt: null, pieces: [makePiece()] };
  assert.deepEqual(parseStoredVault(serializeVault(resting)), resting);
  assert.ok(!isEmptyVault(resting));
  assert.ok(isEmptyVault(EMPTY_VAULT));
});

test("parseStoredVault returns null for absent or unreadable storage", () => {
  assert.equal(parseStoredVault(null), null);
  assert.equal(parseStoredVault(""), null);
  assert.equal(parseStoredVault("{not json"), null);
  assert.equal(parseStoredVault('"a string"'), null);
  assert.equal(parseStoredVault("[]"), null);
});

test("parseStoredVault rejects a blob with a bad shape", () => {
  assert.equal(parseStoredVault(JSON.stringify({ ...vault, sessionType: "museum" })), null);
  assert.equal(parseStoredVault(JSON.stringify({ ...vault, startedAt: 1735689600000 })), null);
  assert.equal(parseStoredVault(JSON.stringify({ ...vault, pieces: "none" })), null);
});

test("parseStoredVault drops malformed pieces but keeps the rest", () => {
  const raw = JSON.stringify({ ...vault, pieces: [makePiece(), { id: "VMRK-X" }, null, makePiece({ status: "Burned" })] });
  const parsed = parseStoredVault(raw);
  assert.equal(parsed?.pieces.length, 1);
});

test("a piece stored before amendments existed is restored with an empty history", () => {
  const legacy = makePiece() as Partial<VaultPiece>;
  delete legacy.amendments;
  assert.deepEqual(parseStoredVault(JSON.stringify({ ...vault, pieces: [legacy] }))?.pieces[0].amendments, []);
});

test("an amendment that names a sealed field is dropped from the history", () => {
  const raw = JSON.stringify({
    ...vault,
    pieces: [makePiece({ amendments: [{ at: "x", field: "pixelHash", from: "a", to: "b", reason: "no" }] })],
  });
  assert.deepEqual(parseStoredVault(raw)?.pieces[0].amendments, []);
});

// Anyone who used a build before this change has their collection under the
// old key, inside a blob that always carried a session.
test("loadVault migrates a legacy session blob, keeping its pieces and its sitting", () => {
  const legacy = JSON.stringify({ sessionType: "private", startedAt: "2026-03-01T00:00:00.000Z", pieces: [makePiece()] });
  const { vault: loaded, migrated } = loadVault(store({ [LEGACY_SESSION_KEY]: legacy }));

  assert.ok(migrated);
  assert.equal(loaded.pieces.length, 1);
  assert.equal(loaded.sessionType, "private");
  assert.equal(loaded.startedAt, "2026-03-01T00:00:00.000Z");
});

test("loadVault prefers the current key and reports no migration", () => {
  const both = store({ [VAULT_STORAGE_KEY]: serializeVault(vault), [LEGACY_SESSION_KEY]: "{}" });
  const { vault: loaded, migrated } = loadVault(both);
  assert.ok(!migrated);
  assert.deepEqual(loaded, vault);
});

test("loadVault returns an empty vault when storage holds nothing usable", () => {
  assert.deepEqual(loadVault(store({})), { vault: EMPTY_VAULT, migrated: false });
  assert.deepEqual(loadVault(store({ [VAULT_STORAGE_KEY]: "{bad", [LEGACY_SESSION_KEY]: "{bad" })).vault, EMPTY_VAULT);
});

test("mergePieces adds new records and leaves held vault IDs untouched", () => {
  const held = [makePiece({ id: "A", title: "Amended here" })];
  const incoming = [makePiece({ id: "A", title: "Stale copy" }), makePiece({ id: "B" })];

  const { pieces, added, skipped } = mergePieces(held, incoming);
  assert.equal(added, 1);
  assert.equal(skipped, 1);
  assert.equal(pieces.length, 2);
  assert.equal(pieces[0].title, "Amended here", "a local amendment must survive an import");
});

test("mergePieces does not mutate the collection it was given", () => {
  const held = [makePiece({ id: "A" })];
  mergePieces(held, [makePiece({ id: "B" })]);
  assert.equal(held.length, 1);
});

test("piecesThisSession counts only what was sealed after the sitting began", () => {
  const pieces = [
    makePiece({ id: "OLD", vaultedAt: "2026-01-01T00:00:00.000Z" }),
    makePiece({ id: "NEW", vaultedAt: "2026-06-02T00:00:00.000Z" }),
  ];
  assert.deepEqual(piecesThisSession(pieces, "2026-06-01T00:00:00.000Z").map((p) => p.id), ["NEW"]);
  assert.deepEqual(piecesThisSession(pieces, null), []);
});
