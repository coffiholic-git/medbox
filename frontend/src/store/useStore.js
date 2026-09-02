import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialMedicines } from "../data/seed";
import { todayKey } from "../utils/time";
import { logDoseAPI, refillMedicineAPI, addVitalAPI } from "../utils/api";

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

function seedVitals() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toLocaleDateString(undefined, { weekday: "short" }),
      bpSystolic: 120 + Math.floor(Math.sin(i) * 6),
      bpDiastolic: 80 + Math.floor(Math.cos(i) * 4),
      glucose: 95 + Math.floor(Math.sin(i * 2) * 8),
      pulse: 72 + Math.floor(Math.cos(i * 1.5) * 5),
    });
  }
  return out;
}

export const useStore = create(
  persist(
    (set, get) => ({
      patientName: "Maya",
      selectedPatient: "maya",
      activeTheme: "midnight", // midnight | emerald | light
      soundEnabled: true,
      user: null, // Authenticated Firebase user profile or null
      medicines: initialMedicines,
      logs: seedLogs(),
      snoozed: {}, // { medId: untilTimestamp }
      vitalsLogs: seedVitals(),
      caregiverMode: false,
      textSize: "base", // base | lg | xl
      highContrast: false,
      reduceMotion: false,
      toasts: [],

      setUser: (userProfile) =>
        set({
          user: userProfile,
          patientName: userProfile?.displayName?.split(" ")[0] || "Maya",
        }),

      logoutUser: () => set({ user: null }),

      setSelectedPatient: (patientId) => {
        const nameMap = { maya: "Maya", robert: "Robert", elena: "Elena" };
        set({ selectedPatient: patientId, patientName: nameMap[patientId] || "Maya" });
      },
      setTheme: (theme) => set({ activeTheme: theme }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      addMedicine: (med) =>
        set((state) => ({
          medicines: [
            {
              id: uid("m"),
              addedAt: todayKey(),
              offline: true,
              stock: med.stock || 30,
              maxStock: med.maxStock || 30,
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

      refillStock: (medId, amount = 30) => {
        refillMedicineAPI(medId, amount);
        set((state) => ({
          medicines: state.medicines.map((m) =>
            m.id === medId ? { ...m, stock: (m.stock || 0) + amount, maxStock: Math.max(m.maxStock || 30, (m.stock || 0) + amount) } : m
          ),
        }));
      },

      snoozeDose: (medId, minutes = 15) =>
        set((state) => ({
          snoozed: {
            ...state.snoozed,
            [medId]: Date.now() + minutes * 60 * 1000,
          },
        })),

      clearSnooze: (medId) =>
        set((state) => {
          const next = { ...state.snoozed };
          delete next[medId];
          return { snoozed: next };
        }),

      logDose: (medId, status = "taken", dateKey = todayKey()) => {
        logDoseAPI(dateKey, medId, status);
        set((state) => {
          const day = state.logs[dateKey] || {};
          const updatedMeds = state.medicines.map((m) =>
            m.id === medId && status === "taken" ? { ...m, stock: Math.max(0, (m.stock || 1) - 1) } : m
          );
          return {
            medicines: updatedMeds,
            logs: {
              ...state.logs,
              [dateKey]: {
                ...day,
                [medId]: status,
              },
            },
          };
        });
      },

      addVitalLog: (vital) => {
        addVitalAPI(vital);
        set((state) => ({
          vitalsLogs: [
            ...state.vitalsLogs.slice(1),
            {
              date: new Date().toLocaleDateString(undefined, { weekday: "short" }),
              ...vital,
            },
          ],
        }));
      },

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
        user: state.user,
        patientName: state.patientName,
        selectedPatient: state.selectedPatient,
        activeTheme: state.activeTheme,
        soundEnabled: state.soundEnabled,
        medicines: state.medicines,
        logs: state.logs,
        snoozed: state.snoozed,
        vitalsLogs: state.vitalsLogs,
        caregiverMode: state.caregiverMode,
        textSize: state.textSize,
        highContrast: state.highContrast,
        reduceMotion: state.reduceMotion,
      }),
    }
  )
);
