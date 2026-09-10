"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useIntake } from "@/components/IntakeContext";
import { useSession } from "@/components/SessionContext";
import { buildVaultPiece, certificateNumber, formatDimensions, formatEdition } from "@/lib/records";

const THUMBNAIL_SIZE = 120;

export default function Confirm() {
  const router = useRouter();
  const { restored, sessionType, pieceCount, addPiece } = useSession();
  const { captured, vault, label } = useIntake();
  const [attested, setAttested] = useState(false);
  const [sealing, setSealing] = useState(false);

  if (restored && !sessionType) {
    return <Gate href="/" cta="Choose a session →" title="No active session" body="Intake needs a session type before a record can be sealed." />;
  }
  if (!vault || !captured) {
    return (
      <Gate
        href="/intake/vault"
        cta="Go to vault →"
        title="Nothing to confirm"
        body="This step reviews a vaulted piece. Generate the pixel key first."
      />
    );
  }
  if (!label.title.trim() || !label.artist.trim()) {
    return (
      <Gate
        href="/intake/label"
        cta="Go to label →"
        title="Record incomplete"
        body="A vault record cannot be sealed without a title and artist name."
      />
    );
  }

  async function seal() {
    if (!attested || sealing || !vault || !captured) return;
    setSealing(true);

    const canvas = document.createElement("canvas");
    canvas.width = THUMBNAIL_SIZE;
    canvas.height = THUMBNAIL_SIZE;
    const ctx = canvas.getContext("2d");
    const source = await createImageBitmap(captured.pixels);
    ctx?.drawImage(source, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

    addPiece(buildVaultPiece({ label, vault, captured, pieceCount, thumbnailUrl: canvas.toDataURL("image/jpeg", 0.8) }));

    // The seal is meant to land with some weight rather than blink past.
    setTimeout(() => router.push("/intake/issued"), 900);
  }

  const isGallery = sessionType === "gallery";
  const attestation = isGallery
    ? `I, ${label.signatory.trim() || "[signatory]"}, on behalf of ${label.gallery.trim() || "[gallery]"}, attest that the work described above is the authentic original, that we are authorized to vault it on behalf of the named artist, and that all information provided is accurate and complete to the best of our knowledge. I understand this record is cryptographically sealed.`
    : `I, ${label.artist.trim()}, attest that the work described above is my original creation, that I am the sole owner of all rights, and that all information provided is accurate and complete. I understand this vault record is cryptographically sealed.`;

  return (
    <div className="pb-40 md:pb-0">
      <div className="grid gap-5 p-5 lg:grid-cols-2 lg:p-6">
        <Block title="Artwork Details">
          <Row label="Title" value={label.title} />
          <Row label="Artist" value={label.artist} />
          <Row label="Year" value={label.year || "—"} />
          <Row label="Medium" value={label.medium || "—"} />
          <Row label="Dimensions" value={formatDimensions(label)} />
          <Row label="Weight" value={label.weight || "—"} />
          <Row label="Edition" value={formatEdition(label)} />
        </Block>

        <Block title="Vault Record">
          <Row label="Vault ID" value={vault.key.vaultId} gold />
          <Row label="Certificate" value={certificateNumber(pieceCount)} gold />
          <Row label="QR Symbol" value={vault.key.qrSymbol} />
          <Row label="Masked Pixels" value={String(vault.key.maskedCount)} />
          <Row label="Image Fingerprint" value={captured.fingerprint} gold />
          <Row label="Pixel Hash" value={vault.key.pixelHash} gold />
          <Row label="Capture Source" value={captured.source === "camera" ? "Camera — lossy master" : "Upload — lossless"} />
        </Block>

        <Block title="Provenance">
          <Row label="Provenance" value={label.provenance || "—"} />
          <Row label="Appraised Value" value={label.value || "—"} />
          <Row label="Appraiser" value={label.appraiser || "—"} />
          <Row label="Notes" value={label.notes || "—"} />
        </Block>

        <Block title="Session">
          <Row label="Type" value={isGallery ? "Gallery / Institution" : "Private Collector / Artist"} />
          <Row label="Gallery" value={label.gallery || "—"} />
          <Row label="Signatory" value={label.signatory || "—"} />
          <Row label="Timestamp" value={vault.key.issuedAt} />
        </Block>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-vm-border bg-vm-panel md:static md:border-t-0 md:bg-transparent">
        <div className="p-4 md:px-6 md:pb-8 md:pt-0">
          <div className="flex items-start gap-3 border border-vm-border-2 bg-vm-surface p-4">
            <button
              type="button"
              role="checkbox"
              aria-checked={attested}
              onClick={() => setAttested((v) => !v)}
              className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border text-[10px] transition-colors ${
                attested ? "border-vm-green bg-vm-green-bg text-vm-green" : "border-vm-border-2 bg-vm-bg text-transparent"
              }`}
            >
              ✓
            </button>
            <label
              onClick={() => setAttested((v) => !v)}
              className="cursor-pointer text-[10px] leading-[1.9] text-vm-mid md:max-h-none max-h-24 overflow-y-auto"
            >
              {attestation}
            </label>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/intake/label"
              className="border border-vm-border-2 px-3 py-3 font-vm-mono text-[10px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
            >
              ← Label
            </Link>
            <button
              type="button"
              onClick={seal}
              disabled={!attested || sealing}
              className={`relative flex-1 overflow-hidden border px-4 py-3 font-vm-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                sealing
                  ? "border-vm-green bg-vm-green-bg text-vm-green"
                  : "border-vm-gold-2 bg-vm-gold-bg text-vm-gold hover:bg-[rgba(200,168,74,0.16)]"
              } disabled:pointer-events-none disabled:opacity-30`}
            >
              <span className="relative z-10">{sealing ? "Sealing vault…" : "Seal Vault & Issue Key"}</span>
              {sealing && <span className="absolute inset-y-0 left-0 z-0 animate-[vm-seal_900ms_ease-out_forwards] bg-[rgba(58,138,90,0.35)]" />}
            </button>
          </div>
          <p className="mt-2 text-[9px] leading-[1.7] text-vm-dim">
            Sealing writes this record to the session and issues the key. It cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-vm-border bg-vm-surface p-4">
      <h2 className="mb-3 border-b border-vm-border pb-2 text-[9px] uppercase tracking-[0.12em] text-vm-dim">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vm-border py-1.5 last:border-b-0">
      <dt className="flex-shrink-0 text-[9px] text-vm-mid">{label}</dt>
      <dd className={`break-all text-right text-[10px] ${gold ? "text-vm-gold" : "text-vm-ink"}`}>{value}</dd>
    </div>
  );
}

function Gate({ href, cta, title, body }: { href: string; cta: string; title: string; body: string }) {
  return (
    <div className="flex min-h-[calc(100vh-6.75rem)] items-center justify-center p-8">
      <div className="w-full max-w-sm border border-vm-border-2 bg-vm-surface p-6 text-center">
        <div className="mb-2 font-vm-sans text-sm font-bold text-vm-ink">{title}</div>
        <p className="mb-4 text-[10px] leading-loose text-vm-mid">{body}</p>
        <Link
          href={href}
          className="inline-block border border-vm-gold-2 bg-vm-gold-bg px-4 py-2.5 font-vm-mono text-[10px] uppercase tracking-[0.12em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
