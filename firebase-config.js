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

// ============================================
// IMAGE HELPER — Compress & convert to Base64
// Stores photos in Firestore (no Storage needed)
// ============================================
export function compressImage(file, maxWidth = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", quality);
        resolve(base64); // Returns a data URL string ~10-30KB
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}