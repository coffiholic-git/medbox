import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialMedicines } from "../data/seed";
import { todayKey } from "../utils/time";

let idCounter = 0;
const uid = (prefix) => `${prefix}-${Date.now()}-${idCounter++}`;

// Backfill a few days of adherence history so the caregiver dashboard and
// streak counters have something meaningful to show on first load.
function seedLogs() {
  const logs = {};
  for (let offset = 6; offset >= 1; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const key = todayKey(d);
    logs[key] = {};
    initialMedicines.forEach((med) => {
      if (med.frequency === "weekly" && d.getDay() !== 0) return;
      // Mostly taken, with a couple of realistic misses.
      const missed = (offset === 4 && med.id === "m-amlodipine") || (offset === 2 && med.id === "m-paracetamol");
      logs[key][med.id] = missed ? "missed" : "taken";
    });
  }
  return logs;
}

export const useStore = create(
  persist(
    (set, get) => ({
      patientName: "Maya",
      medicines: initialMedicines,
      logs: seedLogs(),
      caregiverMode: false,
      textSize: "base", // base | lg | xl
      highContrast: false,
      reduceMotion: false,
      toasts: [],

      addMedicine: (med) =>
        set((state) => ({
          medicines: [
            {
              id: uid("m"),
              addedAt: todayKey(),
              offline: true,
              ...med,
            },
            ...state.medicines,
          ],
        })),

      removeMedicine: (id) =>
        set((state) => ({ medicines: state.medicines.filter((m) => m.id !== id) })),

      updateMedicine: (id, patch) =>
        set((state) => ({
          medicines: state.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      logDose: (medId, status, dateKey = todayKey()) =>
        set((state) => ({
          logs: {
            ...state.logs,
            [dateKey]: { ...(state.logs[dateKey] || {}), [medId]: status },
          },
        })),

      toggleCaregiverMode: () => set((state) => ({ caregiverMode: !state.caregiverMode })),
      setTextSize: (size) => set({ textSize: size }),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
      toggleReduceMotion: () => set((state) => ({ reduceMotion: !state.reduceMotion })),

      pushToast: (message, tone = "default") =>
        set((state) => ({ toasts: [...state.toasts, { id: uid("t"), message, tone }] })),
      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      // Derived helper kept on the store for convenience.
      adherenceForRange: (days) => {
        const { logs, medicines } = get();
        const out = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = todayKey(d);
          const dayLogs = logs[key] || {};
          const scheduled = medicines.filter((m) => m.frequency !== "weekly" || d.getDay() === 0);
          const taken = scheduled.filter((m) => dayLogs[m.id] === "taken").length;
          out.push({
            date: key,
            label: d.toLocaleDateString(undefined, { weekday: "short" }),
            taken,
            scheduled: scheduled.length,
            rate: scheduled.length ? Math.round((taken / scheduled.length) * 100) : 100,
          });
        }
        return out;
      },
    }),
    {
      name: "medbox-storage",
      partialize: (state) => ({
        patientName: state.patientName,
        medicines: state.medicines,
        logs: state.logs,
        caregiverMode: state.caregiverMode,
        textSize: state.textSize,
        highContrast: state.highContrast,
        reduceMotion: state.reduceMotion,
      }),
    }
  )
);
