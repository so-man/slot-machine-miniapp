// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDhaRV4dF0aHK4_08jVQEUnlop5umdeZxc",
  authDomain: "spinfinity-138d8.firebaseapp.com",
  projectId: "spinfinity-138d8",
  storageBucket: "spinfinity-138d8.firebasestorage.app",
  messagingSenderId: "569427659594",
  appId: "1:569427659594:web:217177680987cf19ff4fb3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
