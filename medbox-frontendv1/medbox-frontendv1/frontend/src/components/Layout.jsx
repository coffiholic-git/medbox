import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ScanLine,
  CalendarClock,
  Library,
  Settings2,
  Radio,
  Volume2,
  VolumeX,
  ShieldCheck,
  Users,
  Sun,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Activity,
  Plus,
  LogIn,
  LogOut,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { sound } from "../utils/audio";
import { logOutFirebase } from "../config/firebase";
import ToastHost from "./ToastHost";
import SettingsSheet from "./SettingsSheet";
import AuthModal from "./AuthModal";
import SnoozeAlarm from "./SnoozeAlarm";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/scan", label: "AI Scan", icon: ScanLine },
  { to: "/schedule", label: "Schedule", icon: CalendarClock },
  { to: "/library", label: "Pill Cabinet", icon: Library },
  { to: "/safety", label: "Safety & SOS", icon: ShieldCheck },
  { to: "/caregiver", label: "Caregiver Station", icon: Users },
];

export default function Layout() {
  const caregiverMode = useStore((s) => s.caregiverMode);
  const toggleCaregiverMode = useStore((s) => s.toggleCaregiverMode);
  const selectedPatient = useStore((s) => s.selectedPatient);
  const setSelectedPatient = useStore((s) => s.setSelectedPatient);
  const activeTheme = useStore((s) => s.activeTheme);
  const setTheme = useStore((s) => s.setTheme);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const toggleSound = useStore((s) => s.toggleSound);
  const user = useStore((s) => s.user);
  const logoutUser = useStore((s) => s.logoutUser);
  const syncFromBackend = useStore((s) => s.syncFromBackend);
  const token = useStore((s) => s.token);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const location = useLocation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
  }, [activeTheme]);

  useEffect(() => {
    // Re-read server state after every page navigation, so Schedule, Cabinet,
    // Dashboard and the other views never require a browser refresh.
    if (user && token) syncFromBackend();
  }, [user, token, location.pathname, syncFromBackend]);

  const handlePatientChange = (e) => {
    const p = e.target.value;
    setSelectedPatient(p);
    sound.playClick(soundEnabled);
    pushToast(`Switched active profile to ${p === "maya" ? "Maya" : p === "robert" ? "Robert" : "Elena"}.`, "success");
  };

  const handleLogout = async () => {
    sound.playClick(soundEnabled);
    await logOutFirebase();
    logoutUser();
    pushToast("Signed out of MedBox account.", "success");
  };

  const cycleTheme = () => {
    const themes = ["midnight", "emerald", "light"];
    const next = themes[(themes.indexOf(activeTheme) + 1) % themes.length];
    setTheme(next);
    sound.playClick(soundEnabled);
  };

  return (
    <div className="relative min-h-screen flex">
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="ambient" style={{ width: 340, height: 340, background: activeTheme === "emerald" ? "#059669" : "#2bdca1", top: -140, right: -120 }} />
      <div className="ambient" style={{ width: 320, height: 320, background: "#188bcb", bottom: -60, left: -160 }} />

      {/* LEFT SIDEBAR DASHBOARD NAVIGATION (Desktop & Tablet) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col justify-between border-r border-line bg-navy-950/90 backdrop-blur-xl transition-all duration-300 md:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div>
          {/* Sidebar Top Logo */}
          <div className="flex h-[72px] items-center justify-between px-4 border-b border-line">
            <NavLink to="/" className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-tight text-ink overflow-hidden">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mint text-xl font-black text-navy-950">+</span>
              {!collapsed && (
                <span className="whitespace-nowrap">
                  med<span className="text-mint">box</span>
                  <span className="ml-1.5 rounded-full bg-mint/15 px-2 py-0.5 font-mono text-[9.5px] text-mint border border-mint/30">PRO</span>
                </span>
              )}
            </NavLink>

            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:border-mint hover:text-mint transition"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* User Auth Card Widget */}
          {!collapsed && (
            <div className="p-3">
              {user ? (
                <div className="flex items-center justify-between rounded-2xl border border-mint/30 bg-mint/10 p-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="h-9 w-9 rounded-full object-cover border border-mint" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-mint text-navy-950 font-extrabold text-[14px]">
                        {user.displayName ? user.displayName.charAt(0) : "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <strong className="block truncate text-[13px] text-ink">{user.displayName}</strong>
                      <small className="block truncate text-[10.5px] text-mint font-mono">{user.email}</small>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="grid h-8 w-8 place-items-center rounded-xl border border-line text-muted hover:border-coral hover:text-coral transition"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-mint/40 bg-mint-dim/20 py-2.5 text-[13px] font-extrabold text-mint hover:bg-mint-dim hover:text-navy-950 transition shadow-sm"
                >
                  <LogIn size={15} /> Sign In / Register
                </button>
              )}
            </div>
          )}

          {/* Accessibility & Patient Status Indicator */}
          {!collapsed && (
            <div className="px-3 pb-2">
              <div className="rounded-2xl border border-line bg-navy-800/60 p-3">
                <div className="flex items-center gap-2 font-mono text-[11px] text-mint mb-1">
                  <UserCheck size={13} /> Patient: Maya
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-lime">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
                  Voice & Screen Assist Active
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5 px-3 pt-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `group flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[13.5px] font-bold transition-all ${
                    isActive
                      ? "bg-mint-dim text-navy-950 shadow-md"
                      : "text-muted hover:bg-navy-800/60 hover:text-ink"
                  }`
                }
              >
                <Icon size={19} strokeWidth={2.2} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom Controls */}
        <div className="border-t border-line p-3 space-y-2">
          <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : "justify-between"}`}>
            <button
              onClick={cycleTheme}
              title={`Theme: ${activeTheme}`}
              className="flex items-center gap-2 flex-1 rounded-xl border border-line p-2.5 text-[12.5px] font-bold text-ink hover:border-mint transition"
            >
              {activeTheme === "light" ? <Sun size={17} /> : activeTheme === "emerald" ? <Sparkles size={17} className="text-mint" /> : <Moon size={17} />}
              {!collapsed && <span>Theme</span>}
            </button>

            <button
              onClick={() => {
                toggleSound();
                sound.playClick(!soundEnabled);
              }}
              title={soundEnabled ? "Mute audio" : "Enable audio"}
              className={`flex items-center gap-2 flex-1 rounded-xl border p-2.5 text-[12.5px] font-bold transition ${
                soundEnabled ? "border-mint/50 text-mint" : "border-line text-muted"
              }`}
            >
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              {!collapsed && <span>Sound</span>}
            </button>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2 text-[12.5px] font-bold text-muted hover:border-mint hover:text-ink transition"
          >
            <Settings2 size={16} />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
        {/* Mobile Header (Shown on small screens only) */}
        <header className="relative z-10 mx-auto flex h-[64px] max-w-6xl items-center justify-between px-5 md:hidden">
          <NavLink to="/" className="flex items-center gap-2 text-[20px] font-extrabold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-mint text-lg font-black text-navy-950">+</span>
            med<span className="text-mint">box</span>
          </NavLink>
          <div className="flex items-center gap-2">
            <button onClick={cycleTheme} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink">
              {activeTheme === "light" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setSettingsOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink">
              <Settings2 size={16} />
            </button>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="relative z-10 mx-auto max-w-6xl px-5 pb-28 pt-4 sm:px-8">
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
      </div>

      {/* Mobile Bottom Navigation (Visible on mobile screens only) */}
      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-navy-950/85 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex items-center justify-between px-3 py-2">
          {navItems.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition ${
                  isActive ? "text-mint" : "text-muted hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={2.2} />
                  {label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-dot-mobile"
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
      <SnoozeAlarm />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
