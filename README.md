# Lung Disease Classification

Chest X-rays scans are among the most accessible ways to diagnose lung diseases. This project aims to develop a web application that can segment lung regions from X-ray images and classify them as normal or abnormal.

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
  - **Frontend:** ReactJS
  - **Backend Services:** FastAPI, Python
  - **Database:** MySQL
  - **Containers:** Docker, Docker Compose
- **Infrastructure:** 
    - CI/CD with GitHub Actions and a self-hosted runner
    - Self-hosted a Ubuntu Server 26.04 LTS VM
    - Cloudflare Tunnel (`cloudflared`) for public access and TLS termination
    - Nginx reverse proxy for request routing
    
## Dataset
Two public datasets are used, and each has what the other lacks:
 
| Dataset | Provides | Lacks | Used for |
|---|---|---|---|
| [Chest X-ray Masks and Labels](https://www.kaggle.com/datasets/stevezeyuzhang/chest-xray-masks-and-labels) (Montgomery + Shenzhen) | Lung masks drawn by radiologists | Labels relevant to this task (the original tuberculosis labels are not used) | Training lung segmentation |
| [NIH ChestX-ray14](https://www.kaggle.com/datasets/nih-chest-xrays/data) | Disease labels for 112,120 chest X-rays | Lung masks | Training the normal/abnormal classifier |
 
### Pipeline
 
1. **Train segmentation.** A U-Net is trained on 704 image–mask pairs (Montgomery 138, Shenzhen 566) to predict a lung mask.
2. **Apply segmentation to NIH.** The trained U-Net (frozen, used only as preprocessing) runs over a patient-level subset of NIH. Each image is cropped to its lung region and keeps its NIH label: `No Finding` is normal, any finding is abnormal. Images where segmentation fails a validity check (no lungs found, implausible lung area) are excluded. Train, validation and test sets are split by patient, and the test set follows the official NIH test list.
3. **Train classification.** The classifier is trained on the cropped images.
4. **Inference.** The deployed system repeats the same chain: uploaded image → segmentation → lung crop → classifier → normal / abnormal. The crop step must be identical in training and serving.
```text
Masks dataset ──► U-Net (lung segmentation)
                        │  frozen, used as preprocessing
NIH X-rays ─────────────┴──► lung crops + normal/abnormal labels ──► classifier
 
Serving:  upload ──► segmentation ──► lung crop ──► classifier ──► normal / abnormal
```
 
NIH labels are mined automatically from radiology reports, so they contain noise and `No Finding` does not guarantee a healthy patient.


## ⚠️ Medical Disclaimer

This project is for educational and reference purposes only. The results do not replace professional diagnosis or medical advice. Please consult a healthcare provider for an accurate assessment.
