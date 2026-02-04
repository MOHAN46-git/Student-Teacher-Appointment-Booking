const roles = document.querySelectorAll(".role");

roles.forEach(role => {
  role.addEventListener("click", () => {
    roles.forEach(r => r.classList.remove("active"));
    role.classList.add("active");
  });
});

document.querySelector(".register-btn").addEventListener("click", () => {
  alert("Demo Mode: Account created (frontend only)");
});
