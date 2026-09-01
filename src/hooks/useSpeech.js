import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionImpl =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export function useSpeech({ onResult } = {}) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(!!SpeechRecognitionImpl);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!SpeechRecognitionImpl) return;
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResultRef.current?.(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, []);

  const speak = useCallback((text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const listen = useCallback(() => {
    if (!recognitionRef.current) {
      // No browser support (or no mic permission in this sandbox): simulate
      // a short listening state so the affordance still feels alive.
      setListening(true);
      setTimeout(() => setListening(false), 1100);
      return;
    }
    try {
      setListening(true);
      recognitionRef.current.start();
    } catch {
      setListening(false);
    }
  }, []);

  return { listen, speak, listening, supported };
}
