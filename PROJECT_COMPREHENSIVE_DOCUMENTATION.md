# Dental Attendance System - Comprehensive Technical Documentation

**Generated on:** September 2, 2025  
**Project:** Facial Recognition Attendance System  
**Repository:** bitnaman/Facial_Attendance_System  

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Operating System & Hardware](#operating-system--hardware)
3. [Python Environment](#python-environment)
4. [Backend Dependencies](#backend-dependencies)
5. [Frontend Dependencies](#frontend-dependencies)
6. [Machine Learning & AI Stack](#machine-learning--ai-stack)
7. [Database Stack](#database-stack)
8. [Cloud & Storage](#cloud--storage)
9. [Development Tools](#development-tools)
10. [CUDA & GPU Configuration](#cuda--gpu-configuration)
11. [Virtual Environment Status](#virtual-environment-status)
12. [Package Versions Summary](#package-versions-summary)

---

## 🖥️ System Overview

### Operating System
- **Distribution:** Ubuntu 22.04.5 LTS (Jammy Jellyfish)
- **Kernel:** Linux 6.8.0-79-generic #79~22.04.1-Ubuntu SMP PREEMPT_DYNAMIC
- **Architecture:** x86_64
- **Hostname:** buggy-nitro

### Hardware Specifications
- **GPU:** NVIDIA GeForce GTX 1650 (4GB VRAM)
- **GPU Memory Usage:** 445MiB / 4096MiB (10.9% utilized)
- **GPU Compute Capability:** 7.5
- **PCI Bus ID:** 0000:01:00.0

---

## 🐍 Python Environment

### Python Installation
- **Version:** 3.10.12 (final release)
- **Executable Path:** `/usr/bin/python3`
- **Installation Type:** System Python (NOT in virtual environment) and not needed in Virtual Environment, install everythnig without it.
- **Virtual Environment:** ❌ **NOT ACTIVATED**
- **Environment Variable ($VIRTUAL_ENV):** Empty/Not Set

### Python Environment Details
- **Environment Type:** Unknown/System-wide installation
- **Command Prefix:** `/bin/python3`
- **Package Manager:** pip 25.2

---

## 🔧 Backend Dependencies

### Core Framework Stack
| Package | Version | Purpose |
|---------|---------|---------|
| **FastAPI** | 0.116.1 | Modern web framework for building APIs |
| **Uvicorn** | 0.35.0 | ASGI web server implementation |
| **Starlette** | 0.47.2 | Lightweight ASGI framework |
| **Pydantic** | 2.11.7 | Data validation using Python type annotations |
| **Pydantic Core** | 2.33.2 | Core validation logic for Pydantic |

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| **python-jose** | 3.5.0 | JSON Web Token implementation |
| **passlib** | 1.7.4 | Password hashing library |
| **bcrypt** | 3.2.0 | Password hashing algorithm |
| **cryptography** | 3.4.8 | Cryptographic recipes and primitives |

### File Handling & Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| **aiofiles** | 24.1.0 | Asynchronous file operations |
| **python-multipart** | 0.0.20 | Multipart form data parser |
| **python-dotenv** | 1.1.1 | Environment variable management |
| **Jinja2** | 3.1.6 | Template engine |

---

## 🎨 Frontend Dependencies

### Core React Stack
| Package | Version | Purpose |
|---------|---------|---------|
| **React** | 18.3.1 | JavaScript library for building user interfaces |
| **React DOM** | 18.3.1 | React package for working with the DOM |
| **React Scripts** | 5.0.1 | Configuration and scripts for Create React App |

### Development Environment
| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 12.22.9 | JavaScript runtime environment |
| **npm** | 8.5.1 | Node package manager |

### Browser Compatibility
- **Production:** >0.2%, not dead, not op_mini all
- **Development:** Latest Chrome, Firefox, and Safari versions

---

## 🤖 Machine Learning & AI Stack

### Deep Learning Frameworks
| Framework | Version | CUDA Support | Purpose |
|-----------|---------|--------------|---------|
| **TensorFlow** | 2.19.1 | ✅ Yes | Primary deep learning framework |
| **tf_keras** | 2.19.0 | ✅ Yes | High-level neural networks API |
| **PyTorch** | 2.8.0+cu128 | ✅ Yes (CUDA 12.8) | Alternative deep learning framework |
| **torchvision** | 0.23.0 | ✅ Yes | Computer vision for PyTorch |
| **torchaudio** | 2.8.0 | ✅ Yes | Audio processing for PyTorch |

### Computer Vision & Image Processing
| Package | Version | Purpose |
|---------|---------|---------|
| **OpenCV** | 4.12.0 | Computer vision and image processing |
| **opencv-python-headless** | 4.12.0.88 | OpenCV without GUI dependencies |
| **DeepFace** | 0.0.95 | Face recognition and analysis |
| **mtcnn** | 1.0.0 | Multi-task CNN for face detection |
| **retina-face** | 0.0.17 | Face detection model |
| **Pillow** | 11.3.0 | Python Imaging Library |
| **imageio** | 2.37.0 | Image I/O operations |
| **scikit-image** | 0.25.2 | Image processing algorithms |

### Machine Learning Libraries
| Package | Version | Purpose |
|---------|---------|---------|
| **scikit-learn** | 1.7.1 | Machine learning algorithms |
| **NumPy** | 2.1.3 | Numerical computing |
| **SciPy** | 1.15.3 | Scientific computing |
| **joblib** | 1.5.1 | Lightweight pipelining |

### Data Processing & Analysis
| Package | Version | Purpose |
|---------|---------|---------|
| **pandas** | 2.3.1 | Data manipulation and analysis |
| **openpyxl** | 3.1.5 | Excel file operations |
| **beautifulsoup4** | 4.13.4 | HTML/XML parsing |

---

## 🗄️ Database Stack

### Database Components
| Component | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL Client** | 14.18 | Database client |
| **SQLAlchemy** | 2.0.43 | Python SQL toolkit and ORM |
| **psycopg2-binary** | 2.9.10 | PostgreSQL adapter for Python |

### Database Migration
| Tool | Purpose |
|------|---------|
| **Alembic** | Database migration tool for SQLAlchemy |

---

## ☁️ Cloud & Storage

### AWS Integration
| Package | Version | Purpose |
|---------|---------|---------|
| **boto3** | 1.40.20 | Amazon Web Services (AWS) SDK |
| **botocore** | 1.40.20 | Low-level interface to AWS services |
| **s3transfer** | 0.13.1 | Amazon S3 transfer manager |

---

## 🛠️ Development Tools

### Web Server & ASGI
| Package | Version | Purpose |
|---------|---------|---------|
| **Gunicorn** | 23.0.0 | WSGI HTTP Server |
| **uvloop** | 0.21.0 | Ultra fast asyncio event loop |
| **watchfiles** | 1.1.0 | File watching for development |
| **websockets** | 15.0.1 | WebSocket implementation |

### Utility Libraries
| Package | Version | Purpose |
|---------|---------|---------|
| **click** | 8.2.1 | Command line interface creation |
| **rich** | 14.1.0 | Rich text and beautiful formatting |
| **tqdm** | 4.67.1 | Progress bars |
| **requests** | 2.32.4 | HTTP library |

---

## 🎮 CUDA & GPU Configuration

### NVIDIA Driver & CUDA
| Component | Version | Status |
|-----------|---------|---------|
| **NVIDIA Driver** | 575.64.03 | ✅ Active |
| **CUDA Runtime** | 12.9 | ✅ Available |
| **CUDA Compiler (nvcc)** | 11.5.119 | ✅ Installed |
| **cuDNN** | 9.10.2.21 | ✅ Available |

### GPU Utilization
- **Current GPU Usage:** 7%
- **Memory Usage:** 445MiB / 4096MiB (10.9%)
- **Temperature:** 51°C
- **Power Usage:** 11W / 50W

### CUDA Libraries (Python)
| Package | Version | Purpose |
|---------|---------|---------|
| **nvidia-cublas-cu12** | 12.8.4.1 | CUDA Basic Linear Algebra Subroutines |
| **nvidia-cuda-cupti-cu12** | 12.8.90 | CUDA Profiling Tools Interface |
| **nvidia-cuda-nvcc-cu12** | 12.9.86 | CUDA Compiler |
| **nvidia-cuda-nvrtc-cu12** | 12.8.93 | CUDA Runtime Compilation |
| **nvidia-cuda-runtime-cu12** | 12.8.90 | CUDA Runtime |
| **nvidia-cudnn-cu12** | 9.10.2.21 | CUDA Deep Neural Network library |
| **nvidia-cufft-cu12** | 11.3.3.83 | CUDA Fast Fourier Transform |
| **nvidia-curand-cu12** | 10.3.9.90 | CUDA Random Number Generation |
| **nvidia-cusolver-cu12** | 11.7.3.90 | CUDA Linear Algebra |
| **nvidia-cusparse-cu12** | 12.5.8.93 | CUDA Sparse Matrix |

### TensorFlow GPU Configuration
- **CUDA Available:** ✅ True
- **GPU Available:** ✅ True
- **GPU Devices:** 1 device detected
- **Device Name:** /physical_device:GPU:0 (NVIDIA GeForce GTX 1650)
- **Memory Allocation:** 2156 MB available

### PyTorch GPU Configuration
- **CUDA Available:** ✅ True
- **CUDA Version:** 12.8
- **GPU Count:** 1
- **GPU Name:** NVIDIA GeForce GTX 1650

---

## 🔄 Virtual Environment Status

### Current Environment Analysis
- **Status:** ❌ **NOT USING VIRTUAL ENVIRONMENT**
- **Python Path:** `/usr/bin/python3` (System Python)
- **Environment Variable:** `$VIRTUAL_ENV` is empty
- **Package Installation:** Global system-wide installation
- **Conda:** ❌ Not installed or not in PATH

### Recommendations
⚠️ **WARNING:** The project is running on system Python without virtual environment isolation. This can lead to:
- Package conflicts with system packages
- Dependency version issues
- Difficulty in deployment
- Potential system instability

**Recommended Actions:**
1. Create a virtual environment: `python3 -m venv venv`
2. Activate it: `source venv/bin/activate`
3. Reinstall packages: `pip install -r backend/requirements.txt`

---

## 📦 Package Versions Summary

### Critical System Packages
```
Python: 3.10.12
pip: 25.2
Node.js: 12.22.9
npm: 8.5.1
PostgreSQL: 14.18
NVIDIA Driver: 575.64.03
CUDA: 12.9 (runtime) / 11.5.119 (compiler)
```

### Core Application Stack
```
FastAPI: 0.116.1
React: 18.3.1
TensorFlow: 2.19.1
PyTorch: 2.8.0+cu128
OpenCV: 4.12.0
DeepFace: 0.0.95
SQLAlchemy: 2.0.43
```

### Data Science & ML Stack
```
NumPy: 2.1.3
Pandas: 2.3.1
Scikit-learn: 1.7.1
Scikit-image: 0.25.2
SciPy: 1.15.3
```

### Cloud & Storage
```
Boto3: 1.40.20
OpenPyXL: 3.1.5
```

---

## 🔧 Project Structure Analysis

### Backend (Python/FastAPI)
- **Main Framework:** FastAPI with Uvicorn ASGI server
- **Database:** PostgreSQL with SQLAlchemy ORM
- **AI/ML:** TensorFlow + PyTorch for face recognition
- **Computer Vision:** OpenCV + DeepFace
- **Authentication:** JWT with passlib/bcrypt
- **File Storage:** Local + AWS S3 support
- **Export:** Excel support via openpyxl

### Frontend (React)
- **Framework:** React 18.3.1
- **Build Tool:** Create React App (react-scripts 5.0.1)
- **Runtime:** Node.js 12.22.9

### Development Environment
- **OS:** Ubuntu 22.04.5 LTS
- **Python:** System installation (no virtual environment)
- **GPU:** NVIDIA GTX 1650 with CUDA 12.9 support
- **Database:** PostgreSQL 14.18

---

## ⚠️ Important Notes

1. **Virtual Environment:** Project is NOT using virtual environment - consider setting one up
2. **Node.js Version:** Using older Node.js v12.22.9 - consider upgrading
3. **GPU Support:** Fully configured with TensorFlow and PyTorch GPU support
4. **Database:** PostgreSQL properly configured
5. **Cloud Ready:** AWS S3 integration available
6. **Production Ready:** Gunicorn configured for production deployment

---

**Documentation generated by:** GitHub Copilot  
**Last Updated:** September 2, 2025  
**Project Status:** Active Development with GPU-accelerated ML capabilities
