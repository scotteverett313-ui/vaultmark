"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { AMENDABLE_FIELDS, SEALED_FIELDS, fieldLabel } from "@/lib/amend";
import type { AmendResult } from "@/components/SessionContext";
import type { AmendableField, VaultPiece } from "@/lib/types";

const MULTILINE: AmendableField[] = ["provenance", "notes"];

interface AmendPanelProps {
  piece: VaultPiece;
  onAmend: (id: string, field: AmendableField, to: string, reason: string) => AmendResult;
}

// Correcting a sealed record. The key, the fingerprint, and the pixel hash are
// never touched here — a corrected description still verifies against exactly
// the image it was issued for, and every correction is kept on the record.
export default function AmendPanel({ piece, onAmend }: AmendPanelProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<AmendableField>("title");
  const [to, setTo] = useState(piece[field]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Start each field from its current value: an amendment is a correction of
  // what is there, not a blank slate.
  useEffect(() => {
    setTo(piece[field]);
    setError(null);
  }, [field, piece]);

  useEffect(() => {
    setOpen(false);
    setField("title");
    setReason("");
  }, [piece.id]);

  function submit() {
    const result = onAmend(piece.id, field, to, reason);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReason("");
    setError(null);
    showToast(`${fieldLabel(field)} amended — ${piece.certificateNumber}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border border-vm-border-2 px-3 py-2 font-vm-mono text-[11px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
      >
        ✎ Amend record
      </button>
    );
  }

  return (
    <div className="border border-vm-border bg-vm-bg p-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.08em] text-vm-dim">Amend record</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-vm-mono text-[11px] text-vm-dim transition-colors hover:text-vm-mid"
        >
          Cancel
        </button>
      </div>
      <p className="mb-2.5 text-[10px] leading-[1.7] text-vm-dim">
        Corrects the description only. The key is not reissued and the record keeps both values, dated. Sealed:{" "}
        {SEALED_FIELDS.join(", ")}.
      </p>

      <label htmlFor="amend-field" className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-vm-dim">
        Field
      </label>
      <select
        id="amend-field"
        value={field}
        onChange={(e) => setField(e.target.value as AmendableField)}
        className="mb-2 w-full cursor-pointer border border-vm-border bg-vm-surface px-2 py-1.5 font-vm-mono text-[13px] text-vm-ink outline-none focus:border-vm-gold-2"
      >
        {AMENDABLE_FIELDS.map((f) => (
          <option key={f.field} value={f.field}>
            {f.label}
          </option>
        ))}
      </select>

      <div className="mb-2 border border-vm-border bg-vm-surface px-2 py-1.5">
        <div className="text-[10px] uppercase tracking-[0.1em] text-vm-dim">Currently reads</div>
        <div className="mt-0.5 break-words text-[13px] leading-[1.6] text-vm-mid">{piece[field]}</div>
      </div>

      <label htmlFor="amend-to" className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-vm-dim">
        Corrected to
      </label>
      {MULTILINE.includes(field) ? (
        <textarea
          id="amend-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mb-2 min-h-[56px] w-full resize-y border border-vm-border bg-vm-surface p-2 font-vm-mono text-[13px] text-vm-ink outline-none focus:border-vm-gold-2"
        />
      ) : (
        <input
          id="amend-to"
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mb-2 w-full border border-vm-border bg-vm-surface px-2 py-1.5 font-vm-mono text-[13px] text-vm-ink outline-none focus:border-vm-gold-2"
        />
      )}

      <label htmlFor="amend-reason" className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-vm-dim">
        Reason — kept on the certificate
      </label>
      <input
        id="amend-reason"
        type="text"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError(null);
        }}
        placeholder="e.g. Title misspelled at intake"
        className="mb-2 w-full border border-vm-border bg-vm-surface px-2 py-1.5 font-vm-mono text-[13px] text-vm-ink outline-none placeholder:text-vm-dim focus:border-vm-gold-2"
      />

      {error && (
        <p className="mb-2 text-[11px] leading-[1.6] text-vm-red" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        className="w-full border border-vm-gold-2 bg-vm-gold-bg px-2 py-2 font-vm-mono text-[11px] uppercase tracking-[0.1em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
      >
        Record amendment
      </button>
    </div>
  );
}
