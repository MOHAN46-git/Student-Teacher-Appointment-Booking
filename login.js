// ============================================
// LOGIN.JS — Login Logic (Clean Rewrite)
// ============================================

import { db, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ---- Toast Helper ----
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

document.addEventListener("DOMContentLoaded", () => {

  // ---- Role selector toggle ----
  const roleButtons = document.querySelectorAll(".role-btn");
  let selectedRole = "student";

  roleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      roleButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role;
    });
  });

  // ---- Login handler ----
  const loginBtn = document.getElementById("loginBtn");
  const loginBtnText = document.getElementById("loginBtnText");
  const loginSpinner = document.getElementById("loginSpinner");

  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    // Validation
    if (!email || !password) {
      showToast("Please enter email and password", "warning");
      return;
    }

    // Show loading
    loginBtn.disabled = true;
    loginBtnText.style.display = "none";
    loginSpinner.style.display = "block";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Fetch role from Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

      if (!userDoc.exists()) {
        showToast("User profile not found. Please register again.", "error");
        loginBtn.disabled = false;
        loginBtnText.style.display = "inline";
        loginSpinner.style.display = "none";
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      // Save role to localStorage for session
      localStorage.setItem("role", role);
      localStorage.setItem("userName", userData.name);

      showToast(`Welcome back, ${userData.name}!`, "success");

      // Redirect based on role
      setTimeout(() => {
        if (role === "student") {
          window.location.href = "student-dashboard.html";
        } else if (role === "teacher") {
          window.location.href = "teacher-dashboard.html";
        } else if (role === "admin") {
          window.location.href = "admin-dashboard.html";
        } else {
          showToast("Unknown role. Contact admin.", "error");
        }
      }, 800);

    } catch (error) {
      // User-friendly error messages
      let msg = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found") msg = "No account found with this email";
      else if (error.code === "auth/wrong-password") msg = "Incorrect password";
      else if (error.code === "auth/invalid-email") msg = "Invalid email format";
      else if (error.code === "auth/too-many-requests") msg = "Too many attempts. Try again later";
      else if (error.code === "auth/invalid-credential") msg = "Invalid email or password";

      showToast(msg, "error");

      loginBtn.disabled = false;
      loginBtnText.style.display = "inline";
      loginSpinner.style.display = "none";
    }
  });

  // ---- Enter key submit ----
  document.querySelectorAll(".form-input").forEach(input => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") loginBtn.click();
    });
  });
});