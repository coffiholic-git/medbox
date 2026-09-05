// Time helpers for schedules, countdowns and adherence math.

export function minutesFromLabel(label) {
  // "8:00 PM" -> minutes since midnight
  const m = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let [, h, min, ampm] = m;
  h = parseInt(h, 10);
  min = parseInt(min, 10);
  if (/pm/i.test(ampm) && h !== 12) h += 12;
  if (/am/i.test(ampm) && h === 12) h = 0;
  return h * 60 + min;
}

export function nextOccurrence(timeLabel) {
  const now = new Date();
  const target = new Date(now);
  const mins = minutesFromLabel(timeLabel);
  target.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

export function formatCountdown(ms) {
  if (ms <= 0) return "Due now";
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `In ${m} minute${m === 1 ? "" : "s"}`;
  return `In ${h} hour${h === 1 ? "" : "s"}, ${m} minute${m === 1 ? "" : "s"}`;
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function dayLabel(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}
