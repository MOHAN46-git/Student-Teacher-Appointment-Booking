// ============================================
// ADMIN DASHBOARD JS — v3.0 with Charts + Notifications
// ============================================

import { db, auth } from "./firebase-config.js";
import {
  collection, getDocs, doc, getDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ---- DOM ----
const adminNameEl = document.getElementById("adminName");
const totalStudents = document.getElementById("totalStudents");
const totalTeachers = document.getElementById("totalTeachers");
const totalAppointments = document.getElementById("totalAppointments");
const pendingCount = document.getElementById("pendingCount");
const usersBody = document.getElementById("usersBody");
const appointmentsBody = document.getElementById("appointmentsBody");
const notificationsContainer = document.getElementById("notificationsContainer");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");

let allUsers = [];
let allAppointments = [];
let userFilter = "all";
let apptFilter = "all";
let usersChart = null;
let appointmentsChart = null;

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

// ---- Theme ----
if (localStorage.getItem("theme") === "dark") { document.body.classList.add("dark"); themeToggle.textContent = "☀️"; }
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const d = document.body.classList.contains("dark");
  localStorage.setItem("theme", d ? "dark" : "light");
  themeToggle.textContent = d ? "☀️" : "🌙";
  // Rebuild charts for theme
  if (allUsers.length) renderCharts();
});

// ============================================
// AUTH CHECK
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      showToast("Access denied. Admins only.", "error");
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
      return;
    }
    adminNameEl.textContent = `Welcome, ${userDoc.data().name}`;

    // Profile btn
    const pb = document.getElementById("profileBtn");
    if (userDoc.data().photoURL) pb.innerHTML = `<img src="${userDoc.data().photoURL}" alt="Profile">`;
    pb.addEventListener("click", () => { window.location.href = "profile.html"; });
  } catch (e) { showToast("Failed to verify admin", "error"); return; }

  loadUsers();
  listenAppointments();
  loadNotifications();
});

// ============================================
// LOAD USERS
// ============================================
async function loadUsers() {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    allUsers = [];
    snapshot.forEach(ds => { allUsers.push({ id: ds.id, ...ds.data() }); });

    const students = allUsers.filter(u => u.role === "student");
    const teachers = allUsers.filter(u => u.role === "teacher");

    animateCounter(totalStudents, students.length);
    animateCounter(totalTeachers, teachers.length);

    renderUsers();
    renderCharts();
  } catch (e) { showToast("Failed to load users", "error"); }
}

function renderUsers() {
  const filtered = userFilter === "all" ? allUsers : allUsers.filter(u => u.role === userFilter);

  if (filtered.length === 0) {
    usersBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">No users found</td></tr>`;
    return;
  }

  usersBody.innerHTML = filtered.map(user => {
    const badgeClass = `badge-${user.role || "student"}`;
    const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
    const photoHtml = user.photoURL
      ? `<div class="user-photo-sm"><img src="${user.photoURL}" alt=""></div>`
      : `<div class="user-photo-sm">👤</div>`;

    return `
      <tr data-uid="${user.id}">
        <td>${photoHtml}</td>
        <td><strong>${user.name || "—"}</strong></td>
        <td>${user.email || "—"}</td>
        <td><span class="badge ${badgeClass}">${user.role}</span></td>
        <td>${user.college || "—"}</td>
        <td>${joinDate}</td>
      </tr>`;
  }).join("");

  // Click to view details
  usersBody.querySelectorAll("tr[data-uid]").forEach(row => {
    row.addEventListener("click", () => showUserDetail(row.dataset.uid));
  });
}

// ============================================
// USER DETAIL MODAL
// ============================================
function showUserDetail(uid) {
  const user = allUsers.find(u => u.id === uid);
  if (!user) return;

  document.getElementById("modalUserName").textContent = user.name || "User Details";

  const photoHtml = user.photoURL
    ? `<div style="text-align:center;margin-bottom:16px;"><img src="${user.photoURL}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--border);"></div>`
    : "";

  const idField = user.role === "student"
    ? `<div class="detail-row"><span class="detail-label">Roll No.</span><span class="detail-value">${user.rollNumber || "—"}</span></div>`
    : `<div class="detail-row"><span class="detail-label">Staff No.</span><span class="detail-value">${user.staffNumber || "—"}</span></div>`;

  document.getElementById("modalUserContent").innerHTML = `
    ${photoHtml}
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.email || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value"><span class="badge badge-${user.role}">${user.role}</span></span></div>
    <div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${user.mobile || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">DOB</span><span class="detail-value">${user.dob || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Gender</span><span class="detail-value">${user.gender || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">College</span><span class="detail-value">${user.college || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Degree</span><span class="detail-value">${user.degree || "—"}</span></div>
    ${idField}
    <div class="detail-row"><span class="detail-label">Disability</span><span class="detail-value">${user.disability ? (user.disabilityType || "Yes") : "No"}</span></div>
  `;

  document.getElementById("userDetailModal").classList.add("open");
}

document.getElementById("closeUserModal").addEventListener("click", () => {
  document.getElementById("userDetailModal").classList.remove("open");
});

document.getElementById("userDetailModal").addEventListener("click", (e) => {
  if (e.target.id === "userDetailModal") document.getElementById("userDetailModal").classList.remove("open");
});

// ============================================
// CHARTS
// ============================================
function renderCharts() {
  const isDark = document.body.classList.contains("dark");
  const textColor = isDark ? "#94a3b8" : "#6b7280";

  // Users pie chart
  const students = allUsers.filter(u => u.role === "student").length;
  const teachers = allUsers.filter(u => u.role === "teacher").length;
  const admins = allUsers.filter(u => u.role === "admin").length;

  const ctx1 = document.getElementById("usersChart").getContext("2d");
  if (usersChart) usersChart.destroy();
  usersChart = new Chart(ctx1, {
    type: "doughnut",
    data: {
      labels: ["Students", "Teachers", "Admins"],
      datasets: [{
        data: [students, teachers, admins],
        backgroundColor: ["#3b82f6", "#a855f7", "#f59e0b"],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: textColor, font: { family: "'Inter'" } } }
      }
    }
  });

  // Appointments bar chart
  const pending = allAppointments.filter(a => a.status === "pending").length;
  const approved = allAppointments.filter(a => a.status === "approved").length;
  const rejected = allAppointments.filter(a => a.status === "rejected").length;
  const postponed = allAppointments.filter(a => a.status === "postponed").length;

  const ctx2 = document.getElementById("appointmentsChart").getContext("2d");
  if (appointmentsChart) appointmentsChart.destroy();
  appointmentsChart = new Chart(ctx2, {
    type: "bar",
    data: {
      labels: ["Pending", "Approved", "Rejected", "Postponed"],
      datasets: [{
        label: "Appointments",
        data: [pending, approved, rejected, postponed],
        backgroundColor: ["#f59e0b", "#22c55e", "#ef4444", "#06b6d4"],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { color: textColor, font: { family: "'Inter'" } }, grid: { color: isDark ? "#2d3250" : "#e5e7eb" } },
        x: { ticks: { color: textColor, font: { family: "'Inter'" } }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ============================================
// APPOINTMENTS (Real-time)
// ============================================
function listenAppointments() {
  onSnapshot(collection(db, "appointments"), (snapshot) => {
    allAppointments = [];
    snapshot.forEach(ds => { allAppointments.push({ id: ds.id, ...ds.data() }); });

    const pending = allAppointments.filter(a => a.status === "pending");
    animateCounter(totalAppointments, allAppointments.length);
    animateCounter(pendingCount, pending.length);

    renderAppointments();
    renderCharts();
  });
}

function renderAppointments() {
  const filtered = apptFilter === "all" ? allAppointments : allAppointments.filter(a => a.status === apptFilter);

  if (filtered.length === 0) {
    appointmentsBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px">No appointments</td></tr>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  appointmentsBody.innerHTML = filtered.map(appt => {
    const cfg = {
      pending: { badge: "badge-pending", label: "⏳ Pending" },
      approved: { badge: "badge-approved", label: "✅ Approved" },
      rejected: { badge: "badge-rejected", label: "❌ Rejected" },
      postponed: { badge: "badge-postponed", label: "📅 Postponed" }
    };
    const s = cfg[appt.status] || cfg.pending;
    const student = allUsers.find(u => u.id === appt.studentId);
    const studentName = student ? student.name : (appt.studentEmail || "—");
    const dateStr = appt.date ? formatDate(appt.date) : "—";

    return `<tr>
      <td>${studentName}</td>
      <td>${appt.teacher || "—"}</td>
      <td>${dateStr}</td>
      <td>${appt.time || "—"}</td>
      <td><span class="badge ${s.badge}">${s.label}</span></td>
    </tr>`;
  }).join("");
}

// ============================================
// NOTIFICATIONS LOG
// ============================================
async function loadNotifications() {
  try {
    const snapshot = await getDocs(collection(db, "notifications"));
    const notifications = [];
    snapshot.forEach(ds => { notifications.push({ id: ds.id, ...ds.data() }); });

    notifications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (notifications.length === 0) {
      notificationsContainer.innerHTML = `<div class="empty-state" style="padding:32px"><div class="empty-icon">📨</div><h3>No notifications yet</h3><p>Email notifications will appear here</p></div>`;
      return;
    }

    notificationsContainer.innerHTML = "";
    notifications.forEach((n, idx) => {
      const iconConfig = {
        approved: { icon: "✅", bg: "var(--success-bg)" },
        rejected: { icon: "❌", bg: "var(--danger-bg)" },
        postponed: { icon: "📅", bg: "rgba(6,182,212,0.12)" }
      };
      const ic = iconConfig[n.type] || { icon: "📨", bg: "var(--info-bg)" };
      const time = n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN") : "—";

      const item = document.createElement("div");
      item.className = "notif-item";
      item.style.animationDelay = `${idx * 0.05}s`;
      item.innerHTML = `
        <div class="notif-icon" style="background:${ic.bg}">${ic.icon}</div>
        <div class="notif-content">
          <div class="notif-msg">${n.message || "Notification"}</div>
          <div class="notif-time">📧 ${n.studentEmail || "—"} • ${time}</div>
        </div>
      `;
      notificationsContainer.appendChild(item);
    });
  } catch (e) {
    notificationsContainer.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:32px">Failed to load notifications</p>`;
  }
}

// ============================================
// FILTERS
// ============================================
document.querySelectorAll('.filter-btn:not([data-target])').forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('.filter-btn:not([data-target])').forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    userFilter = btn.dataset.filter;
    renderUsers();
  });
});

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
  function update(t) {
    const p = Math.min((t - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function formatDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return s; }
}

// ---- Logout ----
logoutBtn.addEventListener("click", async () => {
  try { await signOut(auth); localStorage.clear(); showToast("Logged out", "success"); setTimeout(() => { window.location.href = "login.html"; }, 600); } catch (e) { showToast("Logout failed", "error"); }
});