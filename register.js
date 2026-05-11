// ============================================
// REGISTER.JS — Registration Logic (Clean Rewrite)
// ============================================

import { db, auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

  // ---- Register handler ----
  const registerBtn = document.getElementById("registerBtn");
  const registerBtnText = document.getElementById("registerBtnText");
  const registerSpinner = document.getElementById("registerSpinner");

  registerBtn.addEventListener("click", async () => {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      showToast("Please fill in all fields", "warning");
      return;
    }

    if (name.length < 2) {
      showToast("Name must be at least 2 characters", "warning");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    // Show loading
    registerBtn.disabled = true;
    registerBtnText.style.display = "none";
    registerSpinner.style.display = "block";

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Save user profile to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role: selectedRole,
        createdAt: new Date().toISOString()
      });

      showToast("Account created successfully!", "success");

      // Redirect to login
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (error) {
      let msg = "Registration failed. Please try again.";
      if (error.code === "auth/email-already-in-use") msg = "This email is already registered";
      else if (error.code === "auth/invalid-email") msg = "Invalid email format";
      else if (error.code === "auth/weak-password") msg = "Password is too weak";

      showToast(msg, "error");

      registerBtn.disabled = false;
      registerBtnText.style.display = "inline";
      registerSpinner.style.display = "none";
    }
  });

  // ---- Enter key submit ----
  document.querySelectorAll(".form-input").forEach(input => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") registerBtn.click();
    });
  });
});