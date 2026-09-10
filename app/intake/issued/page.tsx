import StepIndicator from "@/components/StepIndicator";
import ScaffoldScreen from "@/components/internal/ScaffoldScreen";
import { INTAKE_STEPS } from "@/lib/intakeSteps";

export default function IssuedPage() {
  return (
    <>
      <StepIndicator steps={INTAKE_STEPS} currentStep={4} />
      <ScaffoldScreen
        screenNumber="06"
        screenName="Key Issued"
        route="/intake/issued"
        buildStep="Step 9 — Key Issued screen"
        description="Key delivery and certificate: the credential block, download and copy actions, certificate preview, and navigation to the next artwork or the library."
      />
    </>
  );
}
