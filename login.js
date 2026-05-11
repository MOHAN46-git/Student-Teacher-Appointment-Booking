// ============================================
// LOGIN.JS — Login + Forgot Password
// ============================================

import { db, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ---- Toast ----
function showToast(msg, type = "info") {
  const c = document.getElementById("toastContainer");
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add("toast-out"); setTimeout(() => t.remove(), 300); }, 3500);
}

document.addEventListener("DOMContentLoaded", () => {

  // ---- Role selector ----
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

    if (!email || !password) { showToast("Please enter email and password", "warning"); return; }

    loginBtn.disabled = true;
    loginBtnText.style.display = "none";
    loginSpinner.style.display = "block";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

      if (!userDoc.exists()) {
        showToast("User profile not found. Please register again.", "error");
        loginBtn.disabled = false; loginBtnText.style.display = "inline"; loginSpinner.style.display = "none";
        return;
      }

      const userData = userDoc.data();
      localStorage.setItem("role", userData.role);
      localStorage.setItem("userName", userData.name);
      if (userData.photoURL) localStorage.setItem("userPhoto", userData.photoURL);

      showToast(`Welcome back, ${userData.name}!`, "success");

      setTimeout(() => {
        if (userData.role === "student") window.location.href = "student-dashboard.html";
        else if (userData.role === "teacher") window.location.href = "teacher-dashboard.html";
        else if (userData.role === "admin") window.location.href = "admin-dashboard.html";
        else showToast("Unknown role. Contact admin.", "error");
      }, 800);

    } catch (error) {
      let msg = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found") msg = "No account found with this email";
      else if (error.code === "auth/wrong-password") msg = "Incorrect password";
      else if (error.code === "auth/invalid-email") msg = "Invalid email format";
      else if (error.code === "auth/too-many-requests") msg = "Too many attempts. Try again later";
      else if (error.code === "auth/invalid-credential") msg = "Invalid email or password";
      showToast(msg, "error");
      loginBtn.disabled = false; loginBtnText.style.display = "inline"; loginSpinner.style.display = "none";
    }
  });

  // ---- Forgot Password Modal ----
  const forgotModal = document.getElementById("forgotModal");
  document.getElementById("forgotPasswordLink").addEventListener("click", (e) => {
    e.preventDefault();
    // Pre-fill email if already typed
    const loginEmail = document.getElementById("loginEmail").value.trim();
    if (loginEmail) document.getElementById("forgotEmail").value = loginEmail;
    forgotModal.classList.add("open");
  });

  document.getElementById("closeForgotModal").addEventListener("click", () => {
    forgotModal.classList.remove("open");
  });

  forgotModal.addEventListener("click", (e) => {
    if (e.target === forgotModal) forgotModal.classList.remove("open");
  });

  // ---- Send Reset Email ----
  const forgotBtn = document.getElementById("forgotBtn");
  const forgotBtnText = document.getElementById("forgotBtnText");
  const forgotSpinner = document.getElementById("forgotSpinner");

  forgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("forgotEmail").value.trim();
    if (!email) { showToast("Please enter your email", "warning"); return; }

    forgotBtn.disabled = true;
    forgotBtnText.style.display = "none";
    forgotSpinner.style.display = "block";

    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Password reset link sent to your email! 📩", "success");
      setTimeout(() => forgotModal.classList.remove("open"), 1500);
    } catch (error) {
      let msg = "Failed to send reset email";
      if (error.code === "auth/user-not-found") msg = "No account found with this email";
      else if (error.code === "auth/invalid-email") msg = "Invalid email format";
      showToast(msg, "error");
    }

    forgotBtn.disabled = false;
    forgotBtnText.style.display = "inline";
    forgotSpinner.style.display = "none";
  });

  // ---- Enter key ----
  document.querySelectorAll(".form-input").forEach(input => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") loginBtn.click();
    });
  });
});