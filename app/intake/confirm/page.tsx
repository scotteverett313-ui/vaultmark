import type { Metadata } from "next";
import StepIndicator from "@/components/StepIndicator";
import { INTAKE_STEPS } from "@/lib/intakeSteps";
import Confirm from "./Confirm";

export const metadata: Metadata = {
  title: "Confirm & Sign",
};

export default function ConfirmPage() {
  return (
    <>
      <StepIndicator steps={INTAKE_STEPS} currentStep={3} />
      <Confirm />
    </>
  );
}
