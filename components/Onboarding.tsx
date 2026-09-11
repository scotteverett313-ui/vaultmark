"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, HardDrive, KeyRound, Layers } from "lucide-react";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_VERSION,
  REPLAY_REQUEST,
  hasCompletedOnboarding,
  isReplayRequested,
  serializeOnboarding,
} from "@/lib/onboarding";

const ICONS = [Fingerprint, Layers, KeyRound, HardDrive];

// Shown once, before the session picker. Four screens covering the only things
// that are genuinely surprising about Vaultmark: nothing is uploaded, sealed
// records are amended rather than edited, a lost key cannot be reissued, and
// the collection lives in this browser.
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);

  const step = ONBOARDING_STEPS[index];
  const Icon = ICONS[index] ?? Fingerprint;
  const isLast = index === ONBOARDING_STEPS.length - 1;

  return (
    <div className="flex min-h-[calc(100vh-3.25rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-[560px]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <span className="text-[14px] tracking-[0.2em] text-vm-dim">VAULTMARK · INTRODUCTION</span>
          <button
            type="button"
            onClick={onDone}
            className="font-vm-mono text-[11px] uppercase tracking-[0.12em] text-vm-dim underline-offset-4 transition-colors hover:text-vm-gold hover:underline"
          >
            Skip
          </button>
        </div>

        <section
          aria-live="polite"
          className="border border-vm-border-2 bg-vm-surface p-6 sm:p-7"
        >
          <Icon className="mb-4 h-7 w-7 text-vm-gold" strokeWidth={1.25} aria-hidden />

          <div className="mb-1.5 text-[11px] uppercase tracking-[0.15em] text-vm-dim">{step.eyebrow}</div>
          <h1 className="mb-4 font-vm-sans text-2xl font-bold leading-tight tracking-[0.02em] text-vm-ink sm:text-3xl">
            {step.title}
          </h1>

          {step.body.map((paragraph) => (
            <p key={paragraph} className="mb-3 text-[14px] leading-[1.9] text-vm-mid last:mb-0">
              {paragraph}
            </p>
          ))}

          {step.note && (
            <p className="mt-4 border-l-2 border-vm-gold-2 bg-vm-gold-bg px-3 py-2.5 text-[13px] leading-[1.8] text-vm-gold">
              {step.note}
            </p>
          )}
        </section>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex gap-1.5" role="group" aria-label="Introduction progress">
            {ONBOARDING_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Step ${i + 1} — ${s.eyebrow}`}
                aria-current={i === index}
                className={`h-1.5 w-6 transition-colors ${i === index ? "bg-vm-gold" : "bg-vm-dim hover:bg-vm-mid"}`}
              />
            ))}
          </div>

          <span className="font-vm-mono text-[11px] tracking-[0.1em] text-vm-dim">
            {index + 1} / {ONBOARDING_STEPS.length}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="border border-vm-border-2 px-3 py-2.5 font-vm-mono text-[13px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
              className="border border-vm-gold-2 bg-vm-gold-bg px-4 py-2.5 font-vm-mono text-[13px] uppercase tracking-[0.14em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
            >
              {isLast ? "Get started →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface OnboardingControls {
  /** Storage has been read; nothing should render on this decision before it. */
  restored: boolean;
  completed: boolean;
  /** True when Settings asked for the introduction back. */
  replayRequested: boolean;
  complete: () => void;
}

export function useOnboarding(): OnboardingControls {
  const [restored, setRestored] = useState(false);
  // Assume seen until storage says otherwise, so the introduction never
  // flashes in front of a returning user between mount and restore.
  const [completed, setCompleted] = useState(true);
  const [replayRequested, setReplayRequested] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      setCompleted(hasCompletedOnboarding(raw));
      setReplayRequested(isReplayRequested(raw));
    } catch {
      // Storage is blocked, so finishing could never be recorded either — and
      // an introduction that reappears on every load is worse than none.
      setCompleted(true);
    }
    setRestored(true);
  }, []);

  const complete = useCallback(() => {
    setCompleted(true);
    setReplayRequested(false);
    try {
      window.localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        serializeOnboarding({ completedVersion: ONBOARDING_VERSION }),
      );
    } catch {
      // Best effort; it stays dismissed for this visit either way.
    }
  }, []);

  return { restored, completed, replayRequested, complete };
}

/**
 * Puts the introduction back, for the button in Settings. Records the request
 * rather than clearing the marker: a cleared marker looks exactly like a first
 * visit, and a first visit by someone holding records is skipped on purpose.
 */
export function resetOnboarding(): boolean {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, serializeOnboarding(REPLAY_REQUEST));
    return true;
  } catch {
    return false;
  }
}
