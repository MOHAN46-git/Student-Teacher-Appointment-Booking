// ============================================
// TEACHER DASHBOARD JS — Complete Clean Rewrite
// ============================================

import { db, auth } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc,
  query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ---- DOM Elements ----
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

// ---- Set minimum date ----
const today = new Date().toISOString().split("T")[0];
availDate.min = today;

// ---- Slot Selection ----
document.querySelectorAll("#timeSlots .slot-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("selected");
    const time = btn.dataset.time;
    if (selectedSlots.has(time)) {
      selectedSlots.delete(time);
    } else {
      selectedSlots.add(time);
    }
  });
});

// ============================================
// AUTH CHECK
// ============================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadTeacherName(user);
  loadAvailability(user);
  listenRequests(user);
});

// ============================================
// LOAD TEACHER NAME
// ============================================
async function loadTeacherName(user) {
  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      teacherNameEl.textContent = `Welcome back, ${data.name}!`;
      localStorage.setItem("userName", data.name);
    }
  } catch (error) {
    teacherNameEl.textContent = `Welcome back!`;
  }
}

// ============================================
// ADD AVAILABILITY
// ============================================
addAvailBtn.addEventListener("click", async () => {
  const date = availDate.value;

  if (!date) {
    showToast("Please select a date", "warning");
    return;
  }

  if (selectedSlots.size === 0) {
    showToast("Please select at least one time slot", "warning");
    return;
  }

  // Loading state
  addAvailBtn.disabled = true;
  addAvailText.style.display = "none";
  addAvailSpinner.style.display = "block";

  const user = auth.currentUser;

  try {
    for (const time of selectedSlots) {
      await addDoc(collection(db, "availability"), {
        teacherId: user.uid,
        date: date,
        time: time,
        createdAt: new Date().toISOString()
      });
    }

    showToast(`${selectedSlots.size} slot(s) added successfully!`, "success");

    // Reset
    selectedSlots.clear();
    document.querySelectorAll("#timeSlots .slot-btn").forEach(b => b.classList.remove("selected"));
    availDate.value = "";

    // Refresh availability list
    loadAvailability(user);

  } catch (error) {
    showToast("Failed to add availability", "error");
  }

  addAvailBtn.disabled = false;
  addAvailText.style.display = "inline";
  addAvailSpinner.style.display = "none";
});

// ============================================
// LOAD AVAILABILITY
// ============================================
async function loadAvailability(user) {
  try {
    const q = query(
      collection(db, "availability"),
      where("teacherId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    availList.innerHTML = "";

    if (snapshot.empty) {
      availList.innerHTML = `<p class="text-muted">No slots set yet</p>`;
      return;
    }

    // Group by date
    const grouped = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!grouped[data.date]) grouped[data.date] = [];
      grouped[data.date].push({ id: docSnap.id, ...data });
    });

    // Sort dates
    const sortedDates = Object.keys(grouped).sort();

    sortedDates.forEach((date, idx) => {
      const slots = grouped[date];
      const dateStr = formatDate(date);

      slots.forEach(slot => {
        const item = document.createElement("div");
        item.className = "avail-item";
        item.style.animationDelay = `${idx * 0.05}s`;
        item.innerHTML = `
          <div class="avail-info">
            <span>📅 ${dateStr}</span>
            <span>🕐 ${slot.time}</span>
          </div>
          <button class="delete-btn" title="Remove slot">🗑️</button>
        `;

        item.querySelector(".delete-btn").addEventListener("click", async () => {
          try {
            await deleteDoc(doc(db, "availability", slot.id));
            showToast("Slot removed", "info");
            loadAvailability(user);
          } catch (err) {
            showToast("Failed to remove slot", "error");
          }
        });

        availList.appendChild(item);
      });
    });
  } catch (error) {
    showToast("Failed to load availability", "error");
  }
}

// ============================================
// LISTEN TO APPOINTMENT REQUESTS (Real-time)
// ============================================
function listenRequests(user) {
  const q = query(
    collection(db, "appointments"),
    where("teacherId", "==", user.uid)
  );

  requestsContainer.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>`;

  unsubRequests = onSnapshot(q, async (snapshot) => {
    requestsContainer.innerHTML = "";

    const pending = [];
    const history = [];

    snapshot.forEach(docSnap => {
      const data = { id: docSnap.id, ...docSnap.data() };
      if (data.status === "pending") {
        pending.push(data);
      } else {
        history.push(data);
      }
    });

    if (pending.length === 0 && history.length === 0) {
      requestsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No requests yet</h3>
          <p>New appointment requests will appear here</p>
        </div>`;
      return;
    }

    // Pending requests
    if (pending.length > 0) {
      const heading = document.createElement("h3");
      heading.style.cssText = "font-size:15px;font-weight:700;margin-bottom:12px;color:var(--warning)";
      heading.textContent = `⏳ Pending Requests (${pending.length})`;
      requestsContainer.appendChild(heading);

      for (const [idx, data] of pending.entries()) {
        // Fetch student name
        let studentName = data.studentEmail || data.studentId;
        try {
          const studentDoc = await getDoc(doc(db, "users", data.studentId));
          if (studentDoc.exists()) studentName = studentDoc.data().name;
        } catch {}

        const card = document.createElement("div");
        card.className = "request-card";
        card.style.animationDelay = `${idx * 0.08}s`;
        card.innerHTML = `
          <div class="request-info">
            <div class="req-label">Student</div>
            <div class="req-value">👨‍🎓 ${studentName}</div>
            <div class="req-label">Date & Time</div>
            <div class="req-value">📅 ${formatDate(data.date)} ${data.time ? "• 🕐 " + data.time : ""}</div>
          </div>
          <div class="request-actions">
            <button class="btn btn-success btn-sm approve-btn">✅ Approve</button>
            <button class="btn btn-danger btn-sm reject-btn">❌ Reject</button>
          </div>
        `;

        card.querySelector(".approve-btn").addEventListener("click", () => updateStatus(data.id, "approved"));
        card.querySelector(".reject-btn").addEventListener("click", () => updateStatus(data.id, "rejected"));

        requestsContainer.appendChild(card);
      }
    }

    // History
    if (history.length > 0) {
      const heading = document.createElement("h3");
      heading.style.cssText = "font-size:15px;font-weight:700;margin:20px 0 12px;color:var(--text-muted)";
      heading.textContent = `📋 History (${history.length})`;
      requestsContainer.appendChild(heading);

      history.forEach((data, idx) => {
        const statusConfig = {
          approved: { icon: "✅", label: "Approved", badge: "badge-approved" },
          rejected: { icon: "❌", label: "Rejected", badge: "badge-rejected" }
        };
        const s = statusConfig[data.status] || { icon: "❓", label: data.status, badge: "" };

        const item = document.createElement("div");
        item.className = "avail-item";
        item.style.animationDelay = `${idx * 0.05}s`;
        item.innerHTML = `
          <div class="avail-info">
            <span>📅 ${formatDate(data.date)}</span>
            <span>${data.time ? "🕐 " + data.time : ""}</span>
          </div>
          <span class="badge ${s.badge}">${s.label}</span>
        `;
        requestsContainer.appendChild(item);
      });
    }
  }, (error) => {
    showToast("Failed to load requests", "error");
  });
}

// ============================================
// UPDATE APPOINTMENT STATUS
// ============================================
async function updateStatus(appointmentId, status) {
  try {
    await updateDoc(doc(db, "appointments", appointmentId), { status });
    showToast(`Appointment ${status}!`, status === "approved" ? "success" : "info");
  } catch (error) {
    showToast("Failed to update status", "error");
  }
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
    if (unsubRequests) unsubRequests();
    await signOut(auth);
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    showToast("Logged out successfully", "success");
    setTimeout(() => { window.location.href = "login.html"; }, 600);
  } catch (error) {
    showToast("Logout failed", "error");
  }
});