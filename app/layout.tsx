import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { SessionProvider } from "@/components/SessionContext";

export const metadata: Metadata = {
  title: {
    default: "Vaultmark — Digital Art Authentication",
    template: "%s | Vaultmark",
  },
  description:
    "Pixel-mask authentication for original artwork — vault the original, hold the key, verify anywhere.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-vm-bg font-vm-mono text-xs text-vm-ink">
        <SessionProvider>
          <ToastProvider>
            <header className="sticky top-0 z-50 flex h-[3.25rem] items-center gap-5 border-b border-vm-border bg-vm-panel px-7">
              <span className="text-base font-bold tracking-[0.2em] text-vm-gold">VAULTMARK</span>
              <span className="text-[9px] tracking-[0.12em] text-vm-dim">DIGITAL ART AUTHENTICATION</span>
            </header>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
