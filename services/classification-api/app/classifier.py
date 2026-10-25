from pathlib import Path

import cv2
import numpy as np
import torch
from torch import nn
from torchvision.models import resnet18


GROUPS = (
    {
        "id": "g1",
        "name": "Mass / Nodule",
        "conditions": ["Mass", "Nodule"],
        "threshold": 0.0885,
    },
    {
        "id": "g2",
        "name": "Pleural / Air-space findings",
        "conditions": [
            "Atelectasis",
            "Effusion",
            "Pleural_Thickening",
            "Pneumothorax",
        ],
        "threshold": 0.1292,
    },
    {
        "id": "g3",
        "name": "Other findings",
        "conditions": [
            "Consolidation",
            "Infiltration",
            "Pneumonia",
            "Edema",
            "Emphysema",
            "Fibrosis",
            "Cardiomegaly",
            "Hernia",
        ],
        "threshold": 0.1798,
    },
)

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


class LungFindingClassifier:
    """Three-output ResNet18 trained on U-Net lung crops."""

    def __init__(self, weights_path: str | Path, device: str | None = None):
        self.device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model = resnet18(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, len(GROUPS))
        state_dict = torch.load(
            weights_path, map_location=self.device, weights_only=True
        )
        self.model.load_state_dict(state_dict)
        self.model.to(self.device).eval()

    @staticmethod
    def prepare_input(image_bytes: bytes) -> torch.Tensor:
        """Match notebook evaluation preprocessing for a pre-segmented crop."""
        if not image_bytes:
            raise ValueError("Tệp ảnh rỗng")
        try:
            image = cv2.imdecode(
                np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_GRAYSCALE
            )
        except cv2.error as exc:
            raise ValueError("File không phải ảnh PNG/JPEG hợp lệ") from exc
        if image is None:
            raise ValueError("File không phải ảnh PNG/JPEG hợp lệ")

        image = cv2.resize(image, (224, 224), interpolation=cv2.INTER_AREA)
        tensor = torch.from_numpy(image).to(torch.float32).div_(255.0)
        tensor = tensor.unsqueeze(0).repeat(3, 1, 1)
        mean = tensor.new_tensor(IMAGENET_MEAN).view(3, 1, 1)
        std = tensor.new_tensor(IMAGENET_STD).view(3, 1, 1)
        return ((tensor - mean) / std).unsqueeze(0)

    @torch.inference_mode()
    def predict(self, image_bytes: bytes) -> dict:
        tensor = self.prepare_input(image_bytes).to(self.device)
        probabilities = torch.sigmoid(self.model(tensor))[0].cpu().tolist()

        predictions = []
        for group, probability in zip(GROUPS, probabilities):
            threshold = group["threshold"]
            predictions.append(
                {
                    "id": group["id"],
                    "name": group["name"],
                    "conditions": group["conditions"],
                    "probability": round(probability, 4),
                    "threshold": threshold,
                    "flagged": probability >= threshold,
                }
            )

        return {
            "model": "resnet18_crop",
            "task": "three_group_multi_label",
            "predictions": predictions,
        }
