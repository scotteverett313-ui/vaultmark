"use client";

import { useRef, useState } from "react";
import { loadImage, toVaultSquare } from "@/lib/capture";
import { decodeVaultKey, verifyVaultKey, type VerifyResult } from "@/lib/engine";
import type { VaultPiece } from "@/lib/types";

type Outcome =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "unreadable"; reason: string }
  | { kind: "done"; result: VerifyResult; vaultId: string; issuedAt: string; qrSymbol: string; maskedCount: number };

const LAYER_LABELS: [keyof Omit<VerifyResult, "pass">, string][] = [
  ["fingerprint", "Vault fingerprint"],
  ["maskReconstruction", "QR mask reconstruction"],
  ["pixelHash", "Pixel hash"],
];

// Given a verified vault ID, the record from this device's own library if it
// happens to hold one — the key itself carries no title or artist.
type RecordLookup = (vaultId: string) => VaultPiece | undefined;

export default function VerifyPanel({ lookupRecord }: { lookupRecord?: RecordLookup }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [keyText, setKeyText] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  function chooseFile(next: File | null) {
    setFile(next);
    setOutcome({ kind: "idle" });
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return next ? URL.createObjectURL(next) : null;
    });
  }

  async function run() {
    if (!file || !keyText.trim()) return;
    setOutcome({ kind: "working" });

    const key = decodeVaultKey(keyText.trim());
    if (!key) {
      setOutcome({ kind: "unreadable", reason: "That key could not be decoded. Check it was pasted in full." });
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      const square = toVaultSquare(image);
      if (!square) {
        setOutcome({ kind: "unreadable", reason: "This browser could not read the image." });
        return;
      }
      const result = await verifyVaultKey(square.pixels, key);
      setOutcome({
        kind: "done",
        result,
        vaultId: key.vaultId,
        issuedAt: key.issuedAt,
        qrSymbol: key.qrSymbol,
        maskedCount: key.maskedCount,
      });
    } catch {
      setOutcome({ kind: "unreadable", reason: "That file could not be read as an image." });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const record = outcome.kind === "done" && outcome.result.pass ? lookupRecord?.(outcome.vaultId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[9px] uppercase tracking-[0.12em] text-vm-dim">1 · The image</div>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files[0];
              if (dropped) chooseFile(dropped);
            }}
            className="flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden border border-dashed border-vm-border-2 bg-vm-surface p-4 text-center transition-colors hover:border-vm-gold-2"
          >
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview} alt="" className="max-h-[180px] w-auto" />
            ) : (
              <>
                <span className="text-2xl text-vm-dim">⬡</span>
                <span className="font-vm-sans text-xs font-bold text-vm-ink">Drop the artwork or browse</span>
                <span className="text-[9px] text-vm-mid">The copy you want checked</span>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                chooseFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>
          {file && <p className="mt-1.5 truncate text-[9px] text-vm-dim">{file.name}</p>}
        </div>

        <div>
          <div className="mb-1.5 text-[9px] uppercase tracking-[0.12em] text-vm-dim">2 · The key</div>
          <textarea
            value={keyText}
            onChange={(e) => {
              setKeyText(e.target.value);
              setOutcome({ kind: "idle" });
            }}
            placeholder="Paste the .vmk credential supplied with the work…"
            aria-label="Key credential"
            className="min-h-[168px] w-full resize-y border border-vm-border bg-vm-surface p-3 font-vm-mono text-[9px] leading-[1.8] text-vm-ink outline-none transition-colors placeholder:text-vm-dim focus:border-vm-gold-2"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={!file || !keyText.trim() || outcome.kind === "working"}
        className="w-full border border-vm-gold-2 bg-vm-gold-bg px-4 py-3.5 font-vm-mono text-[11px] uppercase tracking-[0.15em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)] disabled:pointer-events-none disabled:opacity-30"
      >
        {outcome.kind === "working" ? "Checking…" : "Run Verification"}
      </button>

      {outcome.kind === "unreadable" && (
        <div className="border border-vm-red p-4" role="status">
          <div className="mb-1 font-vm-sans text-sm font-bold text-vm-red">Could not check</div>
          <p className="text-[10px] leading-[1.8] text-vm-mid">{outcome.reason}</p>
        </div>
      )}

      {outcome.kind === "done" && (
        <div
          className={`border p-5 ${outcome.result.pass ? "border-vm-green bg-vm-green-bg" : "border-vm-red"}`}
          role="status"
        >
          <div className={`font-vm-sans text-xl font-bold ${outcome.result.pass ? "text-vm-green" : "text-vm-red"}`}>
            {outcome.result.pass ? "✓ Authenticated" : "✕ Not authenticated"}
          </div>
          <p className="mt-1 text-[10px] leading-[1.8] text-vm-mid">
            {outcome.result.pass
              ? "This image is the original this key was issued for. All three layers agree."
              : "This image and key do not belong together. Any failed layer below is enough to reject it."}
          </p>

          <dl className="mt-4 flex flex-col gap-px bg-vm-border">
            {LAYER_LABELS.map(([field, label], i) => {
              const layer = outcome.result[field];
              return (
                <div key={field} className="flex items-start gap-3 bg-vm-panel p-3">
                  <span className={`text-sm leading-none ${layer.pass ? "text-vm-green" : "text-vm-red"}`}>
                    {layer.pass ? "✓" : "✕"}
                  </span>
                  <div>
                    <div className="text-[10px] text-vm-ink">
                      Layer {i + 1} · {label}
                    </div>
                    <div className="mt-0.5 text-[9px] leading-[1.7] text-vm-mid">{layer.detail}</div>
                  </div>
                </div>
              );
            })}
          </dl>

          <dl className="mt-4 grid gap-px bg-vm-border sm:grid-cols-2">
            <Fact label="Vault ID" value={outcome.vaultId} />
            <Fact label="QR Symbol" value={outcome.qrSymbol} />
            <Fact label="Masked Pixels" value={String(outcome.maskedCount)} />
            <Fact label="Key Issued" value={outcome.issuedAt} />
          </dl>

          {record && (
            <div className="mt-4 border border-vm-border-2 p-3">
              <div className="mb-2 text-[9px] uppercase tracking-[0.12em] text-vm-dim">
                Record — from this device&apos;s library
              </div>
              <dl className="grid gap-px bg-vm-border sm:grid-cols-2">
                <Fact label="Title" value={record.title} />
                <Fact label="Artist" value={record.artist} />
                <Fact label="Certificate" value={record.certificateNumber} />
                <Fact label="Edition" value={record.edition} />
                {record.gallery !== "—" && <Fact label="Gallery" value={record.gallery} />}
              </dl>
            </div>
          )}

          {outcome.result.pass && !record && (
            <p className="mt-3 text-[9px] leading-[1.7] text-vm-dim">
              A key proves which vault entry an image belongs to. Title, artist, and certificate live with whoever holds
              the record — this browser has no entry for {outcome.vaultId}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-vm-panel px-3 py-2">
      <dt className="mb-0.5 text-[8px] uppercase tracking-[0.1em] text-vm-dim">{label}</dt>
      <dd className="break-all text-[10px] text-vm-ink">{value}</dd>
    </div>
  );
}
