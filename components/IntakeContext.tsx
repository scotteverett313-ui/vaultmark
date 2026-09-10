"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { VaultKeyCredential } from "@/lib/types";

export type CaptureSource = "upload" | "camera";

export interface VaultDraft {
  key: VaultKeyCredential;
  encodedKey: string;
}

export type EditionType = "1of1" | "limited" | "ap" | "open";

export interface LabelDraft {
  title: string;
  artist: string;
  year: string;
  medium: string;
  height: string;
  width: string;
  depth: string;
  weight: string;
  unit: "in" | "cm";
  editionType: EditionType;
  editionNumber: string;
  provenance: string;
  gallery: string;
  signatory: string;
  value: string;
  appraiser: string;
  notes: string;
}

export const EMPTY_LABEL: LabelDraft = {
  title: "",
  artist: "",
  year: "",
  medium: "",
  height: "",
  width: "",
  depth: "",
  weight: "",
  unit: "in",
  editionType: "1of1",
  editionNumber: "",
  provenance: "",
  gallery: "",
  signatory: "",
  value: "",
  appraiser: "",
  notes: "",
};

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
  label: LabelDraft;
  updateLabel: (patch: Partial<LabelDraft>) => void;
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
  const [label, setLabel] = useState<LabelDraft>(EMPTY_LABEL);

  // Every keystroke lands here rather than in the form's own state, so
  // stepping back to the vault screen and returning leaves the record intact.
  const updateLabel = useCallback((patch: Partial<LabelDraft>) => {
    setLabel((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetIntake = useCallback(() => {
    setCaptured(null);
    setVault(null);
    setLabel(EMPTY_LABEL);
  }, []);

  const value = useMemo<IntakeContextValue>(
    () => ({ captured, setCaptured, vault, setVault, label, updateLabel, resetIntake }),
    [captured, vault, label, updateLabel, resetIntake],
  );

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake() {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error("useIntake must be used within an IntakeProvider");
  return ctx;
}
