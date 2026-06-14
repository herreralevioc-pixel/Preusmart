import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
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
googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const handleRedirectResult = () => Promise.resolve();
export const logout = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
export const track = (evento, params = {}) => logEvent(analytics, evento, params);;