interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex h-10 items-center overflow-x-auto border-b border-vm-border bg-vm-panel px-7 font-vm-mono">
      {steps.map((label, i) => {
        const state = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
        return (
          <div key={label} className="flex flex-shrink-0 items-center">
            <div className="flex items-center gap-2 pr-3.5">
              <div
                className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center border text-[9px] transition-colors ${
                  state === "active"
                    ? "border-vm-gold bg-vm-gold-bg text-vm-gold"
                    : state === "done"
                      ? "border-vm-green bg-vm-green-bg text-vm-green"
                      : "border-vm-dim text-vm-dim"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[9px] tracking-wider ${
                  state === "active" ? "text-vm-gold" : state === "done" ? "text-vm-green" : "text-vm-dim"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="mr-3.5 h-px w-6 bg-vm-border" />}
          </div>
        );
      })}
    </div>
  );
}
