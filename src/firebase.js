import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRuaVNS5WaMWfvD9W3vnaARZqjpA3wM90",
  authDomain: "examen-fd3cc.firebaseapp.com",
  projectId: "examen-fd3cc",
  storageBucket: "examen-fd3cc.firebasestorage.app",
  messagingSenderId: "359459369807",
  appId: "1:359459369807:web:612daa7258ea2aac18cb3a",
  measurementId: "G-YVBJ7DPEXV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
