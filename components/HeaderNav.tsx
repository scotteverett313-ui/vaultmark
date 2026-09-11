"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/SessionContext";

// Until now the library was only reachable from the Key Issued screen. Once a
// session exists there is always somewhere to go back to.
export default function HeaderNav() {
  const pathname = usePathname();
  const { restored, sessionType, pieceCount } = useSession();

  if (!restored || !sessionType || pathname === "/verify") return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="hidden items-center gap-2 text-[9px] tracking-[0.12em] text-vm-mid sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-vm-green shadow-[0_0_6px_#3A8A5A]" />
        {sessionType === "gallery" ? "GALLERY" : "PRIVATE"} · {pieceCount} VAULTED
      </span>
      {pathname !== "/library" && (
        <Link
          href="/library"
          className="whitespace-nowrap border border-vm-border-2 px-2.5 py-1 font-vm-mono text-[9px] uppercase tracking-[0.12em] text-vm-mid transition-colors hover:border-vm-gold hover:text-vm-gold"
        >
          ⊞ Library
        </Link>
      )}
    </div>
  );
}
