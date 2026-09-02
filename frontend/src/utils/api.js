const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchMedicinesAPI() {
  try {
    const res = await fetch(`${API_BASE}/medicines`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FastAPI API fallback:", err);
  }
  return null;
}

export async function addMedicineAPI(medData) {
  try {
    const res = await fetch(`${API_BASE}/medicines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(medData),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FastAPI add medicine error:", err);
  }
  return null;
}

export async function refillMedicineAPI(medId, amount) {
  try {
    const res = await fetch(`${API_BASE}/medicines/${medId}/refill`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FastAPI refill error:", err);
  }
  return null;
}

export async function logDoseAPI(dateKey, medId, status) {
  try {
    const res = await fetch(`${API_BASE}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey, medId, status }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FastAPI log dose error:", err);
  }
  return null;
}

export async function fetchVitalsAPI() {
  try {
    const res = await fetch(`${API_BASE}/vitals`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FastAPI fetch vitals error:", err);
  }
  return null;
}

export async function addVitalAPI(vitalData) {
  try {
    const res = await fetch(`${API_BASE}/vitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vitalData),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FastAPI add vital error:", err);
  }
  return null;
}

export async function sendCaregiverAlertAPI(patientName, caregiverName) {
  try {
    const res = await fetch(`${API_BASE}/caregiver/send-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientName, caregiverName }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FastAPI caregiver alert error:", err);
  }
  return null;
}
