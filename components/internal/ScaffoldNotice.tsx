export default function ScaffoldNotice({
  component,
  buildStep,
}: {
  component: string;
  buildStep: string;
}) {
  return (
    <div className="border border-dashed border-vm-border-2 p-4 text-center font-vm-mono">
      <div className="mb-1 text-[10px] text-vm-ink">{component}</div>
      <div className="text-[9px] uppercase tracking-wider text-vm-dim">Scaffolded — {buildStep}</div>
    </div>
  );
}
