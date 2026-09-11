import type { Metadata } from "next";
import Verify from "./Verify";

export const metadata: Metadata = {
  title: "Verify",
  description: "Check an artwork against the key issued for it. Runs in your browser; nothing is uploaded.",
};

export default function VerifyPage() {
  return <Verify />;
}
