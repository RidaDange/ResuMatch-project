
let loginVisible = false;
function toggleLoginPassword() {
    const input = document.getElementById("loginPassword");
    const icon = document.getElementById("loginEyeIcon");

    loginVisible = !loginVisible;
    input.type = loginVisible ? "text" : "password";

    icon.innerHTML = loginVisible
        ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.707-3.045"/>
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M6.423 6.423A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7"/>
           <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
        : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M2.458 12C3.732 7.943 7.522 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7z"/>`;
}

document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("input[type='email']").value;
    const password = document.getElementById("loginPassword").value;

    const apiUrl = `https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/userapi/userAPI?email=${encodeURIComponent(email)}`;

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
        });

        const data = await response.json();

        if (response.ok) {
            if (data.password === password) {
                alert("✅ Login successful!");

                // Store login state
                localStorage.setItem("userLoggedIn", true);
                localStorage.setItem("userEmail", data.email);
                localStorage.setItem("userName", data.name);

                // Redirect to homepage
                window.location.href = "/ResuMatch/Home_page/index.html";
            } else {
                alert("❌ Incorrect password");
            }
        } else {
            alert("❌ Login failed: " + data.error);
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("❌ An error occurred during login.");
    }
});