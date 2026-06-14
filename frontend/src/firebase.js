import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getAnalytics, logEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDuFP0Ugv4NWH4d7gtzn7hf0XZPY0JVMgg",
  authDomain: "preusmart2026.firebaseapp.com",
  projectId: "preusmart2026",
  storageBucket: "preusmart2026.firebasestorage.app",
  messagingSenderId: "812904555005",
  appId: "1:812904555005:web:bbb0319abcf193732ff994",
  measurementId: "G-S48WZQZRE6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

const googleProvider = new GoogleAuthProvider();
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const signInWithGoogle = async () => {
  await setPersistence(auth, browserLocalPersistence);
  if (isMobile) return signInWithRedirect(auth, googleProvider);
  return signInWithPopup(auth, googleProvider);
};

export const handleRedirectResult = () => getRedirectResult(auth).catch(() => {});
export const logout = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
export const track = (evento, params = {}) => logEvent(analytics, evento, params);