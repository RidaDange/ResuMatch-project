// Scroll-based back to top button
const backToTopBtn = document.getElementById("backToTopBtn");

window.onscroll = function () {
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        backToTopBtn.classList.remove("hidden");
    } else {
        backToTopBtn.classList.add("hidden");
    }
};

backToTopBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
});


function togglePassword() {
    const passwordInput = document.getElementById('signupPassword');
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
}

function openSignup() {
    document.getElementById("signupModal").classList.remove("hidden");
}

function closeSignup() {
    document.getElementById("signupModal").classList.add("hidden");
}

function openLogin() {
    document.getElementById("loginModal").classList.remove("hidden");
}

function closeLogin() {
    document.getElementById("loginModal").classList.add("hidden");
}


async function handleSignup(event) {
    event.preventDefault();
    const inputs = event.target.querySelectorAll("input");
    const name = inputs[0].value;
    const contact = inputs[1].value;
    const email = inputs[2].value;
    const password = inputs[3].value;

    try {
        const res = await fetch("https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/userAPI/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, contact, email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signup failed");

        localStorage.setItem("userLoggedIn", true);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", name);

        closeSignup();
        updateNavbarUI();

        alert("✅ Signup successful!");
    } catch (err) {
        alert("❌ Signup failed: " + err.message);
    }
}

function toggleLoginPassword() {
    const loginPass = document.getElementById('loginPassword');
    loginPass.type = loginPass.type === 'password' ? 'text' : 'password';
}

async function handleLogin(event) {
    event.preventDefault();

    const inputs = event.target.querySelectorAll("input");

    const email = inputs[0].value.trim().toLowerCase();
    const password = inputs[1].value;

    try {
        console.log("📧 Login email:", email);
        console.log("🔑 Password entered:", password);

        const url =
            `https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/userAPI/users?email=${encodeURIComponent(email)}`;

        console.log("🌐 Calling:", url);

        const res = await fetch(url);

        console.log("HTTP status:", res.status);

        const user = await res.json();

        console.log("📦 Response from Lambda:", user);

        if (!res.ok) {
            throw new Error(user.error || `API error: ${res.status}`);
        }

        console.log("Password returned by API:", user.password);
        console.log("Entered password:", password);
        console.log(
            "Password match:",
            user.password === password
        );

        if (!user || user.password !== password) {
            throw new Error("Invalid credentials");
        }

        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", user.name);

        closeLogin();
        updateNavbarUI();

        alert("✅ Login successful!");

    } catch (err) {
        console.error("❌ LOGIN ERROR:", err);
        alert("❌ Login failed: " + err.message);
    }
}

function openQueryPopup() {
    document.getElementById('queryModal').classList.remove('hidden');
}

function closeQueryPopup() {
    document.getElementById('queryModal').classList.add('hidden');
}

function handleQuerySubmit(event) {
    event.preventDefault();
    closeQueryPopup();
    alert("Thank you! Your query has been submitted.");
}

document.getElementById('uploadForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const analyzeBtn = document.getElementById('analyzeResume');
    const analyzeText = document.getElementById('analyzeText');
    const analyzeLoader = document.getElementById('analyzeLoader');

    // Show loader and disable button
    analyzeBtn.disabled = true;
    analyzeText.classList.add('hidden');
    analyzeLoader.classList.remove('hidden');

    // ✅ Call the actual resume analysis logic
    analyzeResume().catch(error => {
        console.error("Error analyzing resume:", error);
        alert("Something went wrong during resume analysis.");
    }).finally(() => {
        // Restore UI no matter what
        analyzeBtn.disabled = false;
        analyzeText.classList.remove('hidden');
        analyzeLoader.classList.add('hidden');
    });
});
