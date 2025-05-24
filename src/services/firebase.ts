import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCpdlnBWRFvBWiz1Zdj20E9a_tcQir1OEg",
  authDomain: "dtr-test-6abcb.firebaseapp.com",
  projectId: "dtr-test-6abcb",
  storageBucket: "dtr-test-6abcb.appspot.com",
  messagingSenderId: "487340785463",
  appId: "1:487340785463:web:438209656c8425f20ce4b2",
  measurementId: "G-XNCB7EZS04"
};

// Initialize Firebase with error handling
let app;
let db;
let auth;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Fallback initialization
  try {
    app = initializeApp(firebaseConfig, "fallback-instance");
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase fallback initialization successful");
  } catch (fallbackError) {
    console.error("Firebase fallback initialization failed:", fallbackError);
    // Create mock objects to prevent app crashes
    app = {} as any;
    db = {
      collection: () => ({ doc: () => ({ set: () => Promise.resolve() }) }),
      doc: () => ({ set: () => Promise.resolve() })
    } as any;
    auth = { currentUser: null } as any;
  }
}

export { app, db, auth };
