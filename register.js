// ============================================
// REGISTER.JS — Multi-Step Registration Wizard
// ============================================

import { db, auth, compressImage } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

// ---- State ----
let currentStep = 1;
let selectedRole = "student";
let profilePhotoFile = null;
let isDisabled = false;

// ---- DOM ----
const panels = [null, document.getElementById("step1"), document.getElementById("step2"), document.getElementById("step3"), document.getElementById("step4"), document.getElementById("step5")];
const wizardStepEls = document.querySelectorAll(".wizard-step");
const connectors = document.querySelectorAll(".wizard-connector");

// ============================================
// WIZARD NAVIGATION
// ============================================
function goToStep(step) {
  // Validate current step before advancing
  if (step > currentStep && !validateStep(currentStep)) return;

  currentStep = step;

  // Update panels
  panels.forEach((p, i) => {
    if (p) p.classList.toggle("active", i === step);
  });

  // Update step indicators
  wizardStepEls.forEach((el, i) => {
    const s = i + 1;
    el.classList.remove("active", "completed");
    if (s === step) el.classList.add("active");
    else if (s < step) el.classList.add("completed");
  });

  // Update connectors
  connectors.forEach((c, i) => {
    c.classList.toggle("done", i + 1 < step);
  });

  // If step 5, show review
  if (step === 5) buildReview();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================
// VALIDATION
// ============================================
function validateStep(step) {
  switch (step) {
    case 1: return true; // Role always selected
    case 2: {
      if (!profilePhotoFile) { showToast("Please upload a profile photo", "warning"); return false; }
      const name = document.getElementById("regName").value.trim();
      const dob = document.getElementById("regDob").value;
      const gender = document.querySelector('input[name="gender"]:checked');
      if (!name || name.length < 2) { showToast("Enter a valid name (min 2 characters)", "warning"); return false; }
      if (!dob) { showToast("Please select your date of birth", "warning"); return false; }
      if (!gender) { showToast("Please select your gender", "warning"); return false; }
      return true;
    }
    case 3: {
      const mobile = document.getElementById("regMobile").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const pass = document.getElementById("regPassword").value;
      const confirm = document.getElementById("regConfirmPassword").value;
      if (!mobile || mobile.length !== 10 || !/^\d{10}$/.test(mobile)) { showToast("Enter a valid 10-digit mobile number", "warning"); return false; }
      if (!email || !email.includes("@")) { showToast("Enter a valid email address", "warning"); return false; }
      if (!pass || pass.length < 6) { showToast("Password must be at least 6 characters", "warning"); return false; }
      if (pass !== confirm) { showToast("Passwords do not match", "error"); return false; }
      return true;
    }
    case 4: {
      const college = document.getElementById("regCollege").value.trim();
      const degree = document.getElementById("regDegree").value.trim();
      if (!college) { showToast("Enter your college name", "warning"); return false; }
      if (!degree) { showToast("Enter your degree name & section", "warning"); return false; }
      if (selectedRole === "student") {
        const roll = document.getElementById("regRollNumber").value.trim();
        if (!roll) { showToast("Enter your roll number", "warning"); return false; }
      } else {
        const staff = document.getElementById("regStaffNumber").value.trim();
        if (!staff) { showToast("Enter your staff number", "warning"); return false; }
      }
      return true;
    }
    default: return true;
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener("DOMContentLoaded", () => {

  // Role selection
  document.querySelectorAll(".role-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role;

      // Toggle roll/staff number field
      document.getElementById("rollNumberGroup").style.display = selectedRole === "student" ? "block" : "none";
      document.getElementById("staffNumberGroup").style.display = selectedRole === "teacher" ? "block" : "none";
    });
  });

  // Step 1 next
  document.getElementById("nextBtn1").addEventListener("click", () => goToStep(2));

  // Generic next/prev buttons
  document.querySelectorAll(".next-btn").forEach(btn => {
    btn.addEventListener("click", () => goToStep(parseInt(btn.dataset.next)));
  });
  document.querySelectorAll(".prev-btn").forEach(btn => {
    btn.addEventListener("click", () => goToStep(parseInt(btn.dataset.prev)));
  });

  // Step 5 back button
  document.getElementById("backToStep4").addEventListener("click", () => goToStep(4));

  // Photo upload
  const photoPreview = document.getElementById("photoPreview");
  const photoInput = document.getElementById("photoInput");

  photoPreview.addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "warning");
      return;
    }

    profilePhotoFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      photoPreview.innerHTML = `<img src="${ev.target.result}" alt="Profile">`;
      photoPreview.classList.add("has-photo");
    };
    reader.readAsDataURL(file);
  });

  // Disability toggle
  document.querySelectorAll("[data-disability]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-disability]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      isDisabled = btn.dataset.disability === "yes";
      document.getElementById("disabilityTypeGroup").style.display = isDisabled ? "block" : "none";
    });
  });

  // DOB max date (must be at least 15 years old)
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 10);
  document.getElementById("regDob").max = maxDob.toISOString().split("T")[0];

  // Register button
  document.getElementById("registerBtn").addEventListener("click", handleRegister);

  // Enter key
  document.querySelectorAll(".form-input").forEach(input => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Find the next button in current step
        const activePanel = document.querySelector(".wizard-panel.active");
        const nextBtn = activePanel.querySelector(".next-btn, #nextBtn1, #registerBtn");
        if (nextBtn) nextBtn.click();
      }
    });
  });
});

// ============================================
// BUILD REVIEW SUMMARY
// ============================================
function buildReview() {
  const summary = document.getElementById("summaryContent");
  const gender = document.querySelector('input[name="gender"]:checked');
  const idField = selectedRole === "student"
    ? `Roll Number: ${document.getElementById("regRollNumber").value}`
    : `Staff Number: ${document.getElementById("regStaffNumber").value}`;
  const disability = isDisabled ? document.getElementById("regDisabilityType").value || "Yes" : "No";

  summary.innerHTML = `
    <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value badge badge-${selectedRole}">${selectedRole}</span></div>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${document.getElementById("regName").value}</span></div>
    <div class="detail-row"><span class="detail-label">DOB</span><span class="detail-value">${document.getElementById("regDob").value}</span></div>
    <div class="detail-row"><span class="detail-label">Gender</span><span class="detail-value">${gender ? gender.value : "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${document.getElementById("regMobile").value}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${document.getElementById("regEmail").value}</span></div>
    <div class="detail-row"><span class="detail-label">College</span><span class="detail-value">${document.getElementById("regCollege").value}</span></div>
    <div class="detail-row"><span class="detail-label">Degree</span><span class="detail-value">${document.getElementById("regDegree").value}</span></div>
    <div class="detail-row"><span class="detail-label">${selectedRole === "student" ? "Roll No." : "Staff No."}</span><span class="detail-value">${selectedRole === "student" ? document.getElementById("regRollNumber").value : document.getElementById("regStaffNumber").value}</span></div>
    <div class="detail-row"><span class="detail-label">Disability</span><span class="detail-value">${disability}</span></div>
  `;
}

// ============================================
// REGISTER HANDLER
// ============================================
async function handleRegister() {
  if (!validateStep(5)) return;

  const btn = document.getElementById("registerBtn");
  const btnText = document.getElementById("registerBtnText");
  const spinner = document.getElementById("registerSpinner");

  btn.disabled = true;
  btnText.style.display = "none";
  spinner.style.display = "block";

  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const gender = document.querySelector('input[name="gender"]:checked');

  try {
    // 1. Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // 2. Compress photo to Base64 (stored in Firestore, no Storage needed)
    let photoURL = "";
    if (profilePhotoFile) {
      photoURL = await compressImage(profilePhotoFile, 200, 0.7);
    }

    // 3. Build user data
    const userData = {
      name: document.getElementById("regName").value.trim(),
      email: email,
      role: selectedRole,
      photoURL: photoURL,
      dob: document.getElementById("regDob").value,
      gender: gender ? gender.value : "",
      mobile: document.getElementById("regMobile").value.trim(),
      college: document.getElementById("regCollege").value.trim(),
      degree: document.getElementById("regDegree").value.trim(),
      disability: isDisabled,
      disabilityType: isDisabled ? (document.getElementById("regDisabilityType").value.trim() || "") : "",
      createdAt: new Date().toISOString()
    };

    // Add role-specific field
    if (selectedRole === "student") {
      userData.rollNumber = document.getElementById("regRollNumber").value.trim();
    } else {
      userData.staffNumber = document.getElementById("regStaffNumber").value.trim();
    }

    // 4. Save to Firestore
    await setDoc(doc(db, "users", uid), userData);

    showToast("Account created successfully! 🎉", "success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);

  } catch (error) {
    let msg = "Registration failed. Please try again.";
    if (error.code === "auth/email-already-in-use") msg = "This email is already registered";
    else if (error.code === "auth/invalid-email") msg = "Invalid email format";
    else if (error.code === "auth/weak-password") msg = "Password is too weak (min 6 characters)";
    showToast(msg, "error");

    btn.disabled = false;
    btnText.style.display = "inline";
    spinner.style.display = "none";
  }
}