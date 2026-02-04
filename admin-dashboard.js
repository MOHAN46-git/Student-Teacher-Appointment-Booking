// Change role here:
// "student" | "teacher" | "admin"
let currentRole = "admin";

const studentDashboard = document.getElementById("studentDashboard");
const teacherDashboard = document.getElementById("teacherDashboard");
const adminDashboard = document.getElementById("adminDashboard");
const pageTitle = document.getElementById("pageTitle");

studentDashboard.classList.add("hidden");
teacherDashboard.classList.add("hidden");
adminDashboard.classList.add("hidden");

if (currentRole === "student") {
  studentDashboard.classList.remove("hidden");
  pageTitle.innerText = "Student Dashboard";
} 
else if (currentRole === "teacher") {
  teacherDashboard.classList.remove("hidden");
  pageTitle.innerText = "Teacher Dashboard";
} 
else {
  adminDashboard.classList.remove("hidden");
  pageTitle.innerText = "Admin Dashboard";
}
