interface ScaffoldScreenProps {
  screenNumber: string;
  screenName: string;
  route: string;
  buildStep: string;
  description: string;
}

export default function ScaffoldScreen({
  screenNumber,
  screenName,
  route,
  buildStep,
  description,
}: ScaffoldScreenProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.25rem)] items-center justify-center p-8">
      <div className="w-full max-w-md border border-dashed border-vm-border-2 p-8 text-center">
        <div className="mb-2 text-[9px] tracking-[0.2em] text-vm-dim">
          SCREEN {screenNumber} · {route}
        </div>
        <div className="mb-3 font-vm-sans text-lg font-bold text-vm-ink">{screenName}</div>
        <p className="mb-4 text-[10px] leading-loose text-vm-mid">{description}</p>
        <div className="border-t border-vm-border pt-3 text-[9px] uppercase tracking-wider text-vm-gold">
          Scaffolded — {buildStep}
        </div>
      </div>
    </div>
  );
}
