import type { SessionType, VaultPiece } from "./types";

export const SESSION_STORAGE_KEY = "vaultmark:session";

export interface StoredSession {
  sessionType: SessionType;
  startedAt: string;
  pieces: VaultPiece[];
}

export function serializeSession(session: StoredSession): string {
  return JSON.stringify(session);
}

// Storage is a trust boundary: the blob can be stale from an older build or
// edited by hand, so anything that doesn't match the current shape is dropped
// rather than handed to the dashboard.
export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const { sessionType, startedAt, pieces } = parsed as Partial<StoredSession>;
  if (!isSessionType(sessionType)) return null;
  if (typeof startedAt !== "string") return null;
  if (!Array.isArray(pieces)) return null;

  return { sessionType, startedAt, pieces: pieces.filter(isVaultPiece) };
}

function isSessionType(value: unknown): value is SessionType {
  return value === "gallery" || value === "private";
}

function isVaultPiece(value: unknown): value is VaultPiece {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as VaultPiece).id === "string" &&
    typeof (value as VaultPiece).certificateNumber === "string"
  );
}
