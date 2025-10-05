#!/bin/bash

# GCP Deployment Script for Facial Attendance System
# This script deploys the application to Google Cloud Platform

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
REGION=${REGION:-"us-central1"}
ZONE=${ZONE:-"us-central1-a"}
CLUSTER_NAME=${CLUSTER_NAME:-"facial-attendance-cluster"}
BUCKET_NAME=${BUCKET_NAME:-"facial-attendance-storage"}

echo "🚀 Starting GCP deployment for Facial Attendance System"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Zone: $ZONE"
echo "Cluster: $CLUSTER_NAME"
echo "Bucket: $BUCKET_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "   curl https://sdk.cloud.google.com | bash"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install it first:"
    echo "   gcloud components install kubectl"
    exit 1
fi

# Set project
echo "🔧 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Create GCS bucket for storage
echo "🔧 Creating GCS bucket..."
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME || echo "Bucket may already exist"

# Create GKE cluster with GPU support
echo "🔧 Creating GKE cluster with GPU support..."
gcloud container clusters create $CLUSTER_NAME \
    --zone=$ZONE \
    --machine-type=n1-standard-4 \
    --num-nodes=2 \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=5 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --enable-autorepair \
    --enable-autoupgrade \
    --disk-size=50GB \
    --disk-type=pd-ssd

# Get cluster credentials
echo "🔧 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Install NVIDIA device plugin
echo "🔧 Installing NVIDIA device plugin..."
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.16.2/nvidia-device-plugin.yml

# Build and push Docker images
echo "🔧 Building and pushing Docker images..."

# Build backend image
echo "Building backend image..."
docker build -t gcr.io/$PROJECT_ID/facial-attendance-backend:latest ./backend/
docker push gcr.io/$PROJECT_ID/facial-attendance-backend:latest

# Build frontend image
echo "Building frontend image..."
docker build -t gcr.io/$PROJECT_ID/facial-attendance-frontend:latest ./frontend/
docker push gcr.io/$PROJECT_ID/facial-attendance-frontend:latest

# Update deployment configuration
echo "🔧 Updating deployment configuration..."
sed -i "s/YOUR_PROJECT_ID/$PROJECT_ID/g" gcp-deployment.yaml
sed -i "s/your-domain.com/your-domain.com/g" gcp-deployment.yaml

# Deploy to GKE
echo "🔧 Deploying to GKE..."
kubectl apply -f gcp-deployment.yaml

# Wait for deployment
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/backend -n facial-attendance
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n facial-attendance

# Get external IP
echo "🔧 Getting external IP..."
EXTERNAL_IP=$(kubectl get ingress facial-attendance-ingress -n facial-attendance -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$EXTERNAL_IP" ]; then
    echo "⏳ External IP is still being assigned. Please check later with:"
    echo "   kubectl get ingress facial-attendance-ingress -n facial-attendance"
else
    echo "✅ Deployment complete!"
    echo "🌐 Application URL: http://$EXTERNAL_IP"
    echo "📊 Monitor with: kubectl get pods -n facial-attendance"
fi

echo ""
echo "🎉 GCP deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your domain to point to the external IP"
echo "2. Update the ingress configuration with your domain"
echo "3. Set up SSL certificate"
echo "4. Configure monitoring and logging"
echo ""
echo "🔧 Useful commands:"
echo "   kubectl get pods -n facial-attendance"
echo "   kubectl logs -f deployment/backend -n facial-attendance"
echo "   kubectl get ingress -n facial-attendance"
