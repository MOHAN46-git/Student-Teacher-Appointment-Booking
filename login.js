const roles = document.querySelectorAll(".role");

roles.forEach(role => {
  role.addEventListener("click", () => {
    roles.forEach(r => r.classList.remove("active"));
    role.classList.add("active");
  });
});

document.querySelector(".login-btn").addEventListener("click", () => {
  alert("Demo Mode: Frontend-only login");
});
