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
  window.location.href = "index.html";
}

function openModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.remove("hidden");

  if (!email) return;

  fetch(`https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/userAPI/users?email=${email}`)
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

  fetch("https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/userAPI/users", {
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

  try {

    // Get selected file
    const fileInput = document.getElementById("resumeInput");
    const file = fileInput.files[0];

    // Check if a file was selected
    if (!file) {
      alert("❌ Please select a resume first.");
      return;
    }

    const fileName = file.name;

    console.log("📄 Selected file:", fileName);

    // Get logged-in user name
    const name = localStorage.getItem("userName");

    if (!name) {
      alert("❌ User name not found. Please log in.");
      return;
    }

    console.log("👤 Username:", name);


    // =====================================
    // STEP 1: Generate Presigned URL
    // =====================================

    const presignRes = await fetch(
      "https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/resume-analysis/generatepresignedurl",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName,
          name
        })
      }
    );


    const presignData = await presignRes.json();

    console.log("📦 Presigned URL response:", presignData);


    if (!presignRes.ok) {
      throw new Error(
        presignData.error ||
        "Failed to generate upload URL"
      );
    }


    const uploadUrl = presignData.uploadUrl;
    const key = presignData.key;


    if (!uploadUrl || !key) {
      throw new Error(
        "Upload URL or S3 key missing from API response"
      );
    }


    console.log("🔑 S3 Key:", key);


    // =====================================
    // STEP 2: Upload Resume to S3
    // =====================================

    console.log("⬆️ Uploading resume...");


    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file
    });


    if (!uploadRes.ok) {
      throw new Error("Resume upload failed");
    }


    console.log("✅ Resume uploaded successfully");


    // =====================================
    // STEP 3: Analyze Resume
    // =====================================

    console.log("🔍 Starting resume analysis...");


    const analyzeRes = await fetch(
      "https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/resume-analysis/resume-upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bucket: "resumatch-resumes-new",
          fileName: key
        })
      }
    );


    const data = await analyzeRes.json();


    console.log("📊 Analysis response:", data);


    if (!analyzeRes.ok) {
      throw new Error(
        data.error ||
        "Resume analysis failed"
      );
    }


    // =====================================
    // STEP 4: Save Report
    // =====================================

    localStorage.setItem(
      "resumeReport",
      JSON.stringify(data)
    );


    // Also save the file information
    localStorage.setItem(
      "currentResumeFile",
      fileName
    );


    localStorage.setItem(
      "currentResumeKey",
      key
    );


    console.log("💾 Resume report saved");


    // =====================================
    // STEP 5: Redirect to Analysis Page
    // =====================================

    console.log("➡️ Redirecting to analysis page...");


    window.location.href =
      "../resume-analysis/ra.html";


  } catch (error) {

    console.error(
      "❌ Resume analysis error:",
      error
    );

    alert(
      "❌ Something went wrong: " +
      error.message
    );

  }

}