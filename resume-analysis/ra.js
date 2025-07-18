// 🔁 Select which backend API to use: "analysis" or "report"
const selectedAPI = "report"; // Change to "analysis" if needed

// 🌐 Endpoint map for both APIs
const endpointMap = {
  analysis: "https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/resumeUpload/resume_analysis",
  report: "https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/resumeReport/resume_report"
};

// STEP 0: Show uploaded resume preview if already in session
const resumeView = document.getElementById("resumeView");
const resumeURL = sessionStorage.getItem("uploadedResumeURL");
if (resumeView && resumeURL) {
  resumeView.src = resumeURL;
}

// STEP 1: Upload and Analyze on Button Click
async function analyzeResume() {
  const fileInput = document.getElementById("resumeInput");
  const file = fileInput?.files[0];

  if (!file) {
    alert("Please select a resume file.");
    return;
  }

  const fileName = file.name;
  const bucket = "resumatch-resumes";

  try {
    // Step 1: Get presigned URL
    const presignedRes = await fetch(
      "https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/resumeUpload/generatepresignedURL",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName })
      }
    );

    const { uploadUrl, error } = await presignedRes.json();
    if (!uploadUrl) throw new Error(error || "Presigned URL not received");

    // Step 2: Upload to S3
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file
    });
    if (!uploadRes.ok) throw new Error("Upload to S3 failed");

    const publicURL = `https://${bucket}.s3.ap-south-1.amazonaws.com/${encodeURIComponent(fileName)}`;
    sessionStorage.setItem("uploadedResumeURL", publicURL);

    // Step 3: Analyze Resume using selected API
    const endpoint = endpointMap[selectedAPI];
    const analyzeRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, fileName })
    });

    const data = await analyzeRes.json();
    console.log("🔍 Analysis Data:", data);

    if (!analyzeRes.ok || data.error) {
      throw new Error(data.error || "Resume analysis failed");
    }

    sessionStorage.setItem("analysisResult", JSON.stringify(data));

    setTimeout(() => {
      window.location.href = "/ResuMatch/Resume Analysis/resume-analysis.html";
    }, 300);
  } catch (err) {
    console.error("❌ Error:", err);
    alert("❌ Upload or analysis failed. Check console.");
  }
}

// DOM loaded logic
document.addEventListener("DOMContentLoaded", async () => {
  const analyzeBtn = document.getElementById("analyzeBtn");
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", analyzeResume);
  }

  const resumeView = document.getElementById("resumeView");

  const path = decodeURIComponent(window.location.pathname).toLowerCase();
  if (!path.endsWith("/resume-analysis.html")) return;

  const queryParams = new URLSearchParams(window.location.search);
  const fileFromHistory = queryParams.get("file");
  // console.log("🎯 File from query param:", fileFromHistory);

  // Case 1: Coming from history page with ?file=
  if (fileFromHistory) {
    const reportKey = `resumes-reports/${fileFromHistory}.json`;
    const reportURL = `https://resumatch-resumes.s3.ap-south-1.amazonaws.com/${encodeURIComponent(reportKey)}`;
    // console.log("📦 Fetching report from:", reportURL);

    try {
      const response = await fetch(reportURL);
      const data = await response.json();
      renderReport(data);
    } catch (err) {
      console.error("❌ Failed to load saved report:", err);
      alert("Saved report not found. Please reupload the resume.");
    }

    if (resumeView) {
      resumeView.src = `https://resumatch-resumes.s3.ap-south-1.amazonaws.com/${encodeURIComponent(fileFromHistory)}`;
      // console.log("📄 PDF loaded from:", resumeView.src);
    }
    return;
  }

  // Case 2: Coming from upload flow with sessionStorage
  const resumeURL = sessionStorage.getItem("uploadedResumeURL");
  const data = JSON.parse(sessionStorage.getItem("analysisResult"));

  if (resumeView && resumeURL) {
    resumeView.src = resumeURL;
  }

  if (data) {
    renderReport(data);
  } else {
    alert("❌ No analysis data found. Please upload a resume first.");
    window.location.href = "/ResuMatch/Home_page/index.html";
  }
});

// 🧠 Render logic in both cases
function renderReport(data) {
  document.getElementById("atsScore").innerText = data.ats_score || "N/A";
  document.getElementById("atsRemark").innerText = data.sentiment || "N/A";
  document.getElementById("toneLanguage").innerText = data.sentiment || "N/A";

  document.getElementById("strengthsList").innerHTML =
    (data.strengths || []).map(item => `<li>${item}</li>`).join("");

  document.getElementById("suggestionsList").innerHTML =
    (data.suggestions || []).map(item => `<li>${item}</li>`).join("");

  document.getElementById("jobsList").innerHTML =
    (data.jobs || []).map(item => `<li>${item}</li>`).join("");
}