"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SessionType, VaultPiece } from "@/lib/types";
import { SESSION_STORAGE_KEY, parseStoredSession, serializeSession } from "@/lib/session";

export interface SessionContextValue {
  restored: boolean;
  sessionType: SessionType | null;
  startedAt: string | null;
  pieces: VaultPiece[];
  pieceCount: number;
  startSession: (type: SessionType) => void;
  endSession: () => void;
  addPiece: (piece: VaultPiece) => void;
}

interface SessionState {
  sessionType: SessionType | null;
  startedAt: string | null;
  pieces: VaultPiece[];
}

const EMPTY_SESSION: SessionState = { sessionType: null, startedAt: null, pieces: [] };

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(EMPTY_SESSION);
  // Storage can only be read after mount, so screens that gate on an active
  // session need to know whether a restore has happened yet — otherwise a
  // refresh mid-workflow looks identical to no session at all.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const stored = parseStoredSession(window.sessionStorage.getItem(SESSION_STORAGE_KEY));
      if (stored) setState(stored);
    } catch {
      // sessionStorage throws in private or sandboxed contexts; start fresh.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      if (state.sessionType && state.startedAt) {
        window.sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          serializeSession({ sessionType: state.sessionType, startedAt: state.startedAt, pieces: state.pieces }),
        );
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Persistence is best-effort; the in-memory session still works.
    }
  }, [restored, state]);

  const startSession = useCallback((type: SessionType) => {
    setState({ sessionType: type, startedAt: new Date().toISOString(), pieces: [] });
  }, []);

  const endSession = useCallback(() => setState(EMPTY_SESSION), []);

  const addPiece = useCallback((piece: VaultPiece) => {
    setState((prev) => ({ ...prev, pieces: [...prev.pieces, piece] }));
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      restored,
      sessionType: state.sessionType,
      startedAt: state.startedAt,
      pieces: state.pieces,
      pieceCount: state.pieces.length,
      startSession,
      endSession,
      addPiece,
    }),
    [restored, state, startSession, endSession, addPiece],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
