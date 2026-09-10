import type { Metadata } from "next";
import StepIndicator from "@/components/StepIndicator";
import { INTAKE_STEPS } from "@/lib/intakeSteps";
import Vault from "./Vault";

export const metadata: Metadata = {
  title: "Vault",
};

export default function VaultPage() {
  return (
    <>
      <StepIndicator steps={INTAKE_STEPS} currentStep={1} />
      <Vault />
    </>
  );
}
