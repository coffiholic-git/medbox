import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock3 } from "lucide-react";
import { useStore } from "../store/useStore";
import { useSpeech } from "../hooks/useSpeech";
import RadialStat from "../components/RadialStat";
import { todayKey } from "../utils/time";

function buildDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 3 + i);
    return d;
  });
}

export default function Schedule() {
  const medicines = useStore((s) => s.medicines);
  const logs = useStore((s) => s.logs);
  const logDose = useStore((s) => s.logDose);
  const pushToast = useStore((s) => s.pushToast);
  const { speak } = useSpeech();

  const days = useMemo(buildDays, []);
  const [selected, setSelected] = useState(() => todayKey());
  const isToday = selected === todayKey();

  const selectedDate = days.find((d) => todayKey(d) === selected) || new Date();
  const scheduled = medicines.filter((m) => m.frequency !== "weekly" || selectedDate.getDay() === 0);
  const dayLogs = logs[selected] || {};

  const takenCount = scheduled.filter((m) => dayLogs[m.id] === "taken").length;
  const progress = scheduled.length ? Math.round((takenCount / scheduled.length) * 100) : 0;

  const setStatus = (med, status) => {
    logDose(med.id, status, selected);
    if (status === "taken") {
      pushToast(`${med.name} marked as taken.`, "success");
      speak(`${med.name} marked as taken.`);
    } else {
      pushToast(`${med.name} marked as missed.`);
    }
  };

  return (
    <div className="pt-6">
      <span className="font-mono text-[11px] uppercase tracking-wide text-mint">Your reminders</span>
      <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-ink">
        {isToday ? "Today's schedule" : selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </h1>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {days.map((d) => {
          const key = todayKey(d);
          const active = key === selected;
          return (
            <motion.button
              key={key}
              onClick={() => setSelected(key)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex min-w-[64px] flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 transition ${
                active ? "border-mint-dim bg-mint-dim text-navy-950" : "border-line text-ink hover:border-mint/50"
              }`}
            >
              <span className="font-mono text-[10px] uppercase tracking-wide opacity-80">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="text-[16px] font-extrabold">{d.getDate()}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-5 rounded-2xl border border-line bg-navy-800/60 p-5">
        <RadialStat value={progress} size={58} stroke={6} color="var(--color-mint)" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-[13px] font-bold text-ink">
            <span>{takenCount} of {scheduled.length} doses taken</span>
            <span className="font-mono text-mint">{progress}%</span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-navy-700">
            <motion.div
              className="h-full rounded-full bg-mint"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {scheduled.length === 0 && (
          <p className="rounded-2xl border border-line bg-navy-800/40 p-6 text-center text-muted">
            Nothing scheduled for this day.
          </p>
        )}
        <AnimatePresence mode="popLayout">
          {scheduled.map((m, i) => {
            const status = dayLogs[m.id];
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                whileHover={{ y: -2, borderColor: "rgba(185,245,208,0.3)" }}
                className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  status === "taken"
                    ? "border-mint/25 bg-mint/[0.05]"
                    : status === "missed"
                    ? "border-coral/25 bg-coral/[0.05]"
                    : "border-line bg-navy-800/60"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-line py-2 font-mono">
                    <Clock3 size={13} className="text-muted" />
                    <span className="mt-1 text-[12px] font-bold text-ink">{m.time.split(" ")[0]}</span>
                    <span className="text-[9px] text-muted">{m.time.split(" ")[1]}</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-ink">
                      {m.name} <span className="font-medium text-muted">{m.strength}</span>
                    </h3>
                    <p className="text-[13px] text-muted">{m.instructions}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setStatus(m, "taken")}
                    aria-pressed={status === "taken"}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition ${
                      status === "taken" ? "border-mint-dim bg-mint-dim text-navy-950" : "border-line text-ink hover:border-mint hover:text-mint"
                    }`}
                  >
                    <Check size={13} /> Taken
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setStatus(m, "missed")}
                    aria-pressed={status === "missed"}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition ${
                      status === "missed" ? "border-coral bg-coral text-navy-950" : "border-line text-ink hover:border-coral hover:text-coral"
                    }`}
                  >
                    <X size={13} /> Missed
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
