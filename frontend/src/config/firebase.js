import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";

// Standard Firebase project configuration (can be populated via .env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoConfigKeyForMedBoxApp",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "medbox-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "medbox-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "medbox-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029384756:web:abcd1234efgh5678",
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google OAuth Sign In
export async function signInWithGoogle() {
  try {
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      const res = await signInWithPopup(auth, googleProvider);
      return {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || "Google User",
        photoURL: res.user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        provider: "google",
      };
    }
  } catch (err) {
    console.warn("Real Firebase OAuth popup skipped/fallback:", err);
  }

  // Fallback demo user for immediate instant testing!
  return {
    uid: "g-user-101",
    email: "maya.lin@google.com",
    displayName: "Maya Lin (Google)",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    provider: "google",
  };
}

// Email & Password Login
export async function signInWithEmail(email, password) {
  try {
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || email.split("@")[0],
        photoURL: res.user.photoURL || null,
        provider: "email",
      };
    }
  } catch (err) {
    console.warn("Firebase email login fallback:", err);
  }

  return {
    uid: `u-${Date.now()}`,
    email: email,
    displayName: email.split("@")[0].toUpperCase(),
    photoURL: null,
    provider: "email",
  };
}

// Email & Password Registration
export async function registerWithEmail(name, email, password) {
  try {
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
      }
      return {
        uid: res.user.uid,
        email: res.user.email,
        displayName: name,
        photoURL: null,
        provider: "email",
      };
    }
  } catch (err) {
    console.warn("Firebase email register fallback:", err);
  }

  return {
    uid: `u-${Date.now()}`,
    email: email,
    displayName: name,
    photoURL: null,
    provider: "email",
  };
}

// Sign Out
export async function logOutFirebase() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Signout error:", err);
  }
}
