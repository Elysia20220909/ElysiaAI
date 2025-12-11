#!/bin/bash
# ==================== GCP Deployment Script ====================
# Elysia AI - Google Cloud Run Deployment

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-elysia-ai}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🌸 Elysia AI - GCP Deployment"
echo "=============================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Set project
echo "📋 Step 1: Set GCP Project"
gcloud config set project $PROJECT_ID

echo "✅ Project set"

# Enable required APIs
echo ""
echo "🔌 Step 2: Enable Required APIs"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    --project=$PROJECT_ID

echo "✅ APIs enabled"

# Build with Cloud Build
echo ""
echo "🏗️  Step 3: Build with Cloud Build"
cd ../..
gcloud builds submit \
    --config=cloud/gcp/cloudbuild.yaml \
    --project=$PROJECT_ID \
    .

echo "✅ Build completed"

# Deploy to Cloud Run (already done in cloudbuild, but can be manual)
echo ""
echo "🚀 Step 4: Verify Deployment"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format='value(status.url)')

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo "Service URL: $SERVICE_URL"
echo "Image: $IMAGE_NAME:latest"
echo ""
echo "To view logs:"
echo "  gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo ""
echo "To update service:"
echo "  gcloud builds submit --config=cloud/gcp/cloudbuild.yaml --project=$PROJECT_ID ."
echo ""
echo "To access Cloud Console:"
echo "  https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
echo ""

# Test endpoint
echo "🧪 Testing endpoint..."
curl -f "$SERVICE_URL/" && echo "✅ Service is responding!" || echo "⚠️  Service may not be ready yet"
