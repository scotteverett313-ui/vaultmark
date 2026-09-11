"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LabelForm from "@/components/LabelForm";
import { useIntake, type LabelDraft } from "@/components/IntakeContext";
import { useSession } from "@/components/SessionContext";
import { useProfile } from "@/components/ProfileContext";
import { mergeArtists } from "@/lib/profile";
import { certificateNumber } from "@/lib/records";

type LabelErrors = Partial<Record<keyof LabelDraft, string>>;

export default function Label() {
  const router = useRouter();
  const { restored, sessionType, pieceCount, pieces } = useSession();
  const { captured, vault, label, updateLabel } = useIntake();
  const { profile, restored: profileRestored } = useProfile();
  const [errors, setErrors] = useState<LabelErrors>({});
  const prefilled = useRef(false);

  // Fill the gallery fields from the saved profile once, and only into blanks,
  // so a deliberate edit is never overwritten on a return visit to this step.
  useEffect(() => {
    if (!profileRestored || prefilled.current || sessionType !== "gallery") return;
    prefilled.current = true;
    const patch: Partial<typeof label> = {};
    if (!label.gallery && profile.galleryName) patch.gallery = profile.galleryName;
    if (!label.signatory && profile.signatory) patch.signatory = profile.signatory;
    if (Object.keys(patch).length) updateLabel(patch);
  }, [profileRestored, sessionType, profile, label, updateLabel]);

  if (restored && !sessionType) {
    return <Gate href="/" cta="Choose a session →" title="No active session" body="Intake needs a session type before a record can be written." />;
  }
  if (!vault || !captured) {
    return (
      <Gate
        href="/intake/vault"
        cta="Go to vault →"
        title="No key generated"
        body="The label records a vaulted piece. Generate the pixel key first — its vault ID, hashes, and symbol fill this form's locked fields."
      />
    );
  }

  function proceed() {
    const next: LabelErrors = {};
    if (!label.title.trim()) next.title = "Title is required";
    if (!label.artist.trim()) next.artist = "Artist name is required";
    setErrors(next);

    if (Object.keys(next).length > 0) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    router.push("/intake/confirm");
  }

  const vaultRecord = [
    { label: "Vault ID", value: vault.key.vaultId },
    { label: "Certificate No.", value: certificateNumber(pieceCount), copyable: true },
    { label: "QR Symbol", value: vault.key.qrSymbol },
    { label: "Masked Pixels", value: String(vault.key.maskedCount) },
    { label: "Image Fingerprint", value: captured.fingerprint },
    { label: "Pixel Hash", value: vault.key.pixelHash },
    { label: "Vaulted At", value: vault.key.issuedAt },
    { label: "Capture Source", value: captured.source === "camera" ? "Camera — lossy master" : "Upload — lossless" },
  ];

  return (
    <div className="pb-24 md:pb-0">
      <LabelForm
        value={label}
        onChange={(patch) => {
          updateLabel(patch);
          // Clear a field's error as soon as it has content again.
          setErrors((prev) => {
            const key = Object.keys(patch)[0] as keyof LabelDraft;
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }}
        sessionType={sessionType ?? "private"}
        vaultRecord={vaultRecord}
        errors={errors}
        artistSuggestions={mergeArtists(profile.artists, pieces.map((p) => p.artist))}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-vm-border bg-vm-panel p-4 md:static md:border-t-0 md:bg-transparent md:px-6 md:pb-8 md:pt-0">
        <div className="flex items-center gap-3">
          <Link
            href="/intake/vault"
            className="border border-vm-border-2 px-3 py-3 font-vm-mono text-[10px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
          >
            ← Vault
          </Link>
          <button
            type="button"
            onClick={proceed}
            className="flex-1 border border-vm-gold-2 bg-vm-gold-bg px-4 py-3 font-vm-mono text-[10px] uppercase tracking-[0.14em] text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)] md:max-w-xs"
          >
            Review &amp; Confirm →
          </button>
        </div>
        {Object.keys(errors).length > 0 && (
          <p className="mt-2 text-[9px] text-vm-red">Title and artist name are required before this record can be sealed.</p>
        )}
      </div>
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
