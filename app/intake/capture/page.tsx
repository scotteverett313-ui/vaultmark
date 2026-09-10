import type { Metadata } from "next";
import StepIndicator from "@/components/StepIndicator";
import { INTAKE_STEPS } from "@/lib/intakeSteps";
import Capture from "./Capture";

export const metadata: Metadata = {
  title: "Capture",
};

export default function CapturePage() {
  return (
    <>
      <StepIndicator steps={INTAKE_STEPS} currentStep={0} />
      <Capture />
    </>
  );
}
