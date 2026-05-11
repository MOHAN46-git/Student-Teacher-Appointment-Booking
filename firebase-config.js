// Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

// Auth
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// Config
const firebaseConfig = {
  apiKey: "AIzaSyBlHSL5ZaVrA2tq5MJ_zmxmj3B_34yCuak",
  authDomain: "stab-v2-4506.firebaseapp.com",
  projectId: "stab-v2-4506",
  storageBucket: "stab-v2-4506.firebasestorage.app",
  messagingSenderId: "735500505050",
  appId: "1:735500505050:web:d2dee162b77e5c51f93ae3"
};

// Init
const app = initializeApp(firebaseConfig);

// Export
export const auth = getAuth(app);
export const db = getFirestore(app);