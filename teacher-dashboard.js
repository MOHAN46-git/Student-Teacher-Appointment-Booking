// ============================================
// TEACHER DASHBOARD JS — v3.0 with Postpone + Email
// ============================================

import { db, auth } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc,
  query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  notifyStudentApproved, notifyStudentRejected, notifyStudentPostponed
} from "./email-service.js";

// ---- DOM ----
const teacherNameEl = document.getElementById("teacherName");
const availDate = document.getElementById("availDate");
const addAvailBtn = document.getElementById("addAvailBtn");
const addAvailText = document.getElementById("addAvailText");
const addAvailSpinner = document.getElementById("addAvailSpinner");
const availList = document.getElementById("availList");
const requestsContainer = document.getElementById("requestsContainer");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");

let selectedSlots = new Set();
let unsubRequests = null;
let postponingAppointmentId = null;
let postponingAppointmentData = null;

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
});

// ---- Min date ----
const today = new Date().toISOString().split("T")[0];
availDate.min = today;

// ---- Slot Selection ----
document.querySelectorAll("#timeSlots .slot-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("selected");
    const time = btn.dataset.time;
    if (selectedSlots.has(time)) selectedSlots.delete(time);
    else selectedSlots.add(time);
  });
});

// ============================================
// AUTH CHECK
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }

  // Load name + photo
  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const d = docSnap.data();
      teacherNameEl.textContent = `Welcome back, ${d.name}!`;
      localStorage.setItem("userName", d.name);
      const pb = document.getElementById("profileBtn");
      if (d.photoURL) pb.innerHTML = `<img src="${d.photoURL}" alt="Profile">`;
    }
  } catch(e) {
    teacherNameEl.textContent = `Welcome back!`;
  }

  // Profile button
  document.getElementById("profileBtn").addEventListener("click", () => {
    window.location.href = "profile.html";
  });

  loadAvailability(user);
  listenRequests(user);
});

// ============================================
// ADD AVAILABILITY
// ============================================
addAvailBtn.addEventListener("click", async () => {
  const date = availDate.value;
  if (!date) { showToast("Please select a date", "warning"); return; }
  if (selectedSlots.size === 0) { showToast("Select at least one time slot", "warning"); return; }

  addAvailBtn.disabled = true; addAvailText.style.display = "none"; addAvailSpinner.style.display = "block";
  const user = auth.currentUser;

  try {
    for (const time of selectedSlots) {
      await addDoc(collection(db, "availability"), { teacherId: user.uid, date, time, createdAt: new Date().toISOString() });
    }
    showToast(`${selectedSlots.size} slot(s) added!`, "success");
    selectedSlots.clear();
    document.querySelectorAll("#timeSlots .slot-btn").forEach(b => b.classList.remove("selected"));
    availDate.value = "";
    loadAvailability(user);
  } catch (e) { showToast("Failed to add availability", "error"); }

  addAvailBtn.disabled = false; addAvailText.style.display = "inline"; addAvailSpinner.style.display = "none";
});

// ============================================
// LOAD AVAILABILITY
// ============================================
async function loadAvailability(user) {
  try {
    const q = query(collection(db, "availability"), where("teacherId", "==", user.uid));
    const snapshot = await getDocs(q);
    availList.innerHTML = "";

    if (snapshot.empty) { availList.innerHTML = `<p class="text-muted">No slots set yet</p>`; return; }

    const grouped = {};
    snapshot.forEach(ds => { const d = ds.data(); if (!grouped[d.date]) grouped[d.date] = []; grouped[d.date].push({ id: ds.id, ...d }); });

    Object.keys(grouped).sort().forEach((date, idx) => {
      grouped[date].forEach(slot => {
        const item = document.createElement("div");
        item.className = "avail-item"; item.style.animationDelay = `${idx * 0.05}s`;
        item.innerHTML = `<div class="avail-info"><span>📅 ${formatDate(date)}</span><span>🕐 ${slot.time}</span></div><button class="delete-btn" title="Remove">🗑️</button>`;
        item.querySelector(".delete-btn").addEventListener("click", async () => {
          try { await deleteDoc(doc(db, "availability", slot.id)); showToast("Slot removed", "info"); loadAvailability(user); } catch(e) { showToast("Failed", "error"); }
        });
        availList.appendChild(item);
      });
    });
  } catch (e) { showToast("Failed to load availability", "error"); }
}

// ============================================
// LISTEN TO REQUESTS (Real-time)
// ============================================
function listenRequests(user) {
  const q = query(collection(db, "appointments"), where("teacherId", "==", user.uid));
  requestsContainer.innerHTML = `<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>`;

  unsubRequests = onSnapshot(q, async (snapshot) => {
    requestsContainer.innerHTML = "";
    const pending = [], history = [];
    snapshot.forEach(ds => { const d = { id: ds.id, ...ds.data() }; d.status === "pending" ? pending.push(d) : history.push(d); });

    if (pending.length === 0 && history.length === 0) {
      requestsContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><h3>No requests yet</h3><p>Appointment requests will appear here</p></div>`;
      return;
    }

    // Pending
    if (pending.length > 0) {
      const h = document.createElement("h3");
      h.style.cssText = "font-size:15px;font-weight:700;margin-bottom:12px;color:var(--warning)";
      h.textContent = `⏳ Pending Requests (${pending.length})`;
      requestsContainer.appendChild(h);

      for (const [idx, data] of pending.entries()) {
        let studentName = data.studentEmail || "Unknown";
        let studentDegree = "";
        let studentEmail = data.studentEmail || "";
        try {
          const sd = await getDoc(doc(db, "users", data.studentId));
          if (sd.exists()) {
            const su = sd.data();
            studentName = su.name;
            studentDegree = su.degree || "";
            studentEmail = su.email || studentEmail;
          }
        } catch {}

        const card = document.createElement("div");
        card.className = "request-card"; card.style.animationDelay = `${idx * 0.08}s`;
        card.innerHTML = `
          <div class="request-info">
            <div class="req-label">Student</div><div class="req-value">👨‍🎓 ${studentName}</div>
            ${studentDegree ? `<div class="req-label">Degree</div><div class="req-value">📚 ${studentDegree}</div>` : ""}
            <div class="req-label">Date & Time</div>
            <div class="req-value">📅 ${formatDate(data.date)} ${data.time ? "• 🕐 " + data.time : ""}</div>
          </div>
          <div class="request-actions">
            <button class="btn btn-success btn-sm approve-btn">✅ Approve</button>
            <button class="btn btn-outline btn-sm postpone-btn" style="border-color:#06b6d4;color:#06b6d4;">📅 Postpone</button>
            <button class="btn btn-danger btn-sm reject-btn">❌ Reject</button>
          </div>`;

        card.querySelector(".approve-btn").addEventListener("click", () => handleStatus(data.id, "approved", data, studentName, studentEmail));
        card.querySelector(".reject-btn").addEventListener("click", () => handleStatus(data.id, "rejected", data, studentName, studentEmail));
        card.querySelector(".postpone-btn").addEventListener("click", () => openPostponeModal(data.id, data, studentName, studentEmail));
        requestsContainer.appendChild(card);
      }
    }

    // History
    if (history.length > 0) {
      const h = document.createElement("h3");
      h.style.cssText = "font-size:15px;font-weight:700;margin:20px 0 12px;color:var(--text-muted)";
      h.textContent = `📋 History (${history.length})`;
      requestsContainer.appendChild(h);

      history.forEach((data, idx) => {
        const cfg = {
          approved: { badge: "badge-approved", label: "✅ Approved" },
          rejected: { badge: "badge-rejected", label: "❌ Rejected" },
          postponed: { badge: "badge-postponed", label: "📅 Postponed" }
        };
        const s = cfg[data.status] || { badge: "", label: data.status };
        const item = document.createElement("div");
        item.className = "avail-item"; item.style.animationDelay = `${idx * 0.05}s`;
        let extra = "";
        if (data.status === "postponed" && data.newDate) {
          extra = ` → 📅 ${formatDate(data.newDate)} ${data.newTime ? "🕐 " + data.newTime : ""}`;
        }
        item.innerHTML = `<div class="avail-info"><span>📅 ${formatDate(data.date)} ${data.time ? "🕐 " + data.time : ""}</span><span>${extra}</span></div><span class="badge ${s.badge}">${s.label}</span>`;
        requestsContainer.appendChild(item);
      });
    }
  }, () => { showToast("Failed to load requests", "error"); });
}

// ============================================
// APPROVE / REJECT
// ============================================
async function handleStatus(id, status, apptData, studentName, studentEmail) {
  try {
    await updateDoc(doc(db, "appointments", id), { status });
    showToast(`Appointment ${status}!`, status === "approved" ? "success" : "info");

    const teacherName = localStorage.getItem("userName") || "Teacher";

    // Send email
    if (status === "approved") {
      notifyStudentApproved({ studentEmail, studentName, teacherName, date: apptData.date, time: apptData.time });
    } else if (status === "rejected") {
      notifyStudentRejected({ studentEmail, studentName, teacherName, date: apptData.date, time: apptData.time });
    }

    // Log to Firestore for admin
    await addDoc(collection(db, "notifications"), {
      type: status,
      appointmentId: id,
      teacherName,
      studentName,
      studentEmail,
      date: apptData.date,
      time: apptData.time || "",
      message: `Appointment ${status} by ${teacherName}`,
      createdAt: new Date().toISOString()
    });
  } catch (e) { showToast("Failed to update", "error"); }
}

// ============================================
// POSTPONE
// ============================================
function openPostponeModal(id, data, studentName, studentEmail) {
  postponingAppointmentId = id;
  postponingAppointmentData = { ...data, studentName, studentEmail };
  document.getElementById("postponeDate").min = today;
  document.getElementById("postponeDate").value = "";
  document.getElementById("postponeReason").value = "";
  document.getElementById("postponeModal").classList.add("open");
}

document.getElementById("cancelPostpone").addEventListener("click", () => {
  document.getElementById("postponeModal").classList.remove("open");
});

document.getElementById("postponeModal").addEventListener("click", (e) => {
  if (e.target.id === "postponeModal") document.getElementById("postponeModal").classList.remove("open");
});

document.getElementById("confirmPostpone").addEventListener("click", async () => {
  const newDate = document.getElementById("postponeDate").value;
  const newTime = document.getElementById("postponeTime").value;
  const reason = document.getElementById("postponeReason").value.trim();

  if (!newDate) { showToast("Please select a new date", "warning"); return; }

  try {
    await updateDoc(doc(db, "appointments", postponingAppointmentId), {
      status: "postponed",
      newDate,
      newTime,
      postponeReason: reason || "Schedule conflict",
      postponedAt: new Date().toISOString()
    });

    showToast("Appointment postponed!", "success");
    document.getElementById("postponeModal").classList.remove("open");

    const teacherName = localStorage.getItem("userName") || "Teacher";

    // Send email
    notifyStudentPostponed({
      studentEmail: postponingAppointmentData.studentEmail,
      studentName: postponingAppointmentData.studentName,
      teacherName,
      oldDate: postponingAppointmentData.date,
      oldTime: postponingAppointmentData.time || "",
      newDate,
      newTime,
      reason: reason || "Schedule conflict"
    });

    // Log to Firestore
    await addDoc(collection(db, "notifications"), {
      type: "postponed",
      appointmentId: postponingAppointmentId,
      teacherName,
      studentName: postponingAppointmentData.studentName,
      studentEmail: postponingAppointmentData.studentEmail,
      oldDate: postponingAppointmentData.date,
      oldTime: postponingAppointmentData.time || "",
      newDate,
      newTime,
      reason: reason || "Schedule conflict",
      message: `Appointment postponed by ${teacherName} to ${newDate} ${newTime}`,
      createdAt: new Date().toISOString()
    });

  } catch (e) { showToast("Failed to postpone", "error"); }
});

// ---- Helpers ----
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch { return dateStr; }
}

// ---- Logout ----
logoutBtn.addEventListener("click", async () => {
  try {
    if (unsubRequests) unsubRequests();
    await signOut(auth);
    localStorage.clear();
    showToast("Logged out", "success");
    setTimeout(() => { window.location.href = "login.html"; }, 600);
  } catch (e) { showToast("Logout failed", "error"); }
});