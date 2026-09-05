/**
 * MedBox API utility — all calls to the FastAPI backend (http://localhost:8000).
 *
 * Convention:
 *  - Every function returns the parsed JSON on success, or `null` on any
 *    network / HTTP error. Callers are responsible for null-checking.
 *  - Auth token is stored in localStorage under "medbox_token" and is
 *    attached automatically via getAuthHeaders().
 *  - The Vite dev proxy forwards /api/* to http://localhost:8000 so we use
 *    a relative base URL — no CORS issues in dev.
 */

const API_BASE = "/api";
const TOKEN_KEY = "medbox_token";

// ── Token helpers ──────────────────────────────────────────────────────────────

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Returns Authorization header object, or empty object for demo/Google users. */
function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Generic fetch helpers ──────────────────────────────────────────────────────

async function get(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...getAuthHeaders() },
    });
    if (res.ok) return await res.json();
    console.warn(`GET ${path} → ${res.status}`);
  } catch (err) {
    console.warn(`GET ${path} network error:`, err.message);
  }
  return null;
}

async function post(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    if (res.ok) return await res.json();
    const detail = await res.text();
    console.warn(`POST ${path} → ${res.status}:`, detail);
  } catch (err) {
    console.warn(`POST ${path} network error:`, err.message);
  }
  return null;
}

async function patch(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    if (res.ok) return await res.json();
    console.warn(`PATCH ${path} → ${res.status}`);
  } catch (err) {
    console.warn(`PATCH ${path} network error:`, err.message);
  }
  return null;
}

async function del(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (res.ok) return await res.json();
    console.warn(`DELETE ${path} → ${res.status}`);
  } catch (err) {
    console.warn(`DELETE ${path} network error:`, err.message);
  }
  return null;
}

// ── Auth (FR14) ────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * @returns {access_token, uid, displayName, email, role} | null
 */
export async function registerAPI(name, email, password, role = "primary_user") {
  return post("/auth/register", { name, email, password, role });
}

/**
 * Log in an existing user.
 * @returns {access_token, uid, displayName, email, role} | null
 */
export async function loginAPI(email, password) {
  return post("/auth/login", { email, password });
}

// ── Medicines (FR8) ────────────────────────────────────────────────────────────

export async function fetchMedicinesAPI() {
  return get("/medicines");
}

/**
 * @returns {medicine, advisory} | null
 */
export async function addMedicineAPI(medData) {
  return post("/medicines", medData);
}

export async function refillMedicineAPI(medId, amount) {
  return patch(`/medicines/${medId}/refill`, { amount });
}

export async function deleteMedicineAPI(medId) {
  return del(`/medicines/${medId}`);
}

// ── Dose Logs (FR8) ────────────────────────────────────────────────────────────

export async function fetchLogsAPI(dateKey) {
  const qs = dateKey ? `?date_key=${dateKey}` : "";
  return get(`/logs${qs}`);
}

export async function logDoseAPI(dateKey, medId, status) {
  return post("/logs", { dateKey, medId, status });
}

// ── Vitals ─────────────────────────────────────────────────────────────────────

export async function fetchVitalsAPI() {
  return get("/vitals");
}

export async function addVitalAPI(vitalData) {
  return post("/vitals", vitalData);
}

// ── Reminders (FR7) ────────────────────────────────────────────────────────────

export async function fetchRemindersAPI() {
  return get("/reminders");
}

export async function createReminderAPI(payload) {
  return post("/reminders", payload);
}

export async function deleteReminderAPI(reminderId) {
  return del(`/reminders/${reminderId}`);
}

// ── Recognition / OCR Scan (FR2/3/10) ─────────────────────────────────────────

/**
 * Send a base64-encoded image (or null for a simulated scan) to the backend.
 * @returns ScanResult | null
 */
export async function scanMedicineAPI(imageBase64 = null, fileName = "scan.jpg") {
  return post("/recognition/scan", {
    image_base64: imageBase64,
    file_name: fileName,
  });
}

/**
 * Confirm (or reject) a pending recognition result.
 * @returns ConfirmRecognitionResponse | null
 */
export async function confirmRecognitionAPI({
  recognitionId,
  userAction = "confirm",
  finalName,
  finalStrength,
  createReminder = false,
  reminderTime = "9:00 AM",
  reminderFrequency = "daily",
  stock = 30,
}) {
  return post("/recognition/confirm", {
    recognitionId,
    userAction,
    finalName,
    finalStrength,
    createReminder,
    reminderTime,
    reminderFrequency,
    stock,
  });
}

// ── Caregiver (FR12) ───────────────────────────────────────────────────────────

export async function sendCaregiverAlertAPI(patientName, caregiverName) {
  return post("/caregiver/send-alert", { patientName, caregiverName });
}
