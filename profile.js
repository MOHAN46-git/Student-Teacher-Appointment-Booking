// ============================================
// PROFILE.JS — View & Edit Profile
// ============================================

import { db, auth, compressImage } from "./firebase-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

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

let currentUser = null;
let userData = null;
let isEditing = false;

// ---- Theme ----
const themeToggle = document.getElementById("themeToggle");
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
});

// ============================================
// AUTH CHECK
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;

  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (!docSnap.exists()) { showToast("Profile not found", "error"); return; }
    userData = docSnap.data();
    renderProfile();
  } catch (error) {
    showToast("Failed to load profile", "error");
  }
});

// ============================================
// RENDER PROFILE
// ============================================
function renderProfile() {
  // Photo
  const photoEl = document.getElementById("profilePhoto");
  if (userData.photoURL) {
    photoEl.innerHTML = `<img src="${userData.photoURL}" alt="Profile">`;
  }

  // Name & badge
  document.getElementById("profileName").textContent = userData.name || "—";
  const badge = document.getElementById("profileRoleBadge");
  badge.textContent = userData.role;
  badge.className = `badge badge-${userData.role}`;

  // Subtitle
  document.getElementById("profileSubtitle").textContent = `${userData.role === "student" ? "Student" : "Teacher"} Account`;

  // Detail rows
  document.getElementById("dName").textContent = userData.name || "—";
  document.getElementById("dEmail").textContent = userData.email || "—";
  document.getElementById("dMobile").textContent = userData.mobile || "—";
  document.getElementById("dDob").textContent = userData.dob || "—";
  document.getElementById("dGender").textContent = userData.gender || "—";
  document.getElementById("dCollege").textContent = userData.college || "—";
  document.getElementById("dDegree").textContent = userData.degree || "—";

  // Roll/Staff number
  const idLabel = document.getElementById("dIdLabel");
  const idValue = document.getElementById("dIdValue");
  if (userData.role === "student") {
    idLabel.textContent = "Roll No.";
    idValue.textContent = userData.rollNumber || "—";
  } else {
    idLabel.textContent = "Staff No.";
    idValue.textContent = userData.staffNumber || "—";
  }

  // Disability
  const disEl = document.getElementById("dDisability");
  if (userData.disability) {
    disEl.textContent = userData.disabilityType || "Yes";
  } else {
    disEl.textContent = "No";
  }

  // Back to dashboard
  document.getElementById("backToDashboard").addEventListener("click", () => {
    const role = userData.role;
    if (role === "student") window.location.href = "student-dashboard.html";
    else if (role === "teacher") window.location.href = "teacher-dashboard.html";
    else if (role === "admin") window.location.href = "admin-dashboard.html";
  });
}

// ============================================
// EDIT MODE
// ============================================
const editToggleBtn = document.getElementById("editToggleBtn");
const detailsView = document.getElementById("detailsView");
const editForm = document.getElementById("editForm");
const photoEditOverlay = document.getElementById("photoEditOverlay");

editToggleBtn.addEventListener("click", () => {
  if (!isEditing) {
    enterEditMode();
  }
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  exitEditMode();
});

function enterEditMode() {
  isEditing = true;
  detailsView.style.display = "none";
  editForm.style.display = "block";
  photoEditOverlay.style.display = "block";
  editToggleBtn.style.display = "none";

  // Fill form
  document.getElementById("editName").value = userData.name || "";
  document.getElementById("editEmail").value = userData.email || "";
  document.getElementById("editMobile").value = userData.mobile || "";
  document.getElementById("editDob").value = userData.dob || "";
  document.getElementById("editCollege").value = userData.college || "";
  document.getElementById("editDegree").value = userData.degree || "";

  // Gender
  const genderRadio = document.querySelector(`input[name="editGender"][value="${userData.gender}"]`);
  if (genderRadio) genderRadio.checked = true;

  // Roll/Staff
  const editIdLabel = document.getElementById("editIdLabel");
  const editId = document.getElementById("editId");
  if (userData.role === "student") {
    editIdLabel.textContent = "Roll Number";
    editId.value = userData.rollNumber || "";
  } else {
    editIdLabel.textContent = "Staff Number";
    editId.value = userData.staffNumber || "";
  }

  // Disability
  if (userData.disability) {
    document.getElementById("editDisYes").classList.add("active");
    document.getElementById("editDisNo").classList.remove("active");
    document.getElementById("editDisTypeGroup").style.display = "block";
    document.getElementById("editDisType").value = userData.disabilityType || "";
  } else {
    document.getElementById("editDisNo").classList.add("active");
    document.getElementById("editDisYes").classList.remove("active");
    document.getElementById("editDisTypeGroup").style.display = "none";
  }
}

function exitEditMode() {
  isEditing = false;
  detailsView.style.display = "block";
  editForm.style.display = "none";
  photoEditOverlay.style.display = "none";
  editToggleBtn.style.display = "inline-flex";
}

// Disability toggles in edit
document.querySelectorAll("[data-dis]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-dis]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("editDisTypeGroup").style.display = btn.dataset.dis === "yes" ? "block" : "none";
  });
});

// ============================================
// PHOTO UPLOAD
// ============================================
document.getElementById("photoInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  try {
    const base64 = await compressImage(file, 200, 0.7);
    await updateDoc(doc(db, "users", currentUser.uid), { photoURL: base64 });

    document.getElementById("profilePhoto").innerHTML = `<img src="${base64}" alt="Profile">`;
    userData.photoURL = base64;
    localStorage.setItem("userPhoto", base64);
    showToast("Photo updated!", "success");
  } catch (error) {
    showToast("Failed to upload photo", "error");
  }
});

// ============================================
// SAVE PROFILE
// ============================================
document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveProfileBtn");
  const btnText = document.getElementById("saveBtnText");
  const spinner = document.getElementById("saveSpinner");

  btn.disabled = true;
  btnText.style.display = "none";
  spinner.style.display = "block";

  const gender = document.querySelector('input[name="editGender"]:checked');
  const isDis = document.getElementById("editDisYes").classList.contains("active");

  const updates = {
    name: document.getElementById("editName").value.trim(),
    mobile: document.getElementById("editMobile").value.trim(),
    dob: document.getElementById("editDob").value,
    gender: gender ? gender.value : userData.gender,
    college: document.getElementById("editCollege").value.trim(),
    degree: document.getElementById("editDegree").value.trim(),
    disability: isDis,
    disabilityType: isDis ? document.getElementById("editDisType").value.trim() : ""
  };

  // Roll/Staff
  const editId = document.getElementById("editId").value.trim();
  if (userData.role === "student") updates.rollNumber = editId;
  else updates.staffNumber = editId;

  try {
    await updateDoc(doc(db, "users", currentUser.uid), updates);
    Object.assign(userData, updates);
    localStorage.setItem("userName", updates.name);
    renderProfile();
    exitEditMode();
    showToast("Profile updated successfully!", "success");
  } catch (error) {
    showToast("Failed to save changes", "error");
  }

  btn.disabled = false;
  btnText.style.display = "inline";
  spinner.style.display = "none";
});

// ============================================
// LOGOUT
// ============================================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    localStorage.clear();
    showToast("Logged out", "success");
    setTimeout(() => { window.location.href = "login.html"; }, 600);
  } catch (error) {
    showToast("Logout failed", "error");
  }
});
