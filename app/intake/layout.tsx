import { IntakeProvider } from "@/components/IntakeContext";

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return <IntakeProvider>{children}</IntakeProvider>;
}
