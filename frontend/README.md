# MedBox — React + Vite

A full rebuild of the original static MedBox mockup as a real, interactive
React + Vite app. It keeps the original teal/mint/lime visual identity and
voice-first concept, then gives it real state, real routing, and real data.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` produces a production
build in `dist/`.

## What's in here

- **React Router** — `/`, `/scan`, `/schedule`, `/library`, `/caregiver`,
  `/safety`, each a real page instead of a hidden modal.
- **Zustand + localStorage** — medicines, dose logs, and settings persist
  across refreshes. No backend required for the demo.
- **Voice** — `useSpeech` wraps the real `SpeechRecognition` and
  `speechSynthesis` Web APIs when the browser supports them, and falls
  back to a short simulated "listening" state otherwise.
- **Scan flow** — a simulated camera viewfinder with a scanning-line
  animation, a randomized match from a small identification database, and
  a confirm-before-save dialog, matching the product's "we never guess"
  promise.
- **Schedule** — a real 7-day strip (3 days back, today, 3 days ahead),
  per-day dose lists, and a live progress bar.
- **Library** — full CRUD: add, edit, delete, search, and filter your
  medicines, with an accessible modal form.
- **Caregiver dashboard** — a `recharts` adherence bar chart, streak and
  missed-dose stats, computed live from the dose logs.
- **Accessibility settings** — text size, high-contrast mode, and reduced
  motion, all wired to real CSS and respected by `framer-motion`.
- **Design** — Manrope + DM Mono, a deep navy/teal palette with mint/lime/
  coral accents, varied corner radii (circular orb, soft cards, pill
  chips, squared data rows) rather than one repeated shape.

## Structure

```
src/
  components/   Layout, Modal, ToastHost, VoiceOrb, DoseRing, MedicineCard, AdherenceChart, SettingsSheet
  pages/        Home, Scan, Schedule, Library, Caregiver, Safety, NotFound
  store/        useStore.js (zustand)
  hooks/        useSpeech.js
  data/         seed.js
  utils/        time.js
```
