// ============================================
// INDEX.JS — Landing Page Logic
// ============================================

document.addEventListener("DOMContentLoaded", () => {

  // ---- Navbar scroll effect ----
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // ---- Mobile menu toggle ----
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const navLinks = document.getElementById("navLinks");

  if (mobileBtn) {
    mobileBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  // ---- Scroll reveal animations ----
  const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Add staggered delay for cards in the same section
        const siblings = entry.target.parentElement.querySelectorAll(".animate-on-scroll");
        const idx = Array.from(siblings).indexOf(entry.target);
        entry.target.style.transitionDelay = `${idx * 0.1}s`;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".animate-on-scroll").forEach(el => {
    observer.observe(el);
  });

  // ---- Smooth scroll for nav links ----
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        navLinks.classList.remove("open");
      }
    });
  });

});
