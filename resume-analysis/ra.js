// =====================================================
// API ENDPOINTS
// =====================================================

// Frontend calls ONLY resume_analysis Lambda

const PRESIGNED_UPLOAD_ENDPOINT =
  "https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/resume-analysis/generatepresignedurl";

const PRESIGNED_DOWNLOAD_ENDPOINT =
  "https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/resume-analysis/generatepresigneddownloadurl";

const ANALYZE_ENDPOINT =
  "https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/resume-analysis/resume-upload";


// =====================================================
// GET PRESIGNED DOWNLOAD URL
// =====================================================

async function getPresignedDownloadURL(key) {

  const response = await fetch(
    PRESIGNED_DOWNLOAD_ENDPOINT,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        key: key
      })
    }
  );

  const data = await response.json();

  console.log(
    "📥 Presigned download response:",
    data
  );

  if (!response.ok) {

    throw new Error(
      data.error ||
      "Failed to generate download URL"
    );

  }

  if (!data.downloadUrl) {

    throw new Error(
      "Download URL not received"
    );

  }

  return data.downloadUrl;

}


// =====================================================
// STEP 0: SHOW UPLOADED RESUME PREVIEW
// =====================================================

const resumeView =
  document.getElementById("resumeView");

const resumeURL =
  sessionStorage.getItem("uploadedResumeURL");

if (
  resumeView &&
  resumeURL
) {

  resumeView.src =
    resumeURL;

}


// =====================================================
// UPLOAD AND ANALYZE RESUME
// =====================================================

async function analyzeResume() {

  const fileInput =
    document.getElementById("resumeInput");

  const file =
    fileInput?.files[0];


  if (!file) {

    alert(
      "Please select a resume file."
    );

    return;

  }


  const fileName =
    file.name;


  const bucket =
    "resumatch-resumes-new";


  try {

    // =================================================
    // STEP 1: GET PRESIGNED UPLOAD URL
    // =================================================

    console.log(
      "🚀 Requesting presigned upload URL..."
    );


    const presignedRes =
      await fetch(
        PRESIGNED_UPLOAD_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            fileName: fileName
          })
        }
      );


    const presignedData =
      await presignedRes.json();


    console.log(
      "📦 Presigned upload response:",
      presignedData
    );


    if (!presignedRes.ok) {

      throw new Error(
        presignedData.error ||
        "Presigned URL not received"
      );

    }


    const uploadUrl =
      presignedData.uploadUrl;

    const key =
      presignedData.key;


    if (
      !uploadUrl ||
      !key
    ) {

      throw new Error(
        "Invalid presigned upload response"
      );

    }


    // =================================================
    // STEP 2: UPLOAD RESUME TO S3
    // =================================================

    console.log(
      "📤 Uploading resume to S3..."
    );


    const uploadRes =
      await fetch(
        uploadUrl,
        {
          method: "PUT",

          body: file
        }
      );


    if (!uploadRes.ok) {

      throw new Error(
        "Upload to S3 failed"
      );

    }


    console.log(
      "✅ Resume uploaded successfully"
    );


    // =================================================
    // STEP 3: GENERATE PRESIGNED DOWNLOAD URL
    // =================================================

    console.log(
      "🔐 Generating secure resume URL..."
    );


    const downloadURL =
      await getPresignedDownloadURL(
        key
      );


    sessionStorage.setItem(
      "uploadedResumeURL",
      downloadURL
    );


    // =================================================
    // STEP 4: GET JOB DESCRIPTION
    // =================================================

    const jdTextarea =
      document.getElementById(
        "jdInput"
      );


    const jdText =
      jdTextarea
        ? jdTextarea.value.trim()
        : "";


    // =================================================
    // STEP 5: ANALYZE RESUME
    // =================================================

    console.log(
      "🧠 Sending resume for analysis..."
    );


    const analyzeRes =
      await fetch(
        ANALYZE_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            bucket: bucket,

            fileName: key,

            jd_text: jdText

          })
        }
      );


    const data =
      await analyzeRes.json();


    console.log(
      "🔍 Analysis Data:",
      data
    );


    if (
      !analyzeRes.ok ||
      data.error
    ) {

      throw new Error(
        data.error ||
        "Resume analysis failed"
      );

    }


    // =================================================
    // STEP 6: SAVE ANALYSIS RESULT
    // =================================================

    sessionStorage.setItem(
      "analysisResult",
      JSON.stringify(data)
    );


    // =================================================
    // STEP 7: REDIRECT TO REPORT PAGE
    // =================================================

    window.location.href =
      `resume-analysis/ra.html?file=${encodeURIComponent(key)}`;


  } catch (err) {

    console.error(
      "❌ Error:",
      err
    );


    alert(
      "❌ Upload or analysis failed: " +
      err.message
    );

  }

}


// =====================================================
// DOM LOADED
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {


    // =================================================
    // ANALYZE BUTTON
    // =================================================

    const analyzeBtn =
      document.getElementById(
        "analyzeBtn"
      );


    if (analyzeBtn) {

      analyzeBtn.addEventListener(
        "click",
        analyzeResume
      );

    }


    // =================================================
    // CHECK IF THIS IS REPORT PAGE
    // =================================================

    const resumeView =
      document.getElementById(
        "resumeView"
      );


    const path =
      decodeURIComponent(
        window.location.pathname
      ).toLowerCase();


    if (
      !path.endsWith("/ra.html")
    ) {

      return;

    }


    const queryParams =
      new URLSearchParams(
        window.location.search
      );


    const fileFromHistory =
      queryParams.get("file");


    console.log(
      "🎯 File from query param:",
      fileFromHistory
    );


    // =================================================
    // CASE 1: OPENING FROM HISTORY
    // =================================================

    if (fileFromHistory) {


      try {

        // =============================================
        // GENERATE PRESIGNED RESUME URL
        // =============================================

        console.log(
          "🔐 Generating secure resume URL..."
        );


        const resumeDownloadURL =
          await getPresignedDownloadURL(
            fileFromHistory
          );


        if (resumeView) {

          resumeView.src =
            resumeDownloadURL;

        }


        // =============================================
        // REPORT KEY
        // =============================================

        const reportKey =
          `resumes-reports/${fileFromHistory}.json`;


        console.log(
          "📦 Report key:",
          reportKey
        );


        // =============================================
        // GENERATE PRESIGNED REPORT URL
        // =============================================

        console.log(
          "🔐 Generating secure report URL..."
        );


        const reportURL =
          await getPresignedDownloadURL(
            reportKey
          );


        // =============================================
        // FETCH REPORT
        // =============================================

        console.log(
          "📥 Fetching saved report..."
        );


        const response =
          await fetch(
            reportURL
          );


        if (!response.ok) {

          throw new Error(
            `Failed to fetch report: ${response.status}`
          );

        }


        const data =
          await response.json();


        console.log(
          "✅ Report Data:",
          data
        );


        renderReport(
          data
        );


      } catch (err) {

        console.error(
          "❌ Failed to load saved report:",
          err
        );


        alert(
          "Saved report could not be loaded."
        );

      }


      return;

    }


    // =================================================
    // CASE 2: COMING FROM UPLOAD FLOW
    // =================================================

    const resumeURL =
      sessionStorage.getItem(
        "uploadedResumeURL"
      );


    const analysisResult =
      sessionStorage.getItem(
        "analysisResult"
      );


    const data =
      analysisResult
        ? JSON.parse(
          analysisResult
        )
        : null;


    if (
      resumeView &&
      resumeURL
    ) {

      resumeView.src =
        resumeURL;

    }


    if (data) {

      renderReport(
        data
      );

    } else {

      alert(
        "❌ No analysis data found. Please upload a resume first."
      );

    }

  }
);


// =====================================================
// RENDER REPORT
// =====================================================

function renderReport(data) {


  const atsScore =
    data.ats_score ||
    "N/A";


  const atsValue =
    parseInt(
      atsScore
    );


  // =================================================
  // ATS SCORE
  // =================================================

  const atsScoreElement =
    document.getElementById(
      "atsScore"
    );


  if (atsScoreElement) {

    atsScoreElement.textContent =
      atsScore;

  }


  const atsBar =
    document.getElementById(
      "atsScoreBar"
    );


  if (
    atsBar &&
    !isNaN(atsValue)
  ) {

    atsBar.style.width =
      atsValue + "%";

  }


  // =================================================
  // TONE
  // =================================================

  const toneLanguage =
    document.getElementById(
      "toneLanguage"
    );


  if (toneLanguage) {

    toneLanguage.innerText =
      data.sentiment ||
      "N/A";

  }


  // =================================================
  // STRENGTHS
  // =================================================

  const strengthsList =
    document.getElementById(
      "strengthsList"
    );


  if (strengthsList) {

    strengthsList.innerHTML =
      (data.strengths || [])
        .map(
          item =>
            `<li>${item}</li>`
        )
        .join("");

  }


  // =================================================
  // SUGGESTIONS
  // =================================================

  const suggestionsList =
    document.getElementById(
      "suggestionsList"
    );


  if (suggestionsList) {

    suggestionsList.innerHTML =
      (data.suggestions || [])
        .map(
          item =>
            `<li>${item}</li>`
        )
        .join("");

  }


  // =================================================
  // JOB RECOMMENDATIONS
  // =================================================

  const jobsList =
    document.getElementById(
      "jobsList"
    );


  if (jobsList) {

    jobsList.innerHTML =
      (data.jobs || [])
        .map(
          item =>
            `<li>${item}</li>`
        )
        .join("");

  }

}