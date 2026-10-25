# Lung Disease Classification

Chest X-ray scans are among the most accessible sources for studying lung disease. This project is developing a web application that segments lung regions and predicts three grouped finding labels from the NIH ChestX-ray14 dataset.

## Directory Structure

```text
.
├── .github/workflows/       # CI/CD workflows
├── nginx/                   # Reverse proxy configuration
├── services/
│   ├── backend/             # Backend API and database integration
│   ├── classification-api/  # Image classification API
│   ├── frontend/            # Web interface
│   └── segmentation-api/    # U-Net lung segmentation API
├── docker-compose.yml       # Local and server service orchestration
└── README.md
```

## Technologies Used

- **Application & Services:**
  - **Frontend:** HTML, CSS, JavaScript
  - **Backend Services:** FastAPI, Python
  - **Database:** MySQL
  - **Containers:** Docker, Docker Compose
- **Infrastructure:** 
    - CI/CD with GitHub Actions and a self-hosted runner
    - Self-hosted a Ubuntu Server 26.04 LTS VM
    - Cloudflare Tunnel (`cloudflared`) for public access
    - Nginx reverse proxy for request routing
    
## Dataset
Two public datasets are used, and each has what the other lacks:
 
| Dataset | Provides | Lacks | Used for |
|---|---|---|---|
| [Chest X-ray Masks and Labels](https://www.kaggle.com/datasets/stevezeyuzhang/chest-xray-masks-and-labels) (Montgomery + Shenzhen) | Lung masks drawn by radiologists | Labels relevant to this task (the original tuberculosis labels are not used) | Training lung segmentation |
| [NIH ChestX-ray14](https://www.kaggle.com/datasets/nih-chest-xrays/data) | Disease labels for 112,120 chest X-rays | Lung masks | Training the three-group multi-label classifier |
 
### Pipeline
 
1. **Train segmentation.** A U-Net is trained on 704 image–mask pairs (Montgomery 138, Shenzhen 566) to predict a lung mask.
2. **Prepare NIH crops and labels.** The trained U-Net (frozen, used only as preprocessing) runs over a patient-level subset of NIH. Valid images are cropped to the lung region. NIH findings are mapped into three independent groups: Mass/Nodule; selected pleural and air-space findings; and other findings. Invalid segmentation results are excluded. Splits are patient-level, with the official NIH test list used for testing.
3. **Train classification.** ResNet18 is fine-tuned on the lung crops. The selected checkpoint is `resnet18_crop_best.pth`; the full-image checkpoint is a comparison model and is not used for deployment.
4. **Inference.** The web application sends an uploaded image to segmentation, then sends the resulting lung crop to the classifier. The classifier returns three probabilities and validation-selected thresholds. The same crop and normalization steps are used for training and inference.
```text
Masks dataset ──► U-Net (lung segmentation)
                        │  frozen, used as preprocessing
NIH X-rays ─────────────┴──► lung crops + 3 grouped labels ──► ResNet18
 
Serving:  upload ──► segmentation ──► lung crop ──► ResNet18 ──► 3 group probabilities
```
 
NIH labels are mined automatically from radiology reports and may be noisy. The three outputs are independent labels, not a normal/abnormal diagnosis. The notebook selects thresholds to target at least 90% sensitivity on validation; the reported test specificities are low (about 10.5%–32.5%), so these predictions should be interpreted cautiously.


## ⚠️ Medical Disclaimer

This project is for educational and reference purposes only. The results do not replace professional diagnosis or medical advice. Please consult a healthcare provider for an accurate assessment.
