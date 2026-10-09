"""Segmentation phổi từ ảnh X-quang bằng U-Net (PBL6).

Dùng:
    seg = SegmentationModel("unet_best.pth")      # load 1 lần khi khởi động server
    res = seg.predict(image_bytes_or_path_or_array)
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn

IMG_SIZE = 256
# Ngưỡng ban đầu để phát hiện ảnh không phải X-quang ngực.
# Sẽ hiệu chỉnh lại ở bước kiểm thử (Bước 7).
MIN_AREA_RATIO, MAX_AREA_RATIO = 0.10, 0.60


# ---------- Mô hình (giữ NGUYÊN tên lớp để nạp được trọng số) ----------
class DoubleConv(nn.Module):
    def __init__(self, cin, cout):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(cin, cout, 3, padding=1, bias=False), nn.BatchNorm2d(cout), nn.ReLU(inplace=True),
            nn.Conv2d(cout, cout, 3, padding=1, bias=False), nn.BatchNorm2d(cout), nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.net(x)


class UNet(nn.Module):
    def __init__(self, in_ch=1, out_ch=1, base=32):
        super().__init__()
        b = base
        self.pool = nn.MaxPool2d(2)
        self.enc1, self.enc2 = DoubleConv(in_ch, b), DoubleConv(b, b * 2)
        self.enc3, self.enc4 = DoubleConv(b * 2, b * 4), DoubleConv(b * 4, b * 8)
        self.bott = DoubleConv(b * 8, b * 16)
        self.up4, self.dec4 = nn.ConvTranspose2d(b * 16, b * 8, 2, stride=2), DoubleConv(b * 16, b * 8)
        self.up3, self.dec3 = nn.ConvTranspose2d(b * 8, b * 4, 2, stride=2), DoubleConv(b * 8, b * 4)
        self.up2, self.dec2 = nn.ConvTranspose2d(b * 4, b * 2, 2, stride=2), DoubleConv(b * 4, b * 2)
        self.up1, self.dec1 = nn.ConvTranspose2d(b * 2, b, 2, stride=2), DoubleConv(b * 2, b)
        self.out = nn.Conv2d(b, out_ch, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))
        bt = self.bott(self.pool(e4))
        d4 = self.dec4(torch.cat([self.up4(bt), e4], 1))
        d3 = self.dec3(torch.cat([self.up3(d4), e3], 1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], 1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], 1))
        return self.out(d1)


# ---------- Đọc ảnh ----------
def to_gray_uint8(src) -> np.ndarray:
    """Nhận đường dẫn, bytes (file upload), ảnh PIL hoặc numpy; trả về ảnh xám uint8 (H, W)."""
    if isinstance(src, (str, Path)):
        img = cv2.imread(str(src), cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError(f"Không đọc được ảnh: {src}")
        return img
    if isinstance(src, (bytes, bytearray)):
        img = cv2.imdecode(np.frombuffer(src, np.uint8), cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Không giải mã được ảnh (file hỏng hoặc không phải ảnh)")
        return img
    if hasattr(src, "convert"):                       # ảnh PIL
        return np.array(src.convert("L"))
    arr = np.asarray(src)
    if arr.dtype != np.uint8:                         # ví dụ ảnh 16-bit: co về 0-255
        lo, hi = float(arr.min()), float(arr.max())
        arr = ((arr - lo) / max(hi - lo, 1e-6) * 255).astype(np.uint8)
    if arr.ndim == 3:                                 # giả định kênh theo thứ tự RGB(A)
        code = cv2.COLOR_RGBA2GRAY if arr.shape[2] == 4 else cv2.COLOR_RGB2GRAY
        arr = cv2.cvtColor(arr, code)
    if arr.ndim != 2:
        raise ValueError("Ảnh đầu vào phải là ảnh 2D (xám hoặc màu)")
    return arr


# ---------- Hậu xử lý ----------
def _clean_mask(mask: np.ndarray, max_regions=2, min_area_ratio=0.005) -> Tuple[np.ndarray, int]:
    """Giữ tối đa 2 vùng lớn nhất (hai lá phổi) và lấp lỗ bên trong."""
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    H, W = mask.shape
    comps = sorted(
        [(stats[k, cv2.CC_STAT_AREA], k) for k in range(1, n)
         if stats[k, cv2.CC_STAT_AREA] >= min_area_ratio * H * W],
        reverse=True,
    )[:max_regions]
    out = np.zeros_like(mask)
    for _, k in comps:
        cnts, _ = cv2.findContours((labels == k).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(out, cnts, -1, 1, thickness=cv2.FILLED)
    return out, len(comps)


@dataclass
class SegResult:
    mask: np.ndarray            # uint8 0/1, cùng kích thước ảnh gốc
    crop: np.ndarray            # ảnh gốc cắt theo bounding box phổi (có đệm lề)
    crop_masked: np.ndarray     # như crop nhưng xoá vùng ngoài phổi (mask đã nới rộng)
    bbox: Tuple[int, int, int, int]   # (x0, y0, x1, y1) trên ảnh gốc
    confidence: float           # xác suất trung bình bên trong mask
    lung_area_ratio: float      # diện tích phổi / diện tích ảnh
    is_valid: bool
    warning: Optional[str]


class SegmentationModel:
    def __init__(self, weights_path, device: Optional[str] = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model = UNet(base=32).to(self.device)
        state = torch.load(weights_path, map_location=self.device, weights_only=True)
        self.model.load_state_dict(state)
        self.model.eval()

    @torch.no_grad()
    def predict(self, src, margin: float = 0.08) -> SegResult:
        gray = to_gray_uint8(src)
        H, W = gray.shape

        # Tiền xử lý: GIỐNG HỆT lúc train
        small = cv2.resize(gray, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA)
        x = torch.from_numpy(small.astype(np.float32) / 255.0)[None, None].to(self.device)
        prob_small = torch.sigmoid(self.model(x))[0, 0].cpu().numpy()

        # Phóng xác suất về kích thước gốc rồi mới ngưỡng
        prob = cv2.resize(prob_small, (W, H), interpolation=cv2.INTER_LINEAR)
        mask, n_regions = _clean_mask((prob > 0.5).astype(np.uint8))

        if n_regions == 0:
            return SegResult(mask, gray, gray, (0, 0, W, H), 0.0, 0.0, False,
                             "Không phát hiện vùng phổi trong ảnh")

        ys, xs = np.where(mask > 0)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        px, py = int(margin * (x1 - x0)), int(margin * (y1 - y0))
        x0, y0 = max(0, x0 - px), max(0, y0 - py)
        x1, y1 = min(W, x1 + px), min(H, y1 + py)

        k = max(3, int(0.03 * min(H, W)) // 2 * 2 + 1)            # kernel lẻ, ~3% cạnh ảnh
        dilated = cv2.dilate(mask, np.ones((k, k), np.uint8))
        masked = gray * dilated

        ratio = float(mask.mean())
        warning = None
        if not (MIN_AREA_RATIO <= ratio <= MAX_AREA_RATIO):
            warning = f"Diện tích vùng phổi bất thường ({ratio:.0%}), ảnh có thể không phải X-quang ngực"

        return SegResult(
            mask=mask,
            crop=gray[y0:y1, x0:x1],
            crop_masked=masked[y0:y1, x0:x1],
            bbox=(x0, y0, x1, y1),
            confidence=float(prob[mask > 0].mean()),
            lung_area_ratio=ratio,
            is_valid=warning is None,
            warning=warning,
        )