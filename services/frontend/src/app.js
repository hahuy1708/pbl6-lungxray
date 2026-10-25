const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#xray-file");
const fileName = document.querySelector("#file-name");
const preview = document.querySelector("#preview");
const submitButton = document.querySelector("#submit-button");
const status = document.querySelector("#status");
const resultSection = document.querySelector("#result-section");
const result = document.querySelector("#result");
const classificationResult = document.querySelector("#classification-result");
const resultImages = document.querySelector("#result-images");
const cropOutput = document.querySelector("#crop-output");
const cropMaskedOutput = document.querySelector("#crop-masked-output");
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
    status.textContent = "Đang phân đoạn phổi…";
    resultSection.hidden = true;
    classificationResult.textContent = "Đang chờ kết quả phân loại…";

    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/segment/crops", { method: "POST", body: formData });
        const data = await response.json();

        if (!response.ok) {
            resultImages.hidden = true;
            result.textContent = JSON.stringify(data, null, 2);
            classificationResult.textContent = "Không chạy được vì segmentation không thành công.";
            resultSection.hidden = false;
            status.textContent = `API trả về lỗi HTTP ${response.status}.`;
            status.classList.add("error");
        } else {
            cropOutput.src = `data:image/png;base64,${data.crop_png_base64}`;
            cropMaskedOutput.src = `data:image/png;base64,${data.crop_masked_png_base64}`;
            result.textContent = JSON.stringify({
                confidence: data.confidence,
                lung_area_ratio: data.lung_area_ratio,
                bbox: data.bbox,
                crop_shape: data.crop_shape,
                crop_masked_shape: data.crop_masked_shape,
            }, null, 2);
            resultImages.hidden = false;
            resultSection.hidden = false;

            status.textContent = "Đã phân đoạn phổi; đang phân loại ảnh crop…";
            const cropBytes = Uint8Array.from(atob(data.crop_png_base64), (char) => char.charCodeAt(0));
            const cropBlob = new Blob([cropBytes], { type: "image/png" });
            const classifierForm = new FormData();
            classifierForm.append("file", cropBlob, "lung-crop.png");
            const classifierResponse = await fetch("/api/classify/predict", {
                method: "POST",
                body: classifierForm,
            });
            const classifierData = await classifierResponse.json();

            if (!classifierResponse.ok) {
                classificationResult.textContent = JSON.stringify(classifierData, null, 2);
                status.textContent = `Segmentation thành công nhưng Classification API trả lỗi HTTP ${classifierResponse.status}.`;
                status.classList.add("error");
            } else {
                classificationResult.textContent = JSON.stringify(classifierData, null, 2);
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
