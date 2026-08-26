// dashboard.js

function logoutUser() {
    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";
  }
  
  // Optional: Dark mode toggle logic
  function toggleDarkMode() {
    document.documentElement.classList.toggle("dark");
    const currentMode = document.documentElement.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", currentMode);
  }
  
  // Set theme on page load
  window.onload = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  };
  