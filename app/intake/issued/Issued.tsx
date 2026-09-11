"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CertificateCard from "@/components/CertificateCard";
import { useIntake } from "@/components/IntakeContext";
import { useSession } from "@/components/SessionContext";
import { useToast } from "@/components/Toast";
import { buildCertificateText } from "@/lib/records";
import type { VaultPiece } from "@/lib/types";

export default function Issued() {
  const router = useRouter();
  const { restored, sessionType, pieces } = useSession();
  const { resetIntake } = useIntake();
  const { showToast } = useToast();
  const [backedUp, setBackedUp] = useState(false);

  const piece = pieces[pieces.length - 1];

  if (restored && !piece) {
    return (
      <div className="flex min-h-[calc(100vh-6.75rem)] items-center justify-center p-8">
        <div className="w-full max-w-sm border border-vm-border-2 bg-vm-surface p-6 text-center">
          <div className="mb-2 font-vm-sans text-base font-bold text-vm-ink">No key issued yet</div>
          <p className="mb-4 text-[13px] leading-loose text-vm-mid">
            This screen shows the credential for a sealed piece. Nothing has been sealed in this session.
          </p>
          <Link
            href="/intake/capture"
            className="inline-block border border-vm-gold-2 bg-vm-gold-bg px-4 py-2.5 font-vm-mono text-[13px] uppercase tracking-[0.12em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
          >
            Start an intake →
          </Link>
        </div>
      </div>
    );
  }

  if (!piece) return null;

  function download(contents: string, filename: string, type: string, message: string) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(message);
  }

  function downloadKey(p: VaultPiece) {
    download(p.key, `${p.certificateNumber}-key.vmk`, "text/plain", `Key downloaded — ${p.certificateNumber}`);
    setBackedUp(true);
  }

  function nextArtwork() {
    resetIntake();
    router.push("/intake/capture");
  }

  const context =
    sessionType === "gallery"
      ? `The vault is sealed. This credential was issued for “${piece.title}” by ${piece.artist}. Route it to the artist's account — Vaultmark does not retain a copy.`
      : `The vault is sealed. This credential is the only copy. Download it now — once it is lost, it cannot be recovered from Vaultmark.`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 py-10 lg:py-14">
      <div className="flex h-16 w-16 animate-[vm-badge_600ms_ease-out] items-center justify-center rounded-full border-2 border-vm-green text-3xl text-vm-green shadow-[0_0_24px_rgba(58,138,90,0.3)]">
        ✦
      </div>

      <div className="text-center">
        <h1 className="font-vm-sans text-2xl font-bold text-vm-ink">Vault Sealed — Key Issued</h1>
        <p className="mt-1 font-vm-serif text-lg italic text-vm-mid">
          {piece.title} · {piece.artist}
        </p>
      </div>

      <p className="max-w-lg text-center text-[14px] leading-[2] text-vm-mid">{context}</p>

      <div className="w-full">
        <div className="mb-2 text-[11px] uppercase tracking-[0.15em] text-vm-dim">Key Credential</div>
        <div className="max-h-20 overflow-y-auto break-all border border-vm-gold-2 bg-vm-surface p-3 font-vm-mono text-[11px] leading-[1.9] text-vm-gold">
          {piece.key}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => downloadKey(piece)}
            className="border border-vm-green bg-vm-green-bg px-3 py-3 font-vm-mono text-[13px] uppercase tracking-[0.12em] text-vm-green transition-colors hover:bg-[rgba(58,138,90,0.2)]"
          >
            ↓ Download .VMK
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(piece.key);
              showToast("Key copied to clipboard");
              setBackedUp(true);
            }}
            className="border border-vm-border-2 px-3 py-3 font-vm-mono text-[13px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
          >
            Copy Key
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                buildCertificateText(piece),
                `${piece.certificateNumber}-certificate.txt`,
                "text/plain",
                `Certificate downloaded — ${piece.certificateNumber}`,
              )
            }
            className="border border-vm-border-2 px-3 py-3 font-vm-mono text-[13px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
          >
            ↓ Certificate
          </button>
        </div>
      </div>

      <div
        className={`w-full border p-4 transition-colors ${
          backedUp ? "border-vm-green bg-vm-green-bg" : "border-vm-amber bg-vm-surface"
        }`}
      >
        {backedUp ? (
          <p className="text-[13px] leading-[1.9] text-vm-green">
            ✓ Key backed up. Keep a second copy somewhere you control — Vaultmark cannot reissue it.
          </p>
        ) : (
          <>
            <p className="text-[13px] leading-[1.9] text-vm-amber">
              Have you saved this key to a second location? It exists nowhere else. If it is lost, this piece can never
              be verified against its original again.
            </p>
            <button
              type="button"
              onClick={() => setBackedUp(true)}
              className="mt-2.5 border border-vm-border-2 px-3 py-2 font-vm-mono text-[11px] uppercase tracking-[0.1em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
            >
              I've saved it elsewhere
            </button>
          </>
        )}
      </div>

      <CertificateCard piece={piece} />

      <div className="w-full border-t border-vm-border pt-6">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={nextArtwork}
            disabled={!backedUp}
            className="border border-vm-gold-2 bg-vm-gold-bg px-4 py-3.5 font-vm-mono text-[14px] uppercase tracking-[0.14em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)] disabled:pointer-events-none disabled:opacity-30"
          >
            + Vault Next Artwork →
          </button>
          <button
            type="button"
            onClick={() => router.push("/library")}
            disabled={!backedUp}
            className="border border-vm-border-2 px-4 py-3.5 font-vm-mono text-[14px] uppercase tracking-[0.14em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold disabled:pointer-events-none disabled:opacity-30"
          >
            Go to Library
          </button>
        </div>
        {!backedUp && (
          <p className="mt-2 text-center text-[11px] text-vm-dim">
            Save the key before moving on — leaving this screen without it means losing it.
          </p>
        )}
      </div>
    </div>
  );
}
