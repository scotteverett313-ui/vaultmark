"use client";

import type { Completeness, RecordField } from "@/lib/completeness";

interface RecordReadinessProps {
  completeness: Completeness;
  /** Set once the user has been shown the gaps and chosen to continue. */
  acknowledged?: boolean;
  className?: string;
}

// Amendments after sealing are permanent and public, so the cheapest place to
// get a record right is here. This panel names every gap before the key is
// issued rather than leaving the user to notice one on the certificate.
export default function RecordReadiness({ completeness, acknowledged, className }: RecordReadinessProps) {
  const { missing, missingRequired, filled, total, complete } = completeness;

  function focusField(field: RecordField) {
    const input = document.getElementById(field.id);
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
    input?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-live="polite"
      className={`border p-4 ${complete ? "border-vm-green bg-vm-green-bg" : "border-vm-border-2 bg-vm-surface"} ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-vm-border pb-2">
        <h2 className="text-[9px] uppercase tracking-[0.14em] text-vm-dim">Record readiness</h2>
        <span className={`font-vm-mono text-[10px] ${complete ? "text-vm-green" : "text-vm-gold"}`}>
          {filled} of {total} complete
        </span>
      </div>

      {complete ? (
        <p className="mt-2.5 text-[10px] leading-[1.8] text-vm-green">
          ✓ Every expected field is filled. This record is ready to seal.
        </p>
      ) : (
        <>
          <p className="mt-2.5 text-[10px] leading-[1.8] text-vm-mid">
            A sealed record cannot be rewritten — later corrections are appended as dated amendments that stay on the
            certificate. Fill these in now:
          </p>
          <ul className="mt-2.5 flex flex-col gap-px bg-vm-border">
            {missing.map((field) => (
              <li key={field.id} className="flex items-start gap-3 bg-vm-panel px-3 py-2">
                <span
                  className={`mt-px flex-shrink-0 border px-1.5 py-0.5 font-vm-mono text-[8px] uppercase tracking-[0.1em] ${
                    field.tier === "required"
                      ? "border-vm-red text-vm-red"
                      : "border-vm-border-2 text-vm-dim"
                  }`}
                >
                  {field.tier === "required" ? "Required" : "Expected"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-vm-ink">{field.label}</div>
                  <p className="mt-0.5 text-[9px] leading-[1.6] text-vm-dim">{field.why}</p>
                </div>
                <button
                  type="button"
                  onClick={() => focusField(field)}
                  className="flex-shrink-0 border border-vm-border-2 px-2 py-1 font-vm-mono text-[8px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
                >
                  Fill
                </button>
              </li>
            ))}
          </ul>

          {acknowledged && missingRequired.length === 0 && (
            <p className="mt-2.5 text-[9px] leading-[1.7] text-vm-amber">
              You can seal without these. They will read “—” on the certificate, and correcting them later leaves a
              visible amendment.
            </p>
          )}
        </>
      )}
    </section>
  );
}
