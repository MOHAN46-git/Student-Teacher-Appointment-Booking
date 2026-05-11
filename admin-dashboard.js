// ============================================
// ADMIN DASHBOARD JS — Complete Firestore Integration
// ============================================

import { db, auth } from "./firebase-config.js";
import {
  collection, getDocs, doc, getDoc, onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ---- DOM Elements ----
const adminNameEl = document.getElementById("adminName");
const totalStudents = document.getElementById("totalStudents");
const totalTeachers = document.getElementById("totalTeachers");
const totalAppointments = document.getElementById("totalAppointments");
const pendingCount = document.getElementById("pendingCount");
const usersBody = document.getElementById("usersBody");
const appointmentsBody = document.getElementById("appointmentsBody");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");

let allUsers = [];
let allAppointments = [];
let userFilter = "all";
let apptFilter = "all";

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

// ============================================
// AUTH CHECK — Verify admin role from Firestore
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Verify admin role from Firestore (not localStorage)
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      showToast("Access denied. Admins only.", "error");
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
      return;
    }

    adminNameEl.textContent = `Welcome, ${userDoc.data().name}`;
  } catch (error) {
    showToast("Failed to verify admin access", "error");
    return;
  }

  // Load data
  loadUsers();
  listenAppointments();
});

// ============================================
// LOAD USERS
// ============================================
async function loadUsers() {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    allUsers = [];
    snapshot.forEach(docSnap => {
      allUsers.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Update stats
    const students = allUsers.filter(u => u.role === "student");
    const teachers = allUsers.filter(u => u.role === "teacher");

    animateCounter(totalStudents, students.length);
    animateCounter(totalTeachers, teachers.length);

    renderUsers();
  } catch (error) {
    showToast("Failed to load users", "error");
  }
}

function renderUsers() {
  const filtered = userFilter === "all"
    ? allUsers
    : allUsers.filter(u => u.role === userFilter);

  if (filtered.length === 0) {
    usersBody.innerHTML = `
      <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px">
        No ${userFilter === "all" ? "" : userFilter} users found
      </td></tr>`;
    return;
  }

  usersBody.innerHTML = filtered.map(user => {
    const badgeClass = user.role === "student" ? "badge-student"
      : user.role === "teacher" ? "badge-teacher"
      : "badge-admin";

    const joinDate = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—";

    return `
      <tr>
        <td><strong>${user.name || "—"}</strong></td>
        <td>${user.email || "—"}</td>
        <td><span class="badge ${badgeClass}">${user.role}</span></td>
        <td>${joinDate}</td>
      </tr>`;
  }).join("");
}

// ============================================
// LISTEN TO APPOINTMENTS (Real-time)
// ============================================
function listenAppointments() {
  onSnapshot(collection(db, "appointments"), (snapshot) => {
    allAppointments = [];
    snapshot.forEach(docSnap => {
      allAppointments.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Update stats
    const pending = allAppointments.filter(a => a.status === "pending");
    animateCounter(totalAppointments, allAppointments.length);
    animateCounter(pendingCount, pending.length);

    renderAppointments();
  }, (error) => {
    showToast("Failed to load appointments", "error");
  });
}

function renderAppointments() {
  const filtered = apptFilter === "all"
    ? allAppointments
    : allAppointments.filter(a => a.status === apptFilter);

  if (filtered.length === 0) {
    appointmentsBody.innerHTML = `
      <tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px">
        No ${apptFilter === "all" ? "" : apptFilter} appointments found
      </td></tr>`;
    return;
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  appointmentsBody.innerHTML = filtered.map(appt => {
    const statusConfig = {
      pending: { badge: "badge-pending", label: "⏳ Pending" },
      approved: { badge: "badge-approved", label: "✅ Approved" },
      rejected: { badge: "badge-rejected", label: "❌ Rejected" }
    };
    const s = statusConfig[appt.status] || statusConfig.pending;

    // Find student name from allUsers
    const student = allUsers.find(u => u.id === appt.studentId);
    const studentName = student ? student.name : (appt.studentEmail || appt.studentId?.substring(0, 8) + "...");

    const dateStr = appt.date ? formatDate(appt.date) : "—";

    return `
      <tr>
        <td>${studentName}</td>
        <td>${appt.teacher || "—"}</td>
        <td>${dateStr}</td>
        <td>${appt.time || "—"}</td>
        <td><span class="badge ${s.badge}">${s.label}</span></td>
      </tr>`;
  }).join("");
}

// ============================================
// FILTER HANDLERS
// ============================================
// User filters
document.querySelectorAll('.filter-btn:not([data-target])').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.filter-btn:not([data-target])').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    userFilter = btn.dataset.filter;
    renderUsers();
  });
});

// Appointment filters
document.querySelectorAll('.filter-btn[data-target="appt"]').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.filter-btn[data-target="appt"]').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    apptFilter = btn.dataset.filter;
    renderAppointments();
  });
});

// ============================================
// ANIMATED COUNTER
// ============================================
function animateCounter(el, target) {
  const duration = 600;
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);

    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ---- Format Date Helper ----
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
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
    await signOut(auth);
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    showToast("Logged out successfully", "success");
    setTimeout(() => { window.location.href = "login.html"; }, 600);
  } catch (error) {
    showToast("Logout failed", "error");
  }
});