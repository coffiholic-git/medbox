import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanLine, CalendarClock, Library as LibraryIcon, ShieldCheck, ArrowUpRight, ArrowRight, TrendingUp, Flame } from "lucide-react";
import { useStore } from "../store/useStore";
import { useSpeech } from "../hooks/useSpeech";
import { useCountUp } from "../hooks/useCountUp";
import VoiceOrb from "../components/VoiceOrb";
import DoseRing from "../components/DoseRing";
import MedicineCard from "../components/MedicineCard";
import RadialStat from "../components/RadialStat";
import Sparkline from "../components/Sparkline";
import Confetti from "../components/Confetti";
import { nextOccurrence, formatCountdown } from "../utils/time";

const actions = [
  { to: "/scan", icon: ScanLine, title: "Scan a medicine", desc: "Use camera to identify", tone: "bg-mint/15 border-mint/40" },
  { to: "/schedule", icon: CalendarClock, title: "What's next?", desc: "Check your schedule", tone: "bg-lime/15 border-lime/40" },
  { to: "/library", icon: LibraryIcon, title: "My medicines", desc: "View your saved list", tone: "bg-coral/15 border-coral/40" },
];

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function Home() {
  const patientName = useStore((s) => s.patientName);
  const medicines = useStore((s) => s.medicines);
  const pushToast = useStore((s) => s.pushToast);
  const logDose = useStore((s) => s.logDose);
  const logs = useStore((s) => s.logs);
  const adherenceForRange = useStore((s) => s.adherenceForRange);
  const navigate = useNavigate();
  const now = useNow();
  const [feedback, setFeedback] = useState('Try saying "What do I need to take now?"');
  const [celebrate, setCelebrate] = useState(0);

  const weekData = useMemo(() => adherenceForRange(7), [adherenceForRange, logs]);
  const weekRates = weekData.map((d) => d.rate);
  const avgRate = Math.round(weekRates.reduce((a, b) => a + b, 0) / weekRates.length) || 0;
  const streak = useMemo(() => {
    let count = 0;
    for (let i = weekData.length - 1; i >= 0; i--) {
      if (weekData[i].rate === 100 && weekData[i].scheduled > 0) count++;
      else break;
    }
    return count;
  }, [weekData]);
  const animatedStreak = useCountUp(streak);

  const handleCommand = (transcript) => {
    setFeedback(`Heard: "${transcript}"`);
    const t = transcript.toLowerCase();
    if (t.includes("scan")) navigate("/scan");
    else if (t.includes("schedule") || t.includes("next")) navigate("/schedule");
    else if (t.includes("librar") || t.includes("medicine")) navigate("/library");
    else speak("I can scan a medicine, check what's next, or open your library. Try one of those.");
  };

  const { listen, speak, listening } = useSpeech({ onResult: handleCommand });

  const nextDose = useMemo(() => {
    const withTimes = medicines.map((m) => ({ m, at: nextOccurrence(m.time) }));
    withTimes.sort((a, b) => a.at - b.at);
    return withTimes[0];
  }, [medicines, now]);

  const onListen = () => {
    setFeedback("Listening…");
    listen();
    setTimeout(() => {
      if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
        speak("You can scan a medicine, ask what is next, or ask to hear your medicine library.");
        setFeedback('Try saying "What do I need to take now?"');
      }
    }, 1100);
  };

  const markTaken = () => {
    if (!nextDose) return;
    logDose(nextDose.m.id, "taken");
    pushToast(`${nextDose.m.name} marked as taken.`, "success");
    speak(`${nextDose.m.name} has been marked as taken. Nice work.`);
    setCelebrate(Date.now());
  };

  return (
    <div>
      <section className="mx-auto max-w-2xl pt-10 text-center sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[11px] tracking-wide text-mint">
          <span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_14px_var(--color-lime)]" />
          YOUR MEDICINE COMPANION
        </div>
        <h1 className="mt-4 text-[44px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[64px]">
          Hello, {patientName}.
          <br />
          <span className="text-mint">How can I help?</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-muted">
          Use your voice or choose an action below. I'll read the important details aloud, and always ask before saving anything.
        </p>

        <div className="mx-auto mt-10 flex flex-col items-center gap-4">
          <VoiceOrb listening={listening} onClick={onListen} />
          <p role="status" aria-live="polite" className="text-[14px] text-muted">
            {feedback}
          </p>
        </div>
      </section>

      <section aria-label="Main actions" className="mt-12 grid gap-3 sm:grid-cols-3">
        {actions.map(({ to, icon: Icon, title, desc, tone }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to={to}
              className="group flex items-center gap-3.5 rounded-2xl border border-line bg-navy-800/60 p-4 transition hover:border-mint/40 hover:shadow-[0_10px_30px_-12px_var(--color-mint)]"
            >
              <motion.span
                whileHover={{ rotate: -8, scale: 1.08 }}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${tone}`}
              >
                <Icon size={18} className="text-ink" />
              </motion.span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[14.5px] font-bold text-ink">{title}</strong>
                <small className="block text-[12.5px] text-muted">{desc}</small>
              </span>
              <ArrowUpRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-mint" />
            </Link>
          </motion.div>
        ))}
      </section>

      <section aria-label="This week at a glance" className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-navy-800/60 p-5">
          <RadialStat value={avgRate} color="var(--color-mint)" icon={undefined} label={undefined} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-mint">
              <TrendingUp size={14} />
              <span className="font-mono text-[11px] uppercase tracking-wide">7-day adherence</span>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {animatedStreak >= 0.5 ? `${Math.round(animatedStreak)}-day` : "No"} perfect streak going
              {streak > 0 && (
                <Flame size={13} className="ml-1 inline text-lime" />
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-navy-800/60 p-5">
          <div className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-wide text-lime">Trend</span>
            <p className="mt-1 text-[13px] font-bold text-ink">Last 7 days</p>
          </div>
          <Sparkline data={weekRates} color="var(--color-lime)" />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article className="relative overflow-hidden rounded-[26px] border border-line bg-navy-800/60 p-6">
          <Confetti fire={celebrate} />
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wide text-mint">Up next</span>
              <h2 className="mt-1 text-[20px] font-extrabold text-ink">Your next dose</h2>
            </div>
            <Link to="/schedule" className="flex items-center gap-1 text-[13px] font-bold text-muted hover:text-mint">
              Full schedule <ArrowRight size={14} />
            </Link>
          </div>

          {nextDose ? (
            <>
              <div className="mt-5 flex items-center gap-5">
                <DoseRing timeLabel={nextDose.m.time} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-bold text-ink">
                    {nextDose.m.name} <span className="font-medium text-muted">{nextDose.m.strength}</span>
                  </h3>
                  <p className="mt-0.5 text-[13.5px] text-muted">{nextDose.m.instructions}</p>
                  <p className="mt-2 font-mono text-[12px] text-lime">{formatCountdown(nextDose.at - now)}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => speak(`Your next dose is ${nextDose.m.name}, ${nextDose.m.strength}. ${nextDose.m.instructions}.`)}
                  aria-label="Hear medication details"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-mint hover:text-mint"
                >
                  ▶
                </motion.button>
              </div>
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={markTaken}
                className="mt-5 w-full rounded-full bg-mint-dim py-3 text-[14px] font-bold text-navy-950 transition hover:bg-mint"
              >
                Mark as taken
              </motion.button>
            </>
          ) : (
            <p className="mt-6 text-muted">No medicines scheduled yet. Add one from your library.</p>
          )}
        </article>

        <aside className="rounded-[26px] border border-coral/30 bg-coral/[0.06] p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-coral" />
            <span className="font-mono text-[11px] uppercase tracking-wide text-coral">Your safety</span>
          </div>
          <h2 className="mt-3 text-[20px] font-extrabold text-ink">We never guess.</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Medicine results are only saved after you confirm they're correct.
          </p>
          <Link to="/safety" className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-ink hover:text-coral">
            How MedBox keeps you safe <ArrowRight size={14} />
          </Link>
        </aside>
      </section>

      <section className="mt-6" aria-labelledby="recentHeading">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-mint">Recently added</span>
            <h2 id="recentHeading" className="mt-1 text-[20px] font-extrabold text-ink">
              Your medicine library
            </h2>
          </div>
          <Link to="/library" className="flex items-center gap-1 text-[13px] font-bold text-muted hover:text-mint">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {medicines.slice(0, 4).map((m) => (
            <motion.div key={m.id} layout>
              <MedicineCard medicine={m} onSpeak={speak} compact />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
