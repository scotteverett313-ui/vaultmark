import type { SessionType, VaultPiece } from "./types";
import { readPieces } from "./pieces.ts";

export const VAULT_STORAGE_KEY = "vaultmark:vault";

// What builds up to and including the first amendment release wrote. Its
// pieces are migrated on first load and the key is then removed.
export const LEGACY_SESSION_KEY = "vaultmark:session";

// The collection is the durable thing. A session is a sitting — it decides the
// attestation language and dates the intake — and ending one, or starting the
// next, must never take the records with it.
export interface StoredVault {
  sessionType: SessionType | null;
  startedAt: string | null;
  pieces: VaultPiece[];
}

export const EMPTY_VAULT: StoredVault = { sessionType: null, startedAt: null, pieces: [] };

export function serializeVault(vault: StoredVault): string {
  return JSON.stringify(vault);
}

export function parseStoredVault(raw: string | null): StoredVault | null {
  const parsed = readJson(raw);
  if (!parsed) return null;

  const { sessionType, startedAt, pieces } = parsed as Partial<StoredVault>;
  // A vault with no session is the normal resting state between sittings.
  if (sessionType !== null && !isSessionType(sessionType)) return null;
  if (startedAt !== null && typeof startedAt !== "string") return null;
  if (!Array.isArray(pieces)) return null;

  return {
    sessionType: sessionType ?? null,
    startedAt: startedAt ?? null,
    pieces: readPieces(pieces),
  };
}

// The old blob always carried an active session; only its pieces are worth
// keeping, and a sitting left open by a previous build is resumed as it was.
export function parseLegacyVault(raw: string | null): StoredVault | null {
  const parsed = readJson(raw);
  if (!parsed) return null;

  const { sessionType, startedAt, pieces } = parsed as Partial<StoredVault>;
  if (!isSessionType(sessionType)) return null;
  if (typeof startedAt !== "string") return null;
  if (!Array.isArray(pieces)) return null;

  return { sessionType, startedAt, pieces: readPieces(pieces) };
}

/**
 * Restores the vault, migrating a legacy session blob on the way through.
 * `read` is passed in so this stays testable without a browser.
 */
export function loadVault(read: (key: string) => string | null): {
  vault: StoredVault;
  migrated: boolean;
} {
  const current = parseStoredVault(read(VAULT_STORAGE_KEY));
  if (current) return { vault: current, migrated: false };

  const legacy = parseLegacyVault(read(LEGACY_SESSION_KEY));
  if (legacy) return { vault: legacy, migrated: true };

  return { vault: EMPTY_VAULT, migrated: false };
}

/** Nothing worth writing: no session running and no records held. */
export function isEmptyVault(vault: StoredVault): boolean {
  return vault.sessionType === null && vault.pieces.length === 0;
}

/**
 * Merges imported records into the collection. A vault ID already held is left
 * alone rather than overwritten — an import must never silently discard an
 * amendment made on this device.
 */
export function mergePieces(
  held: VaultPiece[],
  incoming: VaultPiece[],
): { pieces: VaultPiece[]; added: number; skipped: number } {
  const seen = new Set(held.map((piece) => piece.id));
  const added: VaultPiece[] = [];

  for (const piece of incoming) {
    if (seen.has(piece.id)) continue;
    seen.add(piece.id);
    added.push(piece);
  }

  return {
    pieces: [...held, ...added],
    added: added.length,
    skipped: incoming.length - added.length,
  };
}

/** Records sealed during the sitting that is running now. */
export function piecesThisSession(pieces: VaultPiece[], startedAt: string | null): VaultPiece[] {
  if (!startedAt) return [];
  return pieces.filter((piece) => piece.vaultedAt >= startedAt);
}

function readJson(raw: string | null): object | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function isSessionType(value: unknown): value is SessionType {
  return value === "gallery" || value === "private";
}
