import { ShieldCheck, Camera, Mic, UserCheck } from "lucide-react";

const points = [
  {
    icon: Camera,
    title: "Confirm every scan",
    body: "No medicine is ever saved to your library without your yes. If a scan looks wrong, just say so and we'll try again.",
  },
  {
    icon: Mic,
    title: "Speak uncertainty clearly",
    body: "When a scan has low confidence, MedBox tells you plainly and asks you to rescan rather than guessing quietly.",
  },
  {
    icon: UserCheck,
    title: "Advise, never prescribe",
    body: "MedBox helps you track and remember. Any question about interactions, dosing, or side effects goes to a pharmacist or doctor.",
  },
];

export default function Safety() {
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-coral" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-coral">Your safety</span>
      </div>
      <h1 className="mt-2 text-[34px] font-extrabold tracking-tight text-ink">How MedBox keeps you safe.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Medicine mistakes are serious, so every part of MedBox is built to slow down at the moments that matter and let you make the final call.
      </p>

      <div className="mt-8 space-y-3">
        {points.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 rounded-2xl border border-line bg-navy-800/60 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-coral/30 bg-coral/10 text-coral">
              <Icon size={18} />
            </span>
            <div>
              <h2 className="text-[15.5px] font-bold text-ink">{title}</h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-navy-800/40 p-5 text-[13px] text-muted">
        MedBox is a memory and organization aid. It does not replace medical advice — always check with a pharmacist or doctor
        before starting, stopping, or combining medicines.
      </div>
    </div>
  );
}
