import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ScanLine, HeartPulse, Lock, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { sound } from "../utils/audio";
import { signInWithGoogle, signInWithEmail, registerWithEmail } from "../config/firebase";

export default function AuthPage() {
  const setUser = useStore((s) => s.setUser);
  const pushToast = useStore((s) => s.pushToast);
  const soundEnabled = useStore((s) => s.soundEnabled);

  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    sound.playClick(soundEnabled);
    try {
      const userProfile = await signInWithGoogle();
      setUser(userProfile);
      sound.playChime(soundEnabled);
      pushToast(`Welcome, ${userProfile.displayName}! Authenticated via Google.`, "success");
    } catch (err) {
      pushToast("Google Sign-In failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    sound.playChime(soundEnabled);
    const demoUser = {
      uid: "demo-user-007",
      email: "maya.lin@medbox.health",
      displayName: "Maya Lin",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      provider: "demo",
    };
    setUser(demoUser);
    pushToast("Logged in as Maya Lin (Demo Account).", "success");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    sound.playClick(soundEnabled);

    try {
      if (mode === "register") {
        const userProfile = await registerWithEmail(name || "New Patient", email, password);
        setUser(userProfile);
        sound.playChime(soundEnabled);
        pushToast(`Account created for ${userProfile.email}! Welcome to MedBox.`, "success");
      } else {
        const userProfile = await signInWithEmail(email, password);
        setUser(userProfile);
        sound.playChime(soundEnabled);
        pushToast(`Logged in as ${userProfile.displayName || userProfile.email}.`, "success");
      }
    } catch (err) {
      pushToast("Authentication failed. Check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-navy-950 text-ink flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Glowing background ambient lights */}
      <div className="ambient" style={{ width: 500, height: 500, background: "#2bdca1", top: -150, left: -150 }} />
      <div className="ambient" style={{ width: 450, height: 450, background: "#188bcb", bottom: -100, right: -100 }} />

      <div className="relative z-10 w-full max-w-4xl grid gap-8 lg:grid-cols-2 items-center">
        {/* Left Column: Brand & Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 text-[28px] font-extrabold tracking-tight text-ink">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-2xl font-black text-navy-950 shadow-lg">+</span>
            med<span className="text-mint">box</span>
            <span className="rounded-full bg-mint/15 px-2.5 py-0.5 font-mono text-[11px] text-mint border border-mint/30">PRO</span>
          </div>

          <h1 className="text-[38px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[46px]">
            Your AI Medical Companion & <span className="text-mint">Safety Station</span>
          </h1>

          <p className="text-[15px] leading-relaxed text-muted">
            Please sign in or create an account to unlock your personalized medication cabinet, camera OCR scanner, schedule matrix, and caregiver dashboard.
          </p>

          <div className="space-y-3 pt-2">
            {[
              { icon: ScanLine, text: "Smart AI Vision Pill Scanner & Label Reader" },
              { icon: ShieldCheck, text: "Real-Time Drug Interaction & Conflict Matrix" },
              { icon: HeartPulse, text: "Vitals Tracking & Remote Caregiver Monitoring" },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 text-[13.5px] font-bold text-ink">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-mint/15 text-mint border border-mint/30 shrink-0">
                  <Icon size={15} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Column: High-Tech Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border border-line bg-navy-800/80 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wide text-mint">Secure Access</span>
              <h2 className="text-[22px] font-extrabold text-ink">
                {mode === "login" ? "Sign In to MedBox" : "Create Patient Account"}
              </h2>
            </div>
            <Lock size={20} className="text-mint opacity-80" />
          </div>

          {/* 1-Click Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-navy-900/90 py-3.5 text-[14px] font-bold text-ink transition hover:border-mint hover:bg-navy-900 disabled:opacity-50 shadow-md"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.26 5.42l4.01-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-line" />
            <span className="absolute bg-navy-800 px-3 font-mono text-[10.5px] uppercase text-muted">Or Credentials</span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl border border-line bg-navy-900/60 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-[12.5px] font-bold rounded-lg transition ${
                mode === "login" ? "bg-mint-dim text-navy-950" : "text-muted hover:text-ink"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-[12.5px] font-bold rounded-lg transition ${
                mode === "register" ? "bg-mint-dim text-navy-950" : "text-muted hover:text-ink"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {mode === "register" && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maya Lin"
                  className="input mt-1"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase text-muted">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@medbox.health"
                className="input mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-muted">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted hover:text-ink"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-mint-dim py-3.5 text-[14px] font-extrabold text-navy-950 transition hover:bg-mint disabled:opacity-50 mt-2 shadow-lg"
            >
              {loading ? "Authenticating…" : mode === "register" ? "Register & Enter Dashboard" : "Sign In & Unlock Dashboard"}
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="pt-2 border-t border-line/40 text-center">
            <button
              onClick={handleDemoLogin}
              className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold text-mint hover:underline"
            >
              <Sparkles size={13} /> Quick Instant Demo Sign In →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
