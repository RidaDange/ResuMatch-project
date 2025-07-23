function toggleTheme() {
  document.documentElement.classList.toggle('dark');
}
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-yellow-500";

  toast.className = `${bgColor} text-white px-4 py-2 rounded shadow-md animate-slide-in`;
  toast.textContent = message;

  const container = document.getElementById("toast-container");
  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function toggleProfileMenu() {
  const menu = document.getElementById("dropdownMenu");
  if (menu) menu.classList.toggle("hidden");
}

const email = localStorage.getItem("userEmail");

function updateNavbarUI() {
  const isLoggedIn = localStorage.getItem("userLoggedIn");
  const userName = localStorage.getItem("userName");

  const signupLink = document.getElementById("signupLink");
  const loginLink = document.getElementById("loginLink");
  const userWelcome = document.getElementById("userWelcome");
  const historyLink = document.getElementById("historyLink");
  const logoutLink = document.getElementById("logoutLink");

  if (isLoggedIn && userName) {
    signupLink.classList.add("hidden");
    loginLink.classList.add("hidden");
    userWelcome.classList.remove("hidden");
    logoutLink.classList.remove("hidden");
    historyLink.classList.remove("hidden");
    userWelcome.textContent = `Welcome, ${userName}!`;
  } else {
    signupLink.classList.remove("hidden");
    loginLink.classList.remove("hidden");
    userWelcome.classList.add("hidden");
    historyLink.classList.add("hidden");
    logoutLink.classList.add("hidden");
  }
}

window.onload = updateNavbarUI;

function logoutUser() {
  localStorage.removeItem("userLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  window.location.href = "/ResuMatch_final/Home_page/index.html";
}

function openModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.remove("hidden");

  if (!email) return;

  fetch(`https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/userapi/userAPI?email=${email}`)
    .then(res => res.json())
    .then(user => {
      document.querySelector('input[name="name"]').value = user.name || '';
      document.querySelector('input[name="email"]').value = user.email || '';
      document.querySelector('input[name="contact"]').value = user.contact || '';
    })
    .catch(err => {
      console.error("Failed to load user profile:", err);
      alert("❌ Failed to fetch profile data.");
    });
}

function closeModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.add("hidden");
}

document.getElementById('profileForm')?.addEventListener('submit', function (e) {
  e.preventDefault();

  const form = e.target;
  const name = form.elements['name'].value;
  const contact = form.elements['contact'].value;
  const password = form.elements['password'].value;
  const new_email = form.elements['new_email']?.value?.trim();

  if (!email) {
    alert("❌ Email not found in session.");
    return;
  }

  fetch("https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/userapi/userAPI", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, contact, password, email, new_email })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      alert("✅ " + data.message);
      localStorage.setItem("userName", name);
      closeModal();
      window.onload();
    })
    .catch(err => {
      console.error("Update failed:", err);
      alert("❌ Failed to update profile: " + err.message);
    });
});

async function analyzeResume() {
  const file = document.getElementById("resumeInput").files[0];
  const fileName = file.name;

  // 🔑 Step 0: Get user name (from localStorage or form)
  const name = localStorage.getItem("userName"); // or replace with actual logic
  if (!name) {
    alert("User name not found. Please log in.");
    return;
  }
  console.log("Username:", name);

  // ✅ Step 1: Generate presigned URL from backend
  const presignRes = await fetch("https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/resumeUpload/generatepresignedURL", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, name }) // ✅ Include name here
  });

  const { uploadUrl, key } = await presignRes.json(); // ✅ get key
  console.log("Presigned URL:", uploadUrl);

  // ✅ Step 2: Upload resume to S3 using presigned URL
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file
  });

  if (!uploadRes.ok) {
    alert("❌ Upload failed");
    return;
  }

  // ✅ Step 3: Call backend to analyze resume
  const analyzeRes = await fetch("https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/resumeUpload/resume_analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: "resumatch-resumes",
      fileName: key  // ✅ Full path with name folder
    })
  });

  const data = await analyzeRes.json();

  // ✅ Step 4: Save response to localStorage
  localStorage.setItem("resumeReport", JSON.stringify(data));

  // ✅ Step 5: Redirect to report page
  window.location.href = "/ResuMatch_final/resume-analysis/ra.html";
}