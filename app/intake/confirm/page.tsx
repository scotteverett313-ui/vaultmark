import StepIndicator from "@/components/StepIndicator";
import ScaffoldScreen from "@/components/internal/ScaffoldScreen";
import { INTAKE_STEPS } from "@/lib/intakeSteps";

export default function ConfirmPage() {
  return (
    <>
      <StepIndicator steps={INTAKE_STEPS} currentStep={3} />
      <ScaffoldScreen
        screenNumber="05"
        screenName="Confirm & Sign"
        route="/intake/confirm"
        buildStep="Step 8 — Confirm screen"
        description="Full record review, legal attestation, and the non-reversible seal action that triggers key issuance."
      />
    </>
  );
}
