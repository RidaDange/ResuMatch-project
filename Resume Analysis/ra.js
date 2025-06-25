// Auto-load the uploaded resume from sessionStorage or set a fallback PDF
const resumeView = document.getElementById("resumeView");
const resumeURL = sessionStorage.getItem("uploadedResumeURL");

if (resumeURL) {
  resumeView.src = resumeURL;
} else {
  resumeView.src = "sample-resume.pdf"; // fallback demo PDF
}

// Download resume
document.getElementById("downloadBtn").addEventListener("click", () => {
  if (resumeURL) {
    const link = document.createElement("a");
    link.href = resumeURL;
    link.download = "Uploaded_Resume.pdf";
    link.click();
  } else {
    alert("Resume not found.");
  }
});

//Login Detection and Redirect (Frontend Example)
window.onload = function () {
  const isLoggedIn = localStorage.getItem("userLoggedIn"); // or sessionStorage

  if (isLoggedIn) {
      document.getElementById("profileDropdown").classList.remove("hidden");
      // Optionally hide signup/login buttons
      document.getElementById("loginBtn").classList.add("hidden");
      document.getElementById("signupBtn").classList.add("hidden");
  }
};


//logout functionality
function logoutUser() {
  localStorage.removeItem("userLoggedIn"); // Clear login state
  window.location.href = "index.html"; // Redirect to home
}

function toggleProfileMenu() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.toggle("hidden");
}