// ============================================
// EMAIL-SERVICE.JS — EmailJS Integration
// ============================================
// Using EmailJS free tier (200 emails/month)
// Setup: https://www.emailjs.com/
//
// IMPORTANT: You need to create an EmailJS account and set up:
// 1. Email Service (Gmail) — get SERVICE_ID
// 2. Email Templates — get TEMPLATE_IDs
// 3. Public Key — get PUBLIC_KEY
// Then update the constants below.
// ============================================

const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";

// Template IDs
const TEMPLATE_APPOINTMENT_REQUEST = "template_appt_request";
const TEMPLATE_APPOINTMENT_APPROVED = "template_appt_approved";
const TEMPLATE_APPOINTMENT_REJECTED = "template_appt_rejected";
const TEMPLATE_APPOINTMENT_POSTPONED = "template_appt_postponed";

// Initialize EmailJS
let emailJsLoaded = false;

function loadEmailJS() {
  return new Promise((resolve) => {
    if (emailJsLoaded) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.onload = () => {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
      emailJsLoaded = true;
      resolve();
    };
    script.onerror = () => resolve(); // Fail silently
    document.head.appendChild(script);
  });
}

// ---- Send Email Helper ----
async function sendEmail(templateId, templateParams) {
  try {
    await loadEmailJS();
    if (!window.emailjs || EMAILJS_PUBLIC_KEY === "YOUR_EMAILJS_PUBLIC_KEY") {
      console.log("[EmailJS] Not configured. Email params:", templateParams);
      return { success: false, reason: "not_configured" };
    }
    const result = await window.emailjs.send(EMAILJS_SERVICE_ID, templateId, templateParams);
    console.log("[EmailJS] Sent:", result);
    return { success: true };
  } catch (error) {
    console.error("[EmailJS] Error:", error);
    return { success: false, reason: error.text || error.message };
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Send email when student books an appointment
 */
export async function notifyTeacherNewAppointment({ teacherEmail, teacherName, studentName, degree, section, date, time }) {
  return sendEmail(TEMPLATE_APPOINTMENT_REQUEST, {
    to_email: teacherEmail,
    to_name: teacherName,
    student_name: studentName,
    degree: degree || "N/A",
    section: section || "N/A",
    date: date,
    time: time || "N/A",
    subject: `New Appointment Request from ${studentName}`
  });
}

/**
 * Send email when teacher approves appointment
 */
export async function notifyStudentApproved({ studentEmail, studentName, teacherName, date, time }) {
  return sendEmail(TEMPLATE_APPOINTMENT_APPROVED, {
    to_email: studentEmail,
    to_name: studentName,
    teacher_name: teacherName,
    date: date,
    time: time || "N/A",
    subject: `Appointment Approved by ${teacherName}`
  });
}

/**
 * Send email when teacher rejects appointment
 */
export async function notifyStudentRejected({ studentEmail, studentName, teacherName, date, time }) {
  return sendEmail(TEMPLATE_APPOINTMENT_REJECTED, {
    to_email: studentEmail,
    to_name: studentName,
    teacher_name: teacherName,
    date: date,
    time: time || "N/A",
    subject: `Appointment Rejected by ${teacherName}`
  });
}

/**
 * Send email when teacher postpones appointment
 */
export async function notifyStudentPostponed({ studentEmail, studentName, teacherName, oldDate, oldTime, newDate, newTime, reason }) {
  return sendEmail(TEMPLATE_APPOINTMENT_POSTPONED, {
    to_email: studentEmail,
    to_name: studentName,
    teacher_name: teacherName,
    old_date: oldDate,
    old_time: oldTime || "N/A",
    new_date: newDate,
    new_time: newTime,
    reason: reason || "Schedule conflict",
    subject: `Appointment Postponed by ${teacherName}`
  });
}
