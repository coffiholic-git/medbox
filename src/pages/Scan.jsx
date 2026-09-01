import { useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, RotateCcw, Check } from "lucide-react";
import { useStore } from "../store/useStore";
import { useSpeech } from "../hooks/useSpeech";
import { scanDatabase, colorTokens } from "../data/seed";
import Modal from "../components/Modal";

const STAGES = { idle: "idle", scanning: "scanning", result: "result" };

export default function Scan() {
  const addMedicine = useStore((s) => s.addMedicine);
  const pushToast = useStore((s) => s.pushToast);
  const { speak } = useSpeech();
  const [stage, setStage] = useState(STAGES.idle);
  const [match, setMatch] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runScan = () => {
    setStage(STAGES.scanning);
    setTimeout(() => {
      const found = scanDatabase[Math.floor(Math.random() * scanDatabase.length)];
      setMatch(found);
      setStage(STAGES.result);
      setConfirmOpen(true);
      speak(`This looks like ${found.name}, ${found.strength}. Is that right?`);
    }, 1600);
  };

  const rescan = () => {
    setConfirmOpen(false);
    setMatch(null);
    setStage(STAGES.idle);
  };

  const confirmSave = () => {
    if (!match) return;
    addMedicine({
      name: match.name,
      strength: match.strength,
      form: match.form,
      frequency: "asNeeded",
      time: "9:00 AM",
      instructions: `${match.form} · Just added, no schedule yet`,
      color: match.color,
      expiry: match.expiry,
    });
    setConfirmOpen(false);
    setStage(STAGES.idle);
    setMatch(null);
    pushToast(`${match.name} ${match.strength} was saved to your library.`, "success");
    speak(`${match.name} ${match.strength} has been saved to your medicine library.`);
  };

  const tone = match ? colorTokens[match.color] : null;

  return (
    <div className="mx-auto max-w-xl pt-8 text-center">
      <span className="font-mono text-[11px] uppercase tracking-wide text-mint">Camera ready</span>
      <h1 className="mt-2 text-[32px] font-extrabold tracking-tight text-ink">Ready when you are.</h1>
      <p className="mt-3 text-[15px] text-muted">
        Hold the label steady in good light. I'll ask you to confirm any result before it's saved.
      </p>

      <div className="relative mx-auto mt-8 grid aspect-square max-w-sm place-items-center overflow-hidden rounded-[32px] border border-line bg-navy-800/70">
        <div className="pointer-events-none absolute inset-6 rounded-[22px] border-2 border-dashed border-mint/30" />
        <div className="pointer-events-none absolute left-6 top-6 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-mint" />
        <div className="pointer-events-none absolute right-6 top-6 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-mint" />
        <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-mint" />
        <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-mint" />

        {stage === STAGES.scanning ? (
          <motion.div
            initial={{ y: -110 }}
            animate={{ y: 110 }}
            transition={{ duration: 1.1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="h-0.5 w-4/5 bg-lime shadow-[0_0_20px_var(--color-lime)]"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted">
            <ScanLine size={34} className="text-mint" />
            <p className="max-w-[220px] text-[13.5px] leading-relaxed">
              Center the medicine package
              <br />
              inside the frame
            </p>
          </div>
        )}
      </div>

      <button
        onClick={runScan}
        disabled={stage === STAGES.scanning}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-mint-dim px-7 py-3.5 text-[14.5px] font-bold text-navy-950 transition hover:bg-mint disabled:opacity-60"
      >
        {stage === STAGES.scanning ? "Identifying…" : "Identify medicine"} <span aria-hidden="true">→</span>
      </button>

      <Modal open={confirmOpen} onClose={rescan} labelledBy="confirmTitle" width="max-w-md">
        {match && (
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint-dim text-navy-950">
              <Check size={24} strokeWidth={3} />
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-mint">
              High confidence · {match.confidence}%
            </p>
            <h2 id="confirmTitle" className="mt-2 text-[24px] font-extrabold text-ink">
              I found a match.
            </h2>
            <div className={`mx-auto mt-4 max-w-xs rounded-2xl border ${tone.border} ${tone.soft} p-4 text-left`}>
              <strong className="text-[16px] text-ink">
                {match.name} <span className="font-medium text-muted">{match.strength}</span>
              </strong>
              <p className="mt-1 text-[13px] text-muted">
                {match.form} · Exp. {match.expiry}
              </p>
            </div>
            <p className="mx-auto mt-4 max-w-xs text-[14px] text-muted">
              "This looks like {match.name} {match.strength}. Is that right?"
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={rescan}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line py-3 text-[14px] font-bold text-ink transition hover:border-coral hover:text-coral"
              >
                <RotateCcw size={14} /> No, scan again
              </button>
              <button
                onClick={confirmSave}
                className="flex-1 rounded-full bg-mint-dim py-3 text-[14px] font-bold text-navy-950 transition hover:bg-mint"
              >
                Yes, save it
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
