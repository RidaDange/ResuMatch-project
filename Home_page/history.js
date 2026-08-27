// =====================================================
// CONFIGURATION
// =====================================================

const RESUME_API =
    "https://iq7915yme3.execute-api.ap-south-1.amazonaws.com/getResume/resumes";

const S3_BUCKET =
    "resumatch-resumes-new";

const S3_REGION =
    "ap-south-1";


// =====================================================
// GLOBAL VARIABLES
// =====================================================

const resumeList =
    document.getElementById("resumeList");

const email =
    localStorage.getItem("userEmail");

let resumeToDelete = null;


// =====================================================
// LOAD RESUMES
// =====================================================

window.addEventListener(
    "load",
    fetchResumes
);


// =====================================================
// TOAST
// =====================================================

function showToast(message, type = "success") {

    const toast =
        document.createElement("div");

    const bgColor =
        type === "success"
            ? "bg-green-500"
            : type === "error"
                ? "bg-red-500"
                : "bg-yellow-500";


    toast.className =
        `${bgColor} text-white px-4 py-2 rounded shadow-md animate-slide-in`;

    toast.textContent =
        message;


    const container =
        document.getElementById(
            "toast-container"
        );


    if (!container) {
        return;
    }


    container.appendChild(
        toast
    );


    setTimeout(() => {

        toast.classList.add(
            "animate-slide-out"
        );


        setTimeout(() => {

            toast.remove();

        }, 500);

    }, 3000);

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "N/A";
    }


    try {

        const date =
            new Date(dateValue);


        if (
            isNaN(date.getTime())
        ) {

            return String(
                dateValue
            );

        }


        return date
            .toISOString()
            .split("T")[0];


    } catch (error) {

        return "N/A";

    }

}


// =====================================================
// BUILD S3 URL
// =====================================================

function buildS3Url(key) {

    if (!key) {
        return "";
    }


    const encodedKey =
        key
            .split("/")
            .map(
                part =>
                    encodeURIComponent(
                        part
                    )
            )
            .join("/");


    return (
        `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodedKey}`
    );

}


// =====================================================
// FETCH RESUMES
// =====================================================

async function fetchResumes() {

    if (!email) {

        showToast(
            "❌ User not logged in.",
            "error"
        );

        return;

    }


    try {

        console.log(
            "================================"
        );

        console.log(
            "📧 Fetching resumes for:",
            email
        );


        const requestURL =
            `${RESUME_API}?email=${encodeURIComponent(email)}`;


        console.log(
            "🌐 Request URL:",
            requestURL
        );


        const res =
            await fetch(
                requestURL
            );


        console.log(
            "📡 Response status:",
            res.status
        );


        const json =
            await res.json();


        console.log(
            "📦 Resume API response:",
            json
        );


        // =================================================
        // CHECK API RESPONSE
        // =================================================

        if (!res.ok) {

            throw new Error(
                json.error ||
                json.message ||
                `Server responded with ${res.status}`
            );

        }


        // =================================================
        // EXTRACT FILES FROM DIFFERENT POSSIBLE FORMATS
        // =================================================

        let files = [];


        if (
            Array.isArray(json)
        ) {

            files =
                json;

        }

        else if (
            Array.isArray(json.files)
        ) {

            files =
                json.files;

        }

        else if (
            Array.isArray(json.resumes)
        ) {

            files =
                json.resumes;

        }

        else if (
            json.body
        ) {

            let body =
                json.body;


            // API Gateway sometimes returns body as string
            if (
                typeof body === "string"
            ) {

                try {

                    body =
                        JSON.parse(
                            body
                        );

                } catch (error) {

                    console.warn(
                        "⚠️ Could not parse body"
                    );

                }

            }


            if (
                Array.isArray(body)
            ) {

                files =
                    body;

            }

            else if (
                Array.isArray(body.files)
            ) {

                files =
                    body.files;

            }

            else if (
                Array.isArray(body.resumes)
            ) {

                files =
                    body.resumes;

            }

        }


        console.log(
            "📄 Extracted files:",
            files
        );


        // =================================================
        // EMPTY HISTORY
        // =================================================

        if (
            !Array.isArray(files) ||
            files.length === 0
        ) {

            resumeList.innerHTML =
                `
                <div class="bg-white rounded-xl shadow-md p-6 col-span-full text-center">
                    <p class="text-gray-500">
                        No resumes found.
                    </p>
                </div>
                `;


            return;

        }


        // =================================================
        // PROCESS EACH RESUME
        // =================================================

        const enriched =
            await Promise.all(

                files.map(async (f) => {

                    console.log("📄 Processing resume:", f);


                    // =================================================
                    // GET FILE NAME
                    // =================================================

                    const fileName =
                        f.fileName ||
                        f.filename ||
                        f.key ||
                        f.Key;


                    if (!fileName) {

                        console.warn(
                            "⚠️ Resume has no filename:",
                            f
                        );

                        return null;
                    }


                    // =================================================
                    // USE PRESIGNED URL FROM LAMBDA
                    // =================================================

                    const fileUrl =
                        f.resumeUrl;


                    const reportURL =
                        f.reportUrl;


                    console.log(
                        "🔐 Resume Presigned URL:",
                        fileUrl
                    );


                    console.log(
                        "🔐 Report Presigned URL:",
                        reportURL
                    );


                    // =================================================
                    // GET ATS SCORE
                    // =================================================

                    let score = "N/A";


                    if (reportURL) {

                        try {

                            const reportRes =
                                await fetch(reportURL);


                            console.log(
                                "📊 Report response status:",
                                reportRes.status
                            );


                            if (reportRes.ok) {

                                const reportData =
                                    await reportRes.json();


                                console.log(
                                    "📊 Report Data:",
                                    reportData
                                );


                                score =
                                    reportData.ats_score ||
                                    "N/A";

                            } else {

                                console.warn(
                                    `⚠️ Report not available for ${fileName}. Status: ${reportRes.status}`
                                );

                            }

                        } catch (err) {

                            console.warn(
                                `⚠️ Could not fetch report for ${fileName}`,
                                err
                            );

                        }

                    } else {

                        console.warn(
                            `⚠️ No report URL returned for ${fileName}`
                        );

                    }


                    // =================================================
                    // RETURN RESUME DATA
                    // =================================================

                    return {

                        filename: fileName,

                        // IMPORTANT:
                        // Use presigned URL returned by Lambda
                        fileUrl: fileUrl,

                        uploaded:
                            f.uploaded ||
                            f.lastModified ||
                            f.LastModified ||
                            "N/A",

                        score: score

                    };

                })
            );


        // =================================================
        // REMOVE INVALID RECORDS
        // =================================================

        const validResumes =
            enriched.filter(
                item =>
                    item !== null
            );


        console.log(
            "✅ Final resume list:",
            validResumes
        );


        // =================================================
        // RENDER
        // =================================================

        renderResumes(
            validResumes
        );


    } catch (error) {

        console.error(
            "❌ Fetch failed:",
            error
        );


        showToast(
            `❌ Failed to load resumes: ${error.message}`,
            "error"
        );

    }

}


// =====================================================
// RENDER RESUMES
// =====================================================

function renderResumes(data) {

    resumeList.innerHTML =
        "";


    if (
        !data ||
        data.length === 0
    ) {

        resumeList.innerHTML =
            `
            <div class="bg-white rounded-xl shadow-md p-6 col-span-full text-center">
                <p class="text-gray-500">
                    No resumes found.
                </p>
            </div>
            `;


        return;

    }


    data.forEach(
        (item) => {


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "bg-white rounded-xl shadow-md p-4 relative group";


            // Use encodeURIComponent for passing filename
            const encodedFileName =
                encodeURIComponent(
                    item.filename
                );


            card.innerHTML =
                `
                <div
                    class="cursor-pointer hover:opacity-80"
                    onclick="openPreview('${item.fileUrl}')"
                >

                    <embed
                        src="${item.fileUrl}"
                        type="application/pdf"
                        class="w-full h-48 object-contain rounded"
                    />

                </div>


                <div class="mt-3">

                    <p class="text-sm font-medium text-gray-700 break-words">
                        ${item.filename}
                    </p>

                    <p class="mt-1 text-sm text-gray-500">
                        Uploaded:
                        ${item.uploaded}
                    </p>

                    <p class="text-green-600 font-semibold mt-1">
                        ATS Score:
                        ${item.score}
                    </p>

                </div>


                <div class="flex justify-between items-center mt-3">


                    <div class="flex gap-2">


                        <button
                            onclick="viewResume('${encodedFileName}')"
                            class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                        >
                            View
                        </button>


                        <button
                            onclick="deleteResume(this, '${encodedFileName}')"
                            class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                        >
                            Delete
                        </button>


                    </div>


                    <button
                        onclick="downloadResume('${item.fileUrl}')"
                        title="Download"
                    >

                        <svg
                            class="w-6 h-6 text-gray-600 hover:text-black transition"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                        >

                            <path
                                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v6m0 0l-3-3m3 3l3-3M12 4v8"
                            />

                        </svg>

                    </button>


                </div>
                `;


            resumeList.appendChild(
                card
            );

        }
    );

}


// =====================================================
// VIEW RESUME ANALYSIS
// =====================================================

function viewResume(encodedFileName) {

    const fileName =
        decodeURIComponent(
            encodedFileName
        );


    window.location.href =
        `../resume-analysis/ra.html?file=${encodeURIComponent(fileName)}`;

}


// =====================================================
// DOWNLOAD RESUME
// =====================================================

function downloadResume(fileUrl) {

    if (!fileUrl) {

        showToast(
            "❌ Download URL not available.",
            "error"
        );

        return;

    }


    const link =
        document.createElement(
            "a"
        );


    link.href =
        fileUrl;


    link.target =
        "_blank";


    link.rel =
        "noopener";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );

}


// =====================================================
// OPEN PREVIEW
// =====================================================

function openPreview(fileUrl) {

    if (!fileUrl) {

        showToast(
            "❌ Resume URL not available.",
            "error"
        );

        return;

    }


    const previewFrame =
        document.getElementById(
            "previewFrame"
        );


    const previewModal =
        document.getElementById(
            "previewModal"
        );


    if (
        previewFrame
    ) {

        previewFrame.src =
            fileUrl;

    }


    if (
        previewModal
    ) {

        previewModal.classList.remove(
            "hidden"
        );


        previewModal.classList.add(
            "flex"
        );

    }

}


// =====================================================
// CLOSE PREVIEW
// =====================================================

function closePreview() {

    const previewFrame =
        document.getElementById(
            "previewFrame"
        );


    const previewModal =
        document.getElementById(
            "previewModal"
        );


    if (
        previewModal
    ) {

        previewModal.classList.add(
            "hidden"
        );


        previewModal.classList.remove(
            "flex"
        );

    }


    if (
        previewFrame
    ) {

        previewFrame.src =
            "";

    }

}


// =====================================================
// DELETE RESUME
// =====================================================

function deleteResume(
    button,
    encodedFileName
) {

    const filename =
        decodeURIComponent(
            encodedFileName
        );


    resumeToDelete = {

        element:
            button.closest(
                ".group"
            ),

        filename:
            filename

    };


    const modal =
        document.getElementById(
            "deleteModal"
        );


    if (
        modal
    ) {

        modal.classList.remove(
            "hidden"
        );


        modal.classList.add(
            "flex"
        );

    }

}


// =====================================================
// CONFIRM DELETE
// =====================================================

async function confirmDelete() {

    if (
        !resumeToDelete ||
        !email
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                RESUME_API,
                {

                    method:
                        "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            {

                                filename:
                                    resumeToDelete.filename,

                                email:
                                    email

                            }
                        )

                }
            );


        const data =
            await response.json();


        console.log(
            "🗑️ Delete response:",
            data
        );


        if (
            !response.ok ||
            data.error
        ) {

            throw new Error(
                data.error ||
                data.message ||
                "Failed to delete resume"
            );

        }


        showToast(
            "✅ Resume deleted successfully.",
            "success"
        );


        if (
            resumeToDelete.element
        ) {

            resumeToDelete.element.remove();

        }


        closeDeleteModal();


        // Reload to ensure history is correct
        await fetchResumes();


    } catch (error) {

        console.error(
            "❌ Delete failed:",
            error
        );


        showToast(
            "❌ Failed to delete resume.",
            "error"
        );


        closeDeleteModal();

    }

}


// =====================================================
// CLOSE DELETE MODAL
// =====================================================

function closeDeleteModal() {

    const modal =
        document.getElementById(
            "deleteModal"
        );


    if (
        modal
    ) {

        modal.classList.add(
            "hidden"
        );


        modal.classList.remove(
            "flex"
        );

    }


    resumeToDelete =
        null;

}