const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#xray-file");
const fileName = document.querySelector("#file-name");
const preview = document.querySelector("#preview");
const submitButton = document.querySelector("#submit-button");
const status = document.querySelector("#status");
const resultSection = document.querySelector("#result-section");
const result = document.querySelector("#result");
let previewUrl;

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileName.textContent = file ? file.name : "Chọn ảnh PNG hoặc JPEG (tối đa 20 MB)";

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    preview.hidden = !file;
    if (file) {
        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
        status.textContent = "Vui lòng chọn ảnh PNG hoặc JPEG.";
        status.classList.add("error");
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        status.textContent = "Ảnh vượt quá giới hạn 20 MB.";
        status.classList.add("error");
        return;
    }

    submitButton.disabled = true;
    status.classList.remove("error");
    status.textContent = "Đang gửi ảnh và chờ server phân tích…";
    resultSection.hidden = true;

    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/segment/", { method: "POST", body: formData });
        const data = await response.json();

        result.textContent = JSON.stringify(data, null, 2);
        resultSection.hidden = false;
        if (!response.ok) {
            status.textContent = `API trả về lỗi HTTP ${response.status}.`;
            status.classList.add("error");
        } else {
            status.textContent = "Server đã phân tích ảnh thành công.";
        }
    } catch (error) {
        status.textContent = `Không kết nối được tới API: ${error.message}`;
        status.classList.add("error");
    } finally {
        submitButton.disabled = false;
    }
});
