# 🚀 Azure Deployment Guide - Bharati Facify

Deploy your Facial Attendance System on Microsoft Azure using your $100 student credit.

---

## 📋 Quick Overview

### What You'll Deploy
| Component | Azure Service | Estimated Cost |
|-----------|--------------|----------------|
| Backend API | Azure VM (B2s) | ~$30-40/month |
| Frontend | Same VM | Included |
| Database | SQLite (on VM) | Included |
| Storage | VM disk | Included |
| **Total** | | **~$30-40/month** |

> 💡 **With $100 credit, you get ~2.5-3 months of testing!**

---

## 🎯 Deployment Options

### Option A: Single VM Deployment (Recommended for Testing)
- ✅ Simplest setup
- ✅ Lowest cost (~$30-40/month)
- ✅ Everything on one machine
- ⚠️ Not production-grade (no redundancy)

### Option B: Azure App Service (More managed)
- ✅ Auto-scaling
- ⚠️ Higher cost (~$50-70/month)
- ⚠️ More complex configuration

---

## 🛠️ Option A: Single VM Deployment

### Step 1: Create Azure Account & Login

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set your student subscription
az account set --subscription "Azure for Students"
```

### Step 2: Create a Virtual Machine

```bash
# Create resource group
az group create --name facial-attendance-rg --location eastus

# Create VM (Ubuntu 22.04, B2s = 2 vCPU, 4GB RAM)
az vm create \
  --resource-group facial-attendance-rg \
  --name facial-attendance-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard
```

### Step 3: Open Required Ports

```bash
# Open ports for HTTP (80), HTTPS (443), and Backend (8000)
az vm open-port --resource-group facial-attendance-rg --name facial-attendance-vm --port 80 --priority 1001
az vm open-port --resource-group facial-attendance-rg --name facial-attendance-vm --port 8000 --priority 1002
az vm open-port --resource-group facial-attendance-rg --name facial-attendance-vm --port 3000 --priority 1003
```

### Step 4: Get VM Public IP

```bash
az vm show --resource-group facial-attendance-rg --name facial-attendance-vm \
  --show-details --query publicIps -o tsv
```

Save this IP address - you'll need it!

### Step 5: Connect to VM

```bash
ssh azureuser@<YOUR_VM_IP>
```

### Step 6: Install Dependencies on VM

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.10+
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install git
sudo apt install -y git

# Install system dependencies for OpenCV
sudo apt install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev
```

### Step 7: Clone Your Project

```bash
# Clone repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/Facial_Attendance_System.git
cd Facial_Attendance_System
```

### Step 8: Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies (this takes 5-10 minutes)
pip install --upgrade pip
pip install -r requirements.txt

# Create admin user
python create_admin.py
```

### Step 9: Configure Environment

```bash
# Create .env file in project root
cd ..
nano .env
```

Add this content (replace `<YOUR_VM_IP>` with your actual IP):

```bash
# Database
DATABASE_TYPE=sqlite
DB_FILE=attendance.db

# Storage
PHOTO_STORAGE_TYPE=local
BACKEND_BASE_URL=http://<YOUR_VM_IP>:8000

# Face Recognition
FACE_RECOGNITION_MODEL=Facenet512
FACE_DETECTOR_BACKEND=mtcnn
FACE_DISTANCE_THRESHOLD=20.0

# Authentication (CHANGE THIS!)
AUTH_SECRET_KEY=generate-a-random-64-character-string-here
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Logging
LOG_LEVEL=INFO
LOG_THROTTLE_MS=1000

# Frontend
REACT_APP_API_BASE=http://<YOUR_VM_IP>:8000
REACT_APP_PHOTO_BASE=http://<YOUR_VM_IP>:8000
```

### Step 10: Build Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
REACT_APP_API_BASE=http://<YOUR_VM_IP>:8000 \
REACT_APP_PHOTO_BASE=http://<YOUR_VM_IP>:8000 \
npm run build
```

### Step 11: Install Process Managers

```bash
# Install PM2 for Node.js process management
sudo npm install -g pm2 serve

# Install screen for terminal management (optional)
sudo apt install -y screen
```

### Step 12: Start Services

```bash
# Start backend
cd ~/Facial_Attendance_System/backend
source venv/bin/activate
pm2 start "python main.py" --name backend

# Start frontend
cd ~/Facial_Attendance_System/frontend
pm2 start "serve -s build -l 3000" --name frontend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 13: Test Your Deployment

Open in browser:
- **Frontend**: `http://<YOUR_VM_IP>:3000`
- **Backend API**: `http://<YOUR_VM_IP>:8000`
- **API Docs**: `http://<YOUR_VM_IP>:8000/docs`

---

## 📊 Monitoring & Logs

```bash
# View PM2 status
pm2 status

# View backend logs
pm2 logs backend

# View frontend logs
pm2 logs frontend

# Restart services
pm2 restart all
```

---

## 🔒 Security Recommendations

1. **Change AUTH_SECRET_KEY**: Generate a random 64-character string
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Setup HTTPS**: Use Let's Encrypt with Nginx (optional but recommended)
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   ```

3. **Configure Firewall**:
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 8000
   sudo ufw enable
   ```

---

## 🧹 Cleanup (When Done Testing)

```bash
# Delete everything (saves credits)
az group delete --name facial-attendance-rg --yes --no-wait
```

---

## ⚠️ Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs backend --lines 50

# Check if port is in use
sudo lsof -i :8000
```

### Frontend can't connect to backend
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check firewall: `sudo ufw status`
3. Verify REACT_APP_API_BASE is set correctly

### Out of memory
- B2s has 4GB RAM, should be sufficient
- If issues occur, upgrade to B2ms (8GB) or reduce batch size

### Face recognition is slow
This is normal for CPU mode:
- Single face: 2-5 seconds
- Group photo (10 faces): 20-30 seconds

---

## 💰 Cost Optimization Tips

1. **Stop VM when not testing**: Saves ~$1/day
   ```bash
   az vm stop --resource-group facial-attendance-rg --name facial-attendance-vm
   az vm start --resource-group facial-attendance-rg --name facial-attendance-vm
   ```

2. **Use B1s for frontend-only testing**: ~$10/month

3. **Delete and recreate**: Delete when not using, redeploy when needed

---

## 📞 Need Help?

- Check Azure student support portal
- Open an issue on GitHub
- Review logs: `pm2 logs`
