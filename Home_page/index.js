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

// Signup Popup Functions
function openSignup() {
    document.getElementById('signupModal').classList.remove('hidden');
}

function closeSignup() {
    document.getElementById('signupModal').classList.add('hidden');
}

function togglePassword() {
    const passwordInput = document.getElementById('signupPassword');
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
}

function handleSignup(event) {
    event.preventDefault();
    closeSignup();
    document.getElementById('signupLink').classList.add('hidden');
    document.getElementById('userWelcome').classList.remove('hidden');
    document.getElementById('historyLink').classList.remove('hidden');
}


function openLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function closeLogin() {
    document.getElementById('loginModal').classList.add('hidden');
}

function toggleLoginPassword() {
    const loginPass = document.getElementById('loginPassword');
    loginPass.type = loginPass.type === 'password' ? 'text' : 'password';
}

function handleLogin(event) {
    event.preventDefault();
    closeLogin();

    // Simulate login success and update UI
    document.getElementById('signupLink').classList.add('hidden');
    document.getElementById('loginLink').classList.add('hidden');
    document.getElementById('userWelcome').classList.remove('hidden');
    document.getElementById('historyLink').classList.remove('hidden');

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

    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeText = document.getElementById('analyzeText');
    const analyzeLoader = document.getElementById('analyzeLoader');

    // Show loader and disable button
    analyzeBtn.disabled = true;
    analyzeText.classList.add('hidden');
    analyzeLoader.classList.remove('hidden');

    // Simulate processing (replace this with your actual processing logic)
    setTimeout(() => {
        // Hide loader and re-enable button
        analyzeBtn.disabled = false;
        analyzeText.classList.remove('hidden');
        analyzeLoader.classList.add('hidden');

        showModal();
    }, 3000); // 3 seconds delay to simulate
});


  