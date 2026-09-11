"use client";

import { useToast } from "@/components/Toast";

interface KeyBlockProps {
  keyString: string;
  certificateNumber: string;
}

export default function KeyBlock({ keyString, certificateNumber }: KeyBlockProps) {
  const { showToast } = useToast();

  function handleCopy() {
    navigator.clipboard.writeText(keyString);
    showToast("Key copied to clipboard");
  }

  function handleDownload() {
    const blob = new Blob([keyString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${certificateNumber}-key.vmk`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Key downloaded — ${certificateNumber}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-20 overflow-y-auto break-all border border-vm-gold-2 bg-vm-surface p-3 font-vm-mono text-[10px] leading-loose text-vm-gold">
        {keyString}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={handleCopy}
          className="border border-vm-border-2 py-2 font-vm-mono text-[11px] uppercase tracking-wider text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
        >
          Copy Key
        </button>
        <button
          onClick={handleDownload}
          className="border border-vm-gold-2 bg-vm-gold-bg py-2 font-vm-mono text-[11px] uppercase tracking-wider text-vm-gold transition-colors hover:bg-[rgba(200,168,74,0.16)]"
        >
          ↓ Download .VMK
        </button>
      </div>
    </div>
  );
}
