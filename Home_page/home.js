function toggleTheme() {
  document.documentElement.classList.toggle('dark');
}

function toggleProfileMenu() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.toggle("hidden");
}

// Get email from localStorage for reuse
const email = localStorage.getItem("userEmail");

// 1. Detect login and show/hide buttons
window.onload = function () {
  const isLoggedIn = localStorage.getItem("userLoggedIn");
  const userName = localStorage.getItem("userName"); // name saved during login
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const welcomeText = document.getElementById("welcomeText");

  if (isLoggedIn && userName) {
    loginBtn.classList.add("hidden");
    signupBtn.classList.add("hidden");
    profileDropdown.classList.remove("hidden");
    welcomeText.textContent = `Welcome, ${userName}`;
  } else {
    loginBtn.classList.remove("hidden");
    signupBtn.classList.remove("hidden");
    profileDropdown.classList.add("hidden");
  }
};

// 2. Logout logic
function logoutUser() {
  localStorage.removeItem("userLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  window.location.href = "/ResuMatch/Home_page/index.html"; // or home route
}

// 3. Open profile modal and pre-fill fields
function openModal() {
  document.getElementById("profileModal").classList.remove("hidden");

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

// 4. Close modal
function closeModal() {
  document.getElementById("profileModal").classList.add("hidden");
}

// 5. Submit profile form and update user in DynamoDB
document.getElementById('profileForm')?.addEventListener('submit', function (e) {
  e.preventDefault();

  const form = e.target;
  const name = form.elements['name'].value;
  const contact = form.elements['contact'].value;
  const password = form.elements['password'].value;
  const new_email = form.elements['new_email']?.value?.trim(); // optional field

  if (!email) {
    alert("❌ Email not found in session.");
    return;
  }

  fetch("https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/userapi/userAPI", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, contact, password, email, new_email })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      alert("✅ " + data.message);
      localStorage.setItem("userName", name); // update localStorage if name changed
      closeModal();
      window.onload(); // re-run login UI update
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