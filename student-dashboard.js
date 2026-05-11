// ============================================
// STUDENT DASHBOARD JS — v3.0 with Email
// ============================================

import { db, auth } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, doc, getDoc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { notifyTeacherNewAppointment } from "./email-service.js";

// ---- DOM Elements ----
const welcomeText = document.getElementById("welcomeText");
const teacherSelect = document.getElementById("teacherSelect");
const dateInput = document.getElementById("dateInput");
const slotsContainer = document.getElementById("slotsContainer");
const bookBtn = document.getElementById("bookBtn");
const bookBtnText = document.getElementById("bookBtnText");
const bookSpinner = document.getElementById("bookSpinner");
const appointmentsContainer = document.getElementById("appointmentsContainer");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");

let selectedSlot = null;
let unsubAppointments = null;

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

// ---- Theme Toggle ----
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

// ---- Set minimum date to today ----
const today = new Date().toISOString().split("T")[0];
dateInput.min = today;

// ============================================
// AUTH CHECK
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load user data for photo/name
  try {
    const { doc: docRef, getDoc } = await import("https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js");
    const userDoc = await getDoc(docRef(db, "users", user.uid));
    if (userDoc.exists()) {
      const ud = userDoc.data();
      welcomeText.textContent = `Welcome back, ${ud.name}!`;
      localStorage.setItem("userName", ud.name);
      // Load profile photo
      const profileBtn = document.getElementById("profileBtn");
      if (ud.photoURL) {
        profileBtn.innerHTML = `<img src="${ud.photoURL}" alt="Profile">`;
      }
    }
  } catch(e) {
    const userName = localStorage.getItem("userName") || user.email;
    welcomeText.textContent = `Welcome back, ${userName}!`;
  }

  // Profile button
  document.getElementById("profileBtn").addEventListener("click", () => {
    window.location.href = "profile.html";
  });

  // Load teachers
  loadTeachers();

  // Listen to appointments in real-time
  listenAppointments(user);
});

// ============================================
// LOAD TEACHERS FROM FIRESTORE
// ============================================
async function loadTeachers() {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    teacherSelect.innerHTML = `<option value="">Choose a teacher...</option>`;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.role === "teacher") {
        const opt = document.createElement("option");
        opt.value = docSnap.id;
        opt.textContent = data.name;
        teacherSelect.appendChild(opt);
      }
    });
  } catch (error) {
    showToast("Failed to load teachers", "error");
  }
}

// ============================================
// LOAD AVAILABLE SLOTS
// ============================================
async function loadSlots() {
  const teacherId = teacherSelect.value;
  const date = dateInput.value;

  if (!teacherId || !date) {
    slotsContainer.innerHTML = `
      <div class="empty-state" style="padding:24px;grid-column:1/-1">
        <p>Select a teacher and date to view available slots</p>
      </div>`;
    return;
  }

  slotsContainer.innerHTML = `
    <div class="skeleton skeleton-card" style="grid-column:1/-1"></div>`;

  try {
    const q = query(
      collection(db, "availability"),
      where("teacherId", "==", teacherId),
      where("date", "==", date)
    );

    const snapshot = await getDocs(q);

    slotsContainer.innerHTML = "";
    selectedSlot = null;

    if (snapshot.empty) {
      slotsContainer.innerHTML = `
        <div class="empty-state" style="padding:24px;grid-column:1/-1">
          <p>No available slots for this date</p>
        </div>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const btn = document.createElement("button");
      btn.className = "slot-btn";
      btn.textContent = data.time;
      btn.dataset.time = data.time;

      btn.addEventListener("click", () => {
        document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedSlot = data.time;
      });

      slotsContainer.appendChild(btn);
    });
  } catch (error) {
    showToast("Failed to load slots", "error");
  }
}

// Event listeners for slot loading
teacherSelect.addEventListener("change", loadSlots);
dateInput.addEventListener("change", loadSlots);

// ============================================
// BOOK APPOINTMENT
// ============================================
bookBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const teacherId = teacherSelect.value;
  const teacherName = teacherSelect.options[teacherSelect.selectedIndex]?.text;
  const date = dateInput.value;

  if (!teacherId) {
    showToast("Please select a teacher", "warning");
    return;
  }

  if (!date) {
    showToast("Please select a date", "warning");
    return;
  }

  if (!selectedSlot) {
    showToast("Please select a time slot", "warning");
    return;
  }

  // Show loading
  bookBtn.disabled = true;
  bookBtnText.style.display = "none";
  bookSpinner.style.display = "block";

  try {
    // Get student data for email
    let studentName = localStorage.getItem("userName") || user.email;
    let studentDegree = "", studentSection = "";
    try {
      const studentDoc = await getDoc(doc(db, "users", user.uid));
      if (studentDoc.exists()) {
        const sd = studentDoc.data();
        studentName = sd.name || studentName;
        studentDegree = sd.degree || "";
      }
    } catch(e) {}

    await addDoc(collection(db, "appointments"), {
      studentId: user.uid,
      studentEmail: user.email,
      teacherId: teacherId,
      teacher: teacherName,
      date: date,
      time: selectedSlot,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    showToast("Appointment booked successfully!", "success");

    // Send email to teacher
    try {
      const teacherDoc = await getDoc(doc(db, "users", teacherId));
      if (teacherDoc.exists()) {
        const td = teacherDoc.data();
        notifyTeacherNewAppointment({
          teacherEmail: td.email,
          teacherName: td.name,
          studentName,
          degree: studentDegree,
          section: studentDegree,
          date,
          time: selectedSlot
        });
      }
    } catch(e) { console.log("Email notify skipped"); }

    // Reset form
    teacherSelect.value = "";
    dateInput.value = "";
    selectedSlot = null;
    slotsContainer.innerHTML = `
      <div class="empty-state" style="padding:24px;grid-column:1/-1">
        <p>Select a teacher and date to view available slots</p>
      </div>`;

  } catch (error) {
    showToast("Failed to book appointment: " + error.message, "error");
  }

  bookBtn.disabled = false;
  bookBtnText.style.display = "inline";
  bookSpinner.style.display = "none";
});

// ============================================
// LISTEN TO APPOINTMENTS (Real-time)
// ============================================
function listenAppointments(user) {
  const q = query(
    collection(db, "appointments"),
    where("studentId", "==", user.uid)
  );

  // Show skeleton while loading
  appointmentsContainer.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>`;

  unsubAppointments = onSnapshot(q, (snapshot) => {
    appointmentsContainer.innerHTML = "";

    if (snapshot.empty) {
      appointmentsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No appointments yet</h3>
          <p>Book your first appointment to get started</p>
        </div>`;
      return;
    }

    // Sort by date
    const appointments = [];
    snapshot.forEach(docSnap => {
      appointments.push({ id: docSnap.id, ...docSnap.data() });
    });

    appointments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    appointments.forEach((data, idx) => {
      const statusConfig = {
        pending: { icon: "⏳", label: "Pending", class: "pending", badge: "badge-pending" },
        approved: { icon: "✅", label: "Approved", class: "approved", badge: "badge-approved" },
        rejected: { icon: "❌", label: "Rejected", class: "rejected", badge: "badge-rejected" }
      };

      const status = statusConfig[data.status] || statusConfig.pending;

      const card = document.createElement("div");
      card.className = "appointment-card";
      card.style.animationDelay = `${idx * 0.08}s`;
      card.innerHTML = `
        <div class="appt-icon ${status.class}">${status.icon}</div>
        <div class="appt-info">
          <div class="appt-teacher">👨‍🏫 ${data.teacher || "Unknown Teacher"}</div>
          <div class="appt-date">📅 ${formatDate(data.date)}</div>
          ${data.time ? `<div class="appt-time">🕐 ${data.time}</div>` : ""}
        </div>
        <span class="badge ${status.badge}">${status.label}</span>
      `;
      appointmentsContainer.appendChild(card);
    });
  }, (error) => {
    showToast("Failed to load appointments", "error");
  });
}

// ---- Format Date Helper ----
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

// ============================================
// LOGOUT
// ============================================
logoutBtn.addEventListener("click", async () => {
  try {
    if (unsubAppointments) unsubAppointments();
    await signOut(auth);
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    showToast("Logged out successfully", "success");
    setTimeout(() => { window.location.href = "login.html"; }, 600);
  } catch (error) {
    showToast("Logout failed", "error");
  }
});