"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import type { AmendableField, PieceStatus, SessionType, VaultPiece } from "@/lib/types";
import { amendPiece as applyAmendment } from "@/lib/amend";
import {
  EMPTY_VAULT,
  LEGACY_SESSION_KEY,
  VAULT_STORAGE_KEY,
  isEmptyVault,
  loadVault,
  mergePieces,
  piecesThisSession,
  serializeVault,
  type StoredVault,
} from "@/lib/session";

export interface SessionContextValue {
  restored: boolean;
  sessionType: SessionType | null;
  startedAt: string | null;
  /** The whole collection, which outlives any one session. */
  pieces: VaultPiece[];
  pieceCount: number;
  /** Of those, the ones sealed during the session running now. */
  sessionPieceCount: number;
  /** True once a write to storage has failed — the library is memory-only. */
  persistFailed: boolean;
  startSession: (type: SessionType) => void;
  endSession: () => void;
  /** Destroys the collection. Separate from ending a session on purpose. */
  clearCollection: () => void;
  /** Merges records from an exported backup, skipping vault IDs already held. */
  importPieces: (incoming: VaultPiece[]) => { added: number; skipped: number };
  addPiece: (piece: VaultPiece) => void;
  updatePieceStatus: (id: string, status: PieceStatus) => void;
  /** Corrects one descriptive field on a sealed record, leaving the key alone. */
  amendPiece: (id: string, field: AmendableField, to: string, reason: string) => AmendResult;
}

export type AmendResult = { ok: true } | { ok: false; error: string };

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredVault>(EMPTY_VAULT);
  // Storage can only be read after mount, so screens that gate on an active
  // session need to know whether a restore has happened yet — otherwise a
  // refresh mid-workflow looks identical to no session at all.
  const [restored, setRestored] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);
  const { showToast } = useToast();
  const warnedRef = useRef(false);
  // Read inside amendPiece so the callback stays stable while still seeing
  // the current pieces — validation needs the record as it stands now.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const { vault, migrated } = loadVault((key) => window.localStorage.getItem(key));
      setState(vault);
      // The pieces are safe under the new key before the old one goes; the
      // write below runs on the same tick as this state change.
      if (migrated) {
        window.localStorage.setItem(VAULT_STORAGE_KEY, serializeVault(vault));
        window.localStorage.removeItem(LEGACY_SESSION_KEY);
      }
    } catch {
      // localStorage throws in private or sandboxed contexts; start fresh.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      // Written whenever anything is held, session or not: the collection is
      // what has to survive, and it now outlives every sitting.
      if (isEmptyVault(state)) window.localStorage.removeItem(VAULT_STORAGE_KEY);
      else window.localStorage.setItem(VAULT_STORAGE_KEY, serializeVault(state));
      setPersistFailed(false);
    } catch {
      // The library is meant to outlive the tab now, so a failed write is not
      // something to swallow: the user would close the browser believing their
      // work was saved. Warn once rather than on every keystroke.
      setPersistFailed(true);
      if (!warnedRef.current) {
        warnedRef.current = true;
        showToast("Could not save to this browser — download your keys before closing");
      }
    }
  }, [restored, state, showToast]);

  // A new sitting, over the same collection. This used to clear the pieces,
  // which meant a second session silently destroyed the first one's work.
  const startSession = useCallback((type: SessionType) => {
    setState((prev) => ({ ...prev, sessionType: type, startedAt: new Date().toISOString() }));
  }, []);

  const endSession = useCallback(() => {
    setState((prev) => ({ ...prev, sessionType: null, startedAt: null }));
  }, []);

  const clearCollection = useCallback(() => setState(EMPTY_VAULT), []);

  const importPieces = useCallback((incoming: VaultPiece[]) => {
    const { pieces, added, skipped } = mergePieces(stateRef.current.pieces, incoming);
    if (added > 0) setState((prev) => ({ ...prev, pieces }));
    return { added, skipped };
  }, []);

  const addPiece = useCallback((piece: VaultPiece) => {
    setState((prev) => ({ ...prev, pieces: [...prev.pieces, piece] }));
  }, []);

  const updatePieceStatus = useCallback((id: string, status: PieceStatus) => {
    setState((prev) => ({
      ...prev,
      pieces: prev.pieces.map((piece) => (piece.id === id ? { ...piece, status } : piece)),
    }));
  }, []);

  // Validation lives in lib/amend so it can be tested without React; this
  // only decides whether the result is worth writing back to storage.
  const amendPiece = useCallback((id: string, field: AmendableField, to: string, reason: string): AmendResult => {
    const target = stateRef.current.pieces.find((piece) => piece.id === id);
    if (!target) return { ok: false, error: "That record is no longer in this session." };

    const outcome = applyAmendment(target, { field, to, reason });
    if (!outcome.ok) return { ok: false, error: outcome.error };

    setState((prev) => ({
      ...prev,
      pieces: prev.pieces.map((piece) => (piece.id === id ? outcome.piece : piece)),
    }));
    return { ok: true };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      restored,
      sessionType: state.sessionType,
      startedAt: state.startedAt,
      pieces: state.pieces,
      pieceCount: state.pieces.length,
      sessionPieceCount: piecesThisSession(state.pieces, state.startedAt).length,
      persistFailed,
      startSession,
      endSession,
      clearCollection,
      importPieces,
      addPiece,
      updatePieceStatus,
      amendPiece,
    }),
    [
      restored,
      state,
      persistFailed,
      startSession,
      endSession,
      clearCollection,
      importPieces,
      addPiece,
      updatePieceStatus,
      amendPiece,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
