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
    const historyBtn = document.getElementById("historyBtn");

    if (loginBtn && signupBtn && profileDropdown) {
        if (isLoggedIn && userName) {
            loginBtn.classList.add("hidden");
            signupBtn.classList.add("hidden");
            profileDropdown.classList.remove("hidden");
            if (welcomeText) welcomeText.textContent = `Welcome, ${userName}`;
            if (historyBtn) historyBtn.classList.remove("hidden");
        } else {
            loginBtn.classList.remove("hidden");
            signupBtn.classList.remove("hidden");
            profileDropdown.classList.add("hidden");
            if (historyBtn) historyBtn.classList.add("hidden");
        }
    }
};

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

document.getElementById("filterBtn").addEventListener("click", () => {
    document.getElementById("filterDropdown").classList.toggle("hidden");
});

const historyContainer = document.getElementById("historyContainer");

async function fetchResumes() {
    if (!email) {
        alert("User not logged in.");
        return;
    }

    try {
        const res = await fetch(`https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/getResume/resumes?email=${email}`);
        const files = await res.json();

        const enriched = await Promise.all(
            files.map(async f => {
                const reportKey = `resumes-reports/${encodeURIComponent(f.filename)}.json`;
                const reportURL = `https://resumatch-resumes-new.s3.ap-south-1.amazonaws.com/${reportKey}`;

                let score = "N/A";
                try {
                    const reportRes = await fetch(reportURL);
                    const reportData = await reportRes.json();
                    score = reportData.ats_score || "N/A";
                } catch (err) {
                    console.warn(`⚠️ Could not fetch report for ${f.filename}`);
                }

                return {
                    filename: f.filename,
                    uploaded: new Date(f.uploaded).toISOString().split("T")[0],
                    score
                };
            })
        );

        renderHistory(enriched);

    } catch (err) {
        console.error("Fetch failed", err);
        alert("Failed to load resumes");
    }
}

function renderHistory(data) {
    historyContainer.innerHTML = '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = "bg-white p-4 shadow-lg rounded-xl transition hover:shadow-xl text-center";
        card.innerHTML = `
                <img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="Resume Icon" class="w-24 h-24 mx-auto mb-4">
                <h3 class="text-lg font-semibold mb-1">${item.filename}</h3>
                <p class="text-sm text-gray-500 mb-1">Uploaded: ${item.uploaded}</p>
                <p class="text-sm text-green-600 font-semibold mb-4">ATS Score: ${item.score}</p>
                <div class="flex justify-center space-x-3">
                    <a href="/ResuMatch/Resume Analysis/resume-analysis.html?file=${encodeURIComponent(item.filename)}" 
                       class="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">View</a>
                    <button onclick="deleteResume('${item.filename}')" class="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50">Delete</button>
                </div>
            `;
        historyContainer.appendChild(card);
    });
}

function deleteResume(filename) {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    fetch("https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/getResume/resumes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, email })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            alert("✅ Resume deleted");
            fetchResumes();
        })
        .catch(err => {
            console.error(err);
            alert("❌ Failed to delete");
        });
}

fetchResumes();