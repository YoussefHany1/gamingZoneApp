// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCeaa-9pFzxaa05X1aZUO-bxDOz2ILmbPI",
  authDomain: "gaming-zone-ca485.firebaseapp.com",
  projectId: "gaming-zone-ca485",
  storageBucket: "gaming-zone-ca485.firebasestorage.app",
  messagingSenderId: "1003577837647",
  appId: "1:1003577837647:web:85f30a12ce938110c3423a",
  measurementId: "G-TG0GMZX7X5",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
