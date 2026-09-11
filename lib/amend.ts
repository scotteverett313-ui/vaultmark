import type { AmendableField, Amendment, VaultPiece } from "./types";

export const AMENDABLE_FIELDS: { field: AmendableField; label: string }[] = [
  { field: "title", label: "Title" },
  { field: "artist", label: "Artist" },
  { field: "year", label: "Year" },
  { field: "medium", label: "Medium" },
  { field: "dimensions", label: "Dimensions" },
  { field: "edition", label: "Edition" },
  { field: "provenance", label: "Provenance" },
  { field: "value", label: "Appraised Value" },
  { field: "appraiser", label: "Appraiser" },
  { field: "notes", label: "Notes" },
  { field: "gallery", label: "Gallery" },
  { field: "signatory", label: "Signatory" },
];

// Named so the UI can say plainly what an amendment cannot reach.
export const SEALED_FIELDS = [
  "Vault ID",
  "Image Fingerprint",
  "Pixel Hash",
  "QR Symbol",
  "Masked Pixels",
  "Capture Source",
  "Vaulted At",
  "Key Credential",
] as const;

export const MIN_REASON_LENGTH = 4;

export function fieldLabel(field: AmendableField): string {
  return AMENDABLE_FIELDS.find((f) => f.field === field)?.label ?? field;
}

export interface AmendRequest {
  field: AmendableField;
  to: string;
  reason: string;
  /** Injected so tests and callers control the timestamp. */
  at?: string;
}

export type AmendOutcome =
  | { ok: true; piece: VaultPiece; amendment: Amendment }
  | { ok: false; error: string };

// The only way a sealed record changes. It rewrites one descriptive field and
// appends the correction to the history; the key, the hashes, and the issue
// time are copied through untouched, so a certificate issued before an
// amendment still verifies against the same image afterwards.
export function amendPiece(piece: VaultPiece, request: AmendRequest): AmendOutcome {
  const { field } = request;
  if (!AMENDABLE_FIELDS.some((f) => f.field === field)) {
    return { ok: false, error: `${field} is sealed and cannot be amended.` };
  }

  const to = request.to.trim();
  const reason = request.reason.trim();
  if (!to) return { ok: false, error: "A corrected value is required — use “—” to record that a field is not applicable." };
  if (reason.length < MIN_REASON_LENGTH) {
    return { ok: false, error: "Say why the record is being corrected. This is kept with the certificate." };
  }

  const from = piece[field];
  if (from === to) return { ok: false, error: `${fieldLabel(field)} already reads that. Nothing to amend.` };

  const amendment: Amendment = { at: request.at ?? new Date().toISOString(), field, from, to, reason };

  return {
    ok: true,
    amendment,
    piece: { ...piece, [field]: to, amendments: [...amendmentHistory(piece), amendment] },
  };
}

// Records written by older builds have no history at all; treat that as empty
// rather than letting `undefined` reach a map() in the modal.
export function amendmentHistory(piece: VaultPiece): Amendment[] {
  return Array.isArray(piece.amendments) ? piece.amendments : [];
}

export function amendmentsForField(piece: VaultPiece, field: AmendableField): Amendment[] {
  return amendmentHistory(piece).filter((a) => a.field === field);
}

export function isAmended(piece: VaultPiece, field: AmendableField): boolean {
  return amendmentsForField(piece, field).length > 0;
}

export function amendmentCount(piece: VaultPiece): number {
  return amendmentHistory(piece).length;
}

export function formatAmendmentDate(at: string): string {
  const date = new Date(at);
  return Number.isNaN(date.getTime())
    ? at
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
