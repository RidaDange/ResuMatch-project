function toggleTheme() {
  document.documentElement.classList.toggle('dark');
}

function toggleProfileMenu() {
  const menu = document.getElementById("dropdownMenu");
  if (menu) menu.classList.toggle("hidden");
}

const email = localStorage.getItem("userEmail");

window.onload = function () {
  const isLoggedIn = localStorage.getItem("userLoggedIn");
  const userName = localStorage.getItem("userName");

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const welcomeText = document.getElementById("welcomeText");

  if (loginBtn && signupBtn && profileDropdown) {
    if (isLoggedIn && userName) {
      loginBtn.classList.add("hidden");
      signupBtn.classList.add("hidden");
      profileDropdown.classList.remove("hidden");
      if (welcomeText) welcomeText.textContent = `Welcome, ${userName}`;
    } else {
      loginBtn.classList.remove("hidden");
      signupBtn.classList.remove("hidden");
      profileDropdown.classList.add("hidden");
    }
  }
};

function logoutUser() {
  localStorage.removeItem("userLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  window.location.href = "/ResuMatch/Home_page/index.html";
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

  // Step 1: Generate presigned URL from backend
  const presignRes = await fetch("https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/resumeUpload/generate-presigned-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName })
  });

  const { uploadUrl } = await presignRes.json();

  // Step 2: Upload resume to S3
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file
  });

  if (!uploadRes.ok) return alert("❌ Upload failed");

  // Step 3: Call backend to analyze resume
  const analyzeRes = await fetch("https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/resumeUpload/resume-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: "resumatch-resumes",
      file: fileName
    })
  });

  const data = await analyzeRes.json();

  // Step 4: Save response to localStorage
  localStorage.setItem("resumeReport", JSON.stringify(data));

  // Step 5: Redirect to report page
  window.location.href = "/ResuMatch/Resume_Analysis/resume-analysis.html";  // Update with actual report page path
}