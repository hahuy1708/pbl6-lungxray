const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#xray-file");
const fileName = document.querySelector("#file-name");
const preview = document.querySelector("#preview");
const submitButton = document.querySelector("#submit-button");
const status = document.querySelector("#status");
const resultSection = document.querySelector("#result-section");
const result = document.querySelector("#result");
const classificationResult = document.querySelector("#classification-result");
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
    status.textContent = "Đang phân đoạn và phân loại ảnh…";
    resultSection.hidden = true;
    classificationResult.textContent = "Đang chờ kết quả phân loại…";

    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/segment/crops", { method: "POST", body: formData });
        const data = await response.json();

        if (!response.ok) {
            result.textContent = JSON.stringify(data, null, 2);
            classificationResult.textContent = "Không chạy được vì segmentation không thành công.";
            resultSection.hidden = false;
            status.textContent = `API trả về lỗi HTTP ${response.status}.`;
            status.classList.add("error");
        } else {
            result.textContent = JSON.stringify({
                confidence: data.confidence,
                lung_area_ratio: data.lung_area_ratio,
                bbox: data.bbox,
                crop_shape: data.crop_shape,
                timing_seconds: data.timing_seconds,
            }, null, 2);
            resultSection.hidden = false;

            if (data.classification?.error) {
                classificationResult.textContent = JSON.stringify(data.classification, null, 2);
                status.textContent = `Segmentation hoàn tất nhưng classification thất bại: ${data.classification.error}`;
                status.classList.add("error");
            } else {
                classificationResult.textContent = JSON.stringify(data.classification, null, 2);
                status.textContent = "Segmentation và classification hoàn tất.";
            }
        }
    } catch (error) {
        status.textContent = `Không kết nối được tới API: ${error.message}`;
        status.classList.add("error");
    } finally {
        submitButton.disabled = false;
    }
});
