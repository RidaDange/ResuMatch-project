function editResume() {
    window.location.href = "/ResuMatch/Home_page/index.html";
}

function deleteResume(button) {
    if (confirm("Are you sure you want to delete this resume?")) {
        const card = button.closest('.group');
        card.remxove(); // Mock delete
        // Call API here to delete from backend
    }
}

function downloadResume(fileName) {
    const link = document.createElement('a');
    link.href = fileName; // Should be the actual file URL
    link.download = fileName;
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

let resumeToDelete = null;

function deleteResume(button) {
    resumeToDelete = button.closest('.group');
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function confirmDelete() {
    if (resumeToDelete) {
        resumeToDelete.remove(); // Removes the resume card from DOM
        // Optional: Add AJAX call to delete from server/database
    }
    closeDeleteModal();
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    resumeToDelete = null;
}
