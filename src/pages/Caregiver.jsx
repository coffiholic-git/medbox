import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Flame, Users } from "lucide-react";
import { useStore } from "../store/useStore";
import AdherenceChart from "../components/AdherenceChart";
import RadialStat from "../components/RadialStat";
import Sparkline from "../components/Sparkline";
import { useCountUp } from "../hooks/useCountUp";
import { todayKey } from "../utils/time";

export default function Caregiver() {
  const patientName = useStore((s) => s.patientName);
  const medicines = useStore((s) => s.medicines);
  const logs = useStore((s) => s.logs);
  const adherenceForRange = useStore((s) => s.adherenceForRange);

  const weekData = useMemo(() => adherenceForRange(7), [adherenceForRange, logs]);
  const avgRate = Math.round(weekData.reduce((sum, d) => sum + d.rate, 0) / weekData.length) || 0;

  const streak = useMemo(() => {
    let count = 0;
    for (let i = weekData.length - 1; i >= 0; i--) {
      if (weekData[i].rate === 100 && weekData[i].scheduled > 0) count++;
      else break;
    }
    return count;
  }, [weekData]);

  const missedRecently = useMemo(() => {
    const out = [];
    Object.entries(logs)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .forEach(([date, dayLogs]) => {
        Object.entries(dayLogs).forEach(([medId, status]) => {
          if (status === "missed") {
            const med = medicines.find((m) => m.id === medId);
            if (med) out.push({ date, med });
          }
        });
      });
    return out.slice(0, 5);
  }, [logs, medicines]);

  return (
    <div className="pt-6">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-mint" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-mint">Caregiver dashboard</span>
      </div>
      <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-ink">How {patientName} is doing</h1>
      <p className="mt-2 max-w-lg text-[14px] text-muted">
        A read-only overview of adherence trends. {patientName} always confirms scans and dose changes themselves.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard icon={TrendingUp} label="7-day adherence" value={avgRate} suffix="%" tone="mint" ring={avgRate} />
        <StatCard icon={Flame} label="Perfect-day streak" value={streak} suffix={streak === 1 ? " day" : " days"} tone="lime" ring={Math.min(100, (streak / 7) * 100)} />
        <StatCard
          icon={AlertTriangle}
          label="Missed this week"
          value={weekData.reduce((s, d) => s + (d.scheduled - d.taken), 0)}
          tone="coral"
          ring={100 - avgRate}
          ringColor="var(--color-coral)"
        />
      </div>

      <div className="mt-5 rounded-[26px] border border-line bg-navy-800/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[17px] font-extrabold text-ink">Last 7 days</h2>
          <div className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted">Trend</span>
            <Sparkline data={weekData.map((d) => d.rate)} width={110} height={30} color="var(--color-mint)" />
          </div>
        </div>
        <div className="mt-4">
          <AdherenceChart data={weekData} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[26px] border border-line bg-navy-800/60 p-6">
          <h2 className="text-[17px] font-extrabold text-ink">Recently missed doses</h2>
          {missedRecently.length === 0 ? (
            <p className="mt-3 text-[14px] text-muted">No missed doses recently — great consistency.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {missedRecently.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 2 }}
                  className="flex items-center justify-between rounded-xl border border-coral/25 bg-coral/[0.06] px-4 py-3"
                >
                  <div>
                    <p className="text-[13.5px] font-bold text-ink">{item.med.name} {item.med.strength}</p>
                    <p className="text-[12px] text-muted">{item.date === todayKey() ? "Today" : item.date}</p>
                  </div>
                  <AlertTriangle size={15} className="text-coral" />
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[26px] border border-line bg-navy-800/60 p-6">
          <h2 className="text-[17px] font-extrabold text-ink">Active medicines</h2>
          <ul className="mt-3 divide-y divide-line">
            {medicines.map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 2 }}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{m.name} {m.strength}</p>
                  <p className="text-[12px] text-muted">{m.instructions}</p>
                </div>
                <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] uppercase text-muted">
                  {m.frequency}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const toneClasses = {
  mint: "border-mint/30 bg-mint/[0.07] text-mint",
  lime: "border-lime/30 bg-lime/[0.07] text-lime",
  coral: "border-coral/30 bg-coral/[0.07] text-coral",
};

const toneColors = {
  mint: "var(--color-mint)",
  lime: "var(--color-lime)",
  coral: "var(--color-coral)",
};

function StatCard({ icon: Icon, label, value, suffix = "", tone, ring, ringColor }) {
  const animatedValue = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`rounded-2xl border p-5 ${toneClasses[tone]}`}
    >
      <div className="flex items-start justify-between">
        <Icon size={18} />
        {typeof ring === "number" && (
          <RadialStat value={ring} size={40} stroke={4} color={ringColor || toneColors[tone]} showValue={false} />
        )}
      </div>
      <p className="mt-3 text-[26px] font-extrabold text-ink">
        {Math.round(animatedValue)}
        <span className="text-[15px]">{suffix}</span>
      </p>
      <p className="text-[12.5px] font-bold text-muted">{label}</p>
    </motion.div>
  );
}
