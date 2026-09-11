"use client";

import VerifyPanel from "@/components/VerifyPanel";
import { useSession } from "@/components/SessionContext";

export default function Verify() {
  const { pieces } = useSession();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:py-14">
      <h1 className="font-vm-sans text-3xl font-bold text-vm-ink">Verify an artwork</h1>
      <p className="mt-2 max-w-[60ch] text-[14px] leading-[2] text-vm-mid">
        Supply the image and the key issued with it. Vaultmark re-derives the authentication from the pixels
        themselves and tells you whether they belong together. Nothing is uploaded or stored — the check runs entirely
        in your browser.
      </p>

      <div className="mt-8">
        <VerifyPanel lookupRecord={(vaultId) => pieces.find((p) => p.id === vaultId)} />
      </div>
    </div>
  );
}
