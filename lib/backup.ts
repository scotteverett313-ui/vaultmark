import type { SessionType, VaultPiece } from "./types";
import { readPieces } from "./pieces.ts";

export interface ParsedBackup {
  pieces: VaultPiece[];
  exportedAt: string | null;
  sessionType: SessionType | null;
  /** Records in the file that were not readable as vault records. */
  rejected: number;
}

export type BackupOutcome = { ok: true; backup: ParsedBackup } | { ok: false; error: string };

/**
 * Reads a file produced by the library's Backup export. Deliberately strict
 * about the envelope and forgiving about individual records: a file with one
 * corrupt entry is still worth the rest of its contents.
 */
export function parseBackup(raw: string): BackupOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file is not readable JSON." };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "That file is not a Vaultmark backup." };
  }

  const { pieces, exportedAt, sessionType } = parsed as {
    pieces?: unknown;
    exportedAt?: unknown;
    sessionType?: unknown;
  };

  if (!Array.isArray(pieces)) {
    return { ok: false, error: "That file has no records in it. Use the Backup export, not the CSV." };
  }

  const readable = readPieces(pieces);
  if (readable.length === 0) {
    return { ok: false, error: "No readable vault records in that file." };
  }

  return {
    ok: true,
    backup: {
      pieces: readable,
      exportedAt: typeof exportedAt === "string" ? exportedAt : null,
      sessionType: sessionType === "gallery" || sessionType === "private" ? sessionType : null,
      rejected: pieces.length - readable.length,
    },
  };
}
