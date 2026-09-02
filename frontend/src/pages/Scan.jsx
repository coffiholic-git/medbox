import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ScanLine, RotateCcw, Check, Camera, Upload, Eye, Package } from "lucide-react";
import { useStore } from "../store/useStore";
import { useSpeech } from "../hooks/useSpeech";
import { sound } from "../utils/audio";
import { scanDatabase, colorTokens } from "../data/seed";
import PillVisualizer from "../components/PillVisualizer";
import Modal from "../components/Modal";

const STAGES = { idle: "idle", scanning: "scanning", result: "result" };

export default function Scan() {
  const addMedicine = useStore((s) => s.addMedicine);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const pushToast = useStore((s) => s.pushToast);
  const { speak } = useSpeech();

  const [mode, setMode] = useState("camera"); // camera | upload | simulate
  const [stage, setStage] = useState(STAGES.idle);
  const [match, setMatch] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [initialStock, setInitialStock] = useState(30);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle device webcam initialization
  useEffect(() => {
    if (mode === "camera" && stage === STAGES.idle) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "environment" } })
          .then((stream) => {
            setCameraStream(stream);
            if (videoRef.current) videoRef.current.srcObject = stream;
          })
          .catch((err) => {
            console.warn("Camera access fallback:", err);
          });
      }
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [mode]);

  const runScan = () => {
    sound.playBeep(soundEnabled);
    setStage(STAGES.scanning);
    setTimeout(() => {
      const found = scanDatabase[Math.floor(Math.random() * scanDatabase.length)];
      setMatch(found);
      setInitialStock(30);
      setStage(STAGES.result);
      setConfirmOpen(true);
      sound.playChime(soundEnabled);
      speak(`I identified ${found.name}, ${found.strength}. Please confirm details before saving.`);
    }, 1800);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
      runScan();
    }
  };

  const rescan = () => {
    setConfirmOpen(false);
    setMatch(null);
    setStage(STAGES.idle);
    setUploadedImage(null);
  };

  const confirmSave = () => {
    if (!match) return;
    addMedicine({
      name: match.name,
      strength: match.strength,
      form: match.form,
      frequency: "daily",
      time: "9:00 AM",
      instructions: match.note || `${match.form} · 1 daily after meal`,
      color: match.color,
      expiry: match.expiry,
      stock: Number(initialStock),
      maxStock: Number(initialStock),
    });
    sound.playChime(soundEnabled);
    setConfirmOpen(false);
    setStage(STAGES.idle);
    setMatch(null);
    setUploadedImage(null);
    pushToast(`${match.name} ${match.strength} saved to medicine cabinet.`, "success");
    speak(`${match.name} saved to your medicine cabinet.`);
  };

  const tone = match ? colorTokens[match.color] : null;

  return (
    <div className="mx-auto max-w-xl pt-6 text-center">
      <span className="font-mono text-[11px] uppercase tracking-wide text-mint">AI Vision Scanner</span>
      <h1 className="mt-2 text-[32px] font-extrabold tracking-tight text-ink">Smart Pill & Label Identification</h1>
      <p className="mt-2 text-[15px] text-muted">
        Position the pill bottle or prescription package in front of the lens to identify details.
      </p>

      {/* Mode Switcher */}
      <div className="mx-auto mt-6 flex max-w-xs items-center justify-center rounded-full border border-line bg-navy-800/60 p-1">
        <button
          onClick={() => { setMode("camera"); rescan(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-bold transition ${
            mode === "camera" ? "bg-mint-dim text-navy-950" : "text-muted hover:text-ink"
          }`}
        >
          <Camera size={14} /> Live Cam
        </button>
        <button
          onClick={() => { setMode("upload"); fileInputRef.current?.click(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-bold transition ${
            mode === "upload" ? "bg-mint-dim text-navy-950" : "text-muted hover:text-ink"
          }`}
        >
          <Upload size={14} /> Upload Image
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Scanner Viewfinder Box */}
      <div className="relative mx-auto mt-6 grid aspect-square max-w-sm place-items-center overflow-hidden rounded-[32px] border border-line bg-navy-900/90 shadow-2xl">
        {mode === "camera" && cameraStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : uploadedImage ? (
          <img src={uploadedImage} alt="Uploaded pill package" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted z-10">
            <ScanLine size={36} className="text-mint animate-pulse" />
            <p className="max-w-[220px] text-[13px] leading-relaxed">
              Center pill package or label
              <br />
              inside the frame
            </p>
          </div>
        )}

        {/* Dynamic Simulated AI Bounding Boxes */}
        {stage === STAGES.scanning && (
          <div className="pointer-events-none absolute inset-10 border border-lime/60 rounded-2xl animate-pulse flex flex-col justify-between p-2 z-20">
            <span className="self-start rounded bg-lime/20 px-1.5 py-0.5 font-mono text-[9px] text-lime">OCR MATCHING... 94%</span>
            <span className="self-end rounded bg-mint/20 px-1.5 py-0.5 font-mono text-[9px] text-mint">TEXT: "500MG"</span>
          </div>
        )}

        {/* Viewfinder Target Reticle */}
        <div className="pointer-events-none absolute inset-6 rounded-[22px] border-2 border-dashed border-mint/30 z-20" />
        <div className="pointer-events-none absolute left-6 top-6 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-mint z-20" />
        <div className="pointer-events-none absolute right-6 top-6 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-mint z-20" />
        <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-mint z-20" />
        <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-mint z-20" />

        {stage === STAGES.scanning && (
          <motion.div
            initial={{ y: -120 }}
            animate={{ y: 120 }}
            transition={{ duration: 1.1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="h-1 w-4/5 bg-lime shadow-[0_0_24px_var(--color-lime)] z-30"
          />
        )}
      </div>

      <button
        onClick={runScan}
        disabled={stage === STAGES.scanning}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-mint-dim px-8 py-3.5 text-[14.5px] font-bold text-navy-950 transition hover:bg-mint disabled:opacity-60 shadow-lg"
      >
        {stage === STAGES.scanning ? "Analyzing OCR & Vision…" : "Run Vision Scan"} <Eye size={16} />
      </button>

      {/* Confirmation Modal */}
      <Modal open={confirmOpen} onClose={rescan} labelledBy="confirmTitle" width="max-w-md">
        {match && (
          <div className="text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PillVisualizer form={match.form} color={match.color} size="md" />
                <div>
                  <h2 id="confirmTitle" className="text-[20px] font-extrabold text-ink">
                    {match.name}
                  </h2>
                  <p className="text-[13px] text-muted">{match.strength} · {match.form}</p>
                </div>
              </div>
              <span className="rounded-full bg-mint/20 px-2.5 py-1 font-mono text-[11px] text-mint border border-mint/30">
                {match.confidence}% match
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-navy-800/60 p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-muted uppercase">Initial Pill Inventory Stock</label>
                <div className="mt-1 flex items-center gap-2">
                  <Package size={16} className="text-mint" />
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full rounded-xl border border-line bg-navy-900 px-3 py-1.5 font-mono text-ink focus:border-mint focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted uppercase">Safety Note / Dosage Guidance</label>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted bg-navy-900/60 p-2.5 rounded-xl border border-line">
                  {match.note}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={rescan}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line py-3 text-[13.5px] font-bold text-ink transition hover:border-coral hover:text-coral"
              >
                <RotateCcw size={14} /> Rescan
              </button>
              <button
                onClick={confirmSave}
                className="flex-1 rounded-full bg-mint-dim py-3 text-[13.5px] font-bold text-navy-950 transition hover:bg-mint"
              >
                Save to Cabinet
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
