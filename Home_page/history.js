const resumeList = document.getElementById("resumeList");
const email = localStorage.getItem("userEmail");
let resumeToDelete = null;

window.onload = fetchResumes;
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

async function fetchResumes() {
    if (!email) {
        showToast("❌ User not logged in.");
        return;
    }

    try {
        const res = await fetch(`https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/getresume/getResume?email=${email}`);
        const json = await res.json();

        // ✅ Check if files are in expected format
        const files = Array.isArray(json.files) ? json.files : json;

        if (!Array.isArray(files)) throw new Error("Invalid resume format");

        const enriched = await Promise.all(
            files.map(async f => {
                const reportKey = `resumes-reports/${encodeURIComponent(f.filename)}.json`;
                const reportURL = `https://resumatch-resumes.s3.ap-south-1.amazonaws.com/${reportKey}`;
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
                    fileUrl: `https://resumatch-resumes.s3.ap-south-1.amazonaws.com/${f.filename}`,
                    uploaded: new Date(f.uploaded).toISOString().split("T")[0],
                    score
                };
            })
        );

        renderResumes(enriched);

    } catch (err) {
        console.error("Fetch failed", err);
        showToast("❌ Failed to load resumes.");
    }
}

function renderResumes(data) {
    resumeList.innerHTML = '';

    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-xl shadow-md p-4 relative group";
        card.innerHTML = `
            <div onclick="openPreview('${item.fileUrl}')" class="cursor-pointer hover:opacity-80">
                <embed src="${item.fileUrl}" class="w-full h-48 object-contain rounded" />
            </div>
            <div class="mt-2 text-sm text-gray-600">Uploaded: ${item.uploaded}</div>
            <div class="text-green-600 font-semibold mb-2">ATS Score: ${item.score}</div>
            <div class="flex justify-between items-center mt-2">
                <div class="flex gap-2">
                    <button onclick="viewResume('${item.filename}')"
                        class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm">View</button>
                    <button onclick="deleteResume(this, '${item.filename}')"
                        class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">Delete</button>
                </div>
                <button onclick="downloadResume('${item.fileUrl}')" title="Download">
                    <svg class="w-6 h-6 text-gray-600 hover:text-black transition" fill="none" stroke="currentColor"
                        stroke-width="2" viewBox="0 0 24 24">
                        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v6m0 0l-3-3m3 3l3-3M12 4v8" />
                    </svg>
                </button>
            </div>
        `;
        resumeList.appendChild(card);
    });
}

function viewResume(fileName) {
    window.location.href = `resume-analysis/ra.html?file=${encodeURIComponent(fileName)}`;
}

function downloadResume(fileUrl) {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileUrl.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openPreview(fileUrl) {
    document.getElementById("previewFrame").src = fileUrl;
    document.getElementById("previewModal").classList.remove("hidden");
    document.getElementById("previewModal").classList.add("flex");
}

function closePreview() {
    document.getElementById("previewModal").classList.add("hidden");
    document.getElementById("previewModal").classList.remove("flex");
    document.getElementById("previewFrame").src = "";
}

function deleteResume(button, filename) {
    resumeToDelete = { element: button.closest(".group"), filename };
    const modal = document.getElementById("deleteModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function confirmDelete() {
    if (!resumeToDelete || !email) return;

    fetch("https://97sowpn5e3.execute-api.ap-south-1.amazonaws.com/getresume/getResume", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: resumeToDelete.filename, email })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            showToast("✅ Resume deleted successfully.", "success");
            resumeToDelete.element.remove();
            closeDeleteModal();
        })
        .catch(err => {
            console.error(err);
            showToast("❌ Failed to delete resume.");
            closeDeleteModal();
        });
}

function closeDeleteModal() {
    document.getElementById("deleteModal").classList.add("hidden");
    document.getElementById("deleteModal").classList.remove("flex");
    resumeToDelete = null;
}