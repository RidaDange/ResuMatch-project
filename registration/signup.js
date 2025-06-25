
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  passwordVisible = !passwordVisible;
  passwordInput.type = passwordVisible ? "text" : "password";

  eyeIcon.innerHTML = passwordVisible
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

// api gateway code:
document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get values from form inputs
  const inputs = document.querySelectorAll(".input-field");
  const name = inputs[0].value;
  const email = inputs[1].value;
  const contact = inputs[2].value;
  const password = document.getElementById("password").value;

  const apiUrl = "https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/userapi/userAPI";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ name, email, contact, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("✅ Signup successful!");

      // Save session details to localStorage
      localStorage.setItem("userLoggedIn", true);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", name);

      // Redirect to home page
      window.location.href = "/ResuMatch/Home_page/index.html";
    } else {
      alert("❌ Signup failed: " + data.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ An error occurred. Check console.");
  }
});