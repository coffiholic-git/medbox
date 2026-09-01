import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, ScanLine, CalendarClock, Library, Settings2, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import ToastHost from "./ToastHost";
import SettingsSheet from "./SettingsSheet";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/schedule", label: "Schedule", icon: CalendarClock },
  { to: "/library", label: "Library", icon: Library },
];

export default function Layout() {
  const caregiverMode = useStore((s) => s.caregiverMode);
  const toggleCaregiverMode = useStore((s) => s.toggleCaregiverMode);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="ambient" style={{ width: 340, height: 340, background: "#2bdca1", top: -140, right: -120 }} />
      <div className="ambient" style={{ width: 320, height: 320, background: "#188bcb", bottom: -60, left: -160 }} />

      <header className="relative z-10 mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <NavLink to="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-ink" aria-label="MedBox home">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-mint text-lg font-black text-navy-950">+</span>
          med<span className="text-mint">box</span>
        </NavLink>

        <div className="hidden items-center gap-2 rounded-full border border-line px-3.5 py-2 font-mono text-[12px] text-muted sm:flex">
          <Radio size={13} className="text-lime" />
          {caregiverMode ? "Caregiver dashboard" : "All systems ready"}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const goingTo = !caregiverMode;
              toggleCaregiverMode();
              pushToast(goingTo ? "Caregiver dashboard enabled." : "Returned to personal view.", "success");
              if (goingTo) navigate("/caregiver");
              else navigate("/");
            }}
            aria-pressed={caregiverMode}
            className={`rounded-full border px-3.5 py-2 text-[13px] font-bold transition ${
              caregiverMode ? "border-mint-dim bg-mint-dim text-navy-950" : "border-line text-ink hover:border-mint hover:text-mint"
            }`}
          >
            Caregiver view
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Accessibility settings"
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition hover:border-mint hover:text-mint"
          >
            <Settings2 size={17} />
          </button>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="relative z-10 mx-auto max-w-6xl px-5 pb-32 pt-4 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-navy-950/85 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-2.5 sm:max-w-lg">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-bold transition ${
                  isActive ? "text-mint" : "text-muted hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} strokeWidth={2.2} />
                  {label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute -top-0.5 h-1 w-1 rounded-full bg-mint shadow-[0_0_8px_var(--color-mint)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <ToastHost />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
