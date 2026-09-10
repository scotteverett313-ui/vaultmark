import ScaffoldNotice from "@/components/internal/ScaffoldNotice";
import type { VerifyResult } from "@/lib/engine";

interface VerifyPanelProps {
  onVerify?: (image: File, key: string) => Promise<void>;
  result?: VerifyResult | null;
}

export default function VerifyPanel(_props: VerifyPanelProps) {
  return <ScaffoldNotice component="VerifyPanel" buildStep="Step 13 — Public Verify page" />;
}
