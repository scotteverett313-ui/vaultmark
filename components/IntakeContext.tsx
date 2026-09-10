"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { VaultKeyCredential } from "@/lib/types";

export type CaptureSource = "upload" | "camera";

export interface VaultDraft {
  key: VaultKeyCredential;
  encodedKey: string;
}

export interface CapturedImage {
  pixels: ImageData;
  size: number;
  fingerprint: string;
  fileName: string;
  format: string;
  source: CaptureSource;
  previewUrl: string;
  sourceWidth: number;
  sourceHeight: number;
}

interface IntakeContextValue {
  captured: CapturedImage | null;
  setCaptured: (image: CapturedImage | null) => void;
  vault: VaultDraft | null;
  setVault: (draft: VaultDraft | null) => void;
  resetIntake: () => void;
}

const IntakeContext = createContext<IntakeContextValue | null>(null);

// Holds the piece currently being vaulted while the user moves through the
// five intake routes. Deliberately in-memory only: the raw pixel buffer is
// megabytes and cannot go in sessionStorage, and it is only meaningful for
// the duration of one intake. Leaving /intake drops it.
export function IntakeProvider({ children }: { children: React.ReactNode }) {
  const [captured, setCaptured] = useState<CapturedImage | null>(null);
  const [vault, setVault] = useState<VaultDraft | null>(null);

  const resetIntake = useCallback(() => {
    setCaptured(null);
    setVault(null);
  }, []);

  const value = useMemo<IntakeContextValue>(
    () => ({ captured, setCaptured, vault, setVault, resetIntake }),
    [captured, vault, resetIntake],
  );

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake() {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error("useIntake must be used within an IntakeProvider");
  return ctx;
}
