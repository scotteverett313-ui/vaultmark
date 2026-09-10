import type { Metadata } from "next";
import StepIndicator from "@/components/StepIndicator";
import { INTAKE_STEPS } from "@/lib/intakeSteps";
import Label from "./Label";

export const metadata: Metadata = {
  title: "Label",
};

export default function LabelPage() {
  return (
    <>
      <StepIndicator steps={INTAKE_STEPS} currentStep={2} />
      <Label />
    </>
  );
}
