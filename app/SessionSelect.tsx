"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Palette } from "lucide-react";
import { useSession } from "@/components/SessionContext";
import type { SessionType } from "@/lib/types";

const SESSION_OPTIONS = [
  {
    type: "gallery" as SessionType,
    Icon: Landmark,
    title: "Gallery / Institution",
    description:
      "Upload on behalf of artists. Co-sign vault records. Route keys to artist accounts. Manage bulk intake of multiple works per session.",
  },
  {
    type: "private" as SessionType,
    Icon: Palette,
    title: "Private Collector / Artist",
    description:
      "Upload and vault your own work. Self-attest ownership. Hold your own key. Simple solo flow — one person, total control.",
  },
];

export default function SessionSelect() {
  const router = useRouter();
  const { restored, sessionType, pieceCount, sessionPieceCount, startSession } = useSession();
  const [selected, setSelected] = useState<SessionType | null>(null);

  const hasActiveSession = restored && sessionType !== null;

  function beginSession() {
    if (!selected) return;
    startSession(selected);
    router.push("/intake/capture");
  }

  return (
    <div className="flex min-h-[calc(100vh-3.25rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-[560px]">
        <div className="mb-2 text-[11px] tracking-[0.2em] text-vm-dim">VAULTMARK · INTAKE WORKFLOW</div>
        <h1 className="mb-1.5 font-vm-sans text-2xl font-bold tracking-[0.05em] text-vm-ink sm:text-[28px]">
          Who is logging in today?
        </h1>
        <p className="mb-8 text-[11px] leading-[1.8] text-vm-mid">
          Your session type determines the label format, attestation language, and key routing. You can switch between
          pieces at any time.
        </p>

        {hasActiveSession && (
          <div className="mb-6 flex flex-wrap items-center gap-3 border border-vm-border-2 bg-vm-surface px-4 py-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vm-green shadow-[0_0_6px_#3A8A5A]" />
            <span className="text-[10px] text-vm-mid">
              {sessionType === "gallery" ? "Gallery" : "Private"} session in progress · {sessionPieceCount}{" "}
              {sessionPieceCount === 1 ? "piece" : "pieces"} vaulted this session
            </span>
            <button
              type="button"
              onClick={() => router.push("/library")}
              className="ml-auto border border-vm-border-2 px-3 py-1.5 font-vm-mono text-[9px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
            >
              Continue →
            </button>
          </div>
        )}

        <fieldset className="border-0 p-0">
          <legend className="sr-only">Session type</legend>
          <div className="grid gap-px bg-vm-border sm:grid-cols-2">
            {SESSION_OPTIONS.map(({ type, Icon, title, description }) => {
              const isSelected = selected === type;
              const isDimmed = selected !== null && !isSelected;
              return (
                <label
                  key={type}
                  className={`cursor-pointer border-2 p-5 transition-all has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-vm-gold sm:p-6 ${
                    isSelected ? "border-vm-gold bg-vm-gold-bg" : "border-transparent bg-vm-surface hover:bg-vm-panel"
                  } ${isDimmed ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="session-type"
                    value={type}
                    checked={isSelected}
                    onChange={() => setSelected(type)}
                    className="sr-only"
                  />
                  <Icon className="mb-3 h-6 w-6 text-vm-gold" strokeWidth={1.5} aria-hidden />
                  <div className="mb-1.5 font-vm-sans text-[13px] font-bold text-vm-ink">{title}</div>
                  <p className="text-[10px] leading-[1.8] text-vm-mid">{description}</p>
                </label>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={beginSession}
          disabled={!selected}
          className="mt-5 w-full border border-vm-gold-2 bg-vm-gold-bg px-4 py-3.5 font-vm-mono text-[11px] uppercase tracking-[0.15em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)] disabled:pointer-events-none disabled:opacity-30"
        >
          {hasActiveSession ? "Begin New Session →" : "Begin Session →"}
        </button>

        {pieceCount > 0 && (
          <p className="mt-2 text-[9px] leading-relaxed text-vm-dim">
            Your collection of {pieceCount} {pieceCount === 1 ? "piece" : "pieces"} is kept. A session only sets the
            attestation wording and dates the intake — starting one never clears what you have vaulted.
          </p>
        )}
      </div>
    </div>
  );
}
