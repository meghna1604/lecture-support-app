
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgrLHXBbwpFCeKpJc4YVRNSVHpvemlYnM",
  authDomain: "lecture-app-f6edf.firebaseapp.com",
  projectId: "lecture-app-f6edf",
  storageBucket: "lecture-app-f6edf.firebasestorage.app",
  messagingSenderId: "863396820686",
  appId: "1:863396820686:web:8be73f15e44b34011cc29f"
};

const app = initializeApp(firebaseConfig);

// Initialise Firestore with Persistence enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();