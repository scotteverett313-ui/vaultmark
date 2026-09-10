"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import type { SessionType, VaultPiece } from "@/lib/types";
import { SESSION_STORAGE_KEY, parseStoredSession, serializeSession } from "@/lib/session";

export interface SessionContextValue {
  restored: boolean;
  sessionType: SessionType | null;
  startedAt: string | null;
  pieces: VaultPiece[];
  pieceCount: number;
  /** True once a write to storage has failed — the library is memory-only. */
  persistFailed: boolean;
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
  const [persistFailed, setPersistFailed] = useState(false);
  const { showToast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = parseStoredSession(window.localStorage.getItem(SESSION_STORAGE_KEY));
      if (stored) setState(stored);
    } catch {
      // localStorage throws in private or sandboxed contexts; start fresh.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      if (state.sessionType && state.startedAt) {
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          serializeSession({ sessionType: state.sessionType, startedAt: state.startedAt, pieces: state.pieces }),
        );
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
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
      persistFailed,
      startSession,
      endSession,
      addPiece,
    }),
    [restored, state, persistFailed, startSession, endSession, addPiece],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
