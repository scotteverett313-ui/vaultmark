import type { Metadata } from "next";
import StepIndicator from "@/components/StepIndicator";
import { INTAKE_STEPS } from "@/lib/intakeSteps";
import Issued from "./Issued";

export const metadata: Metadata = {
  title: "Key Issued",
};

export default function IssuedPage() {
  return (
    <>
      <StepIndicator steps={INTAKE_STEPS} currentStep={4} />
      <Issued />
    </>
  );
}
