#!/bin/bash
# ==================== AWS Deployment Script ====================
# Elysia AI - Automated AWS ECS Fargate Deployment

set -e

# Configuration
STACK_NAME="${STACK_NAME:-elysia-ai-prod}"
REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="${ECR_REPO_NAME:-elysia-ai}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "🌸 Elysia AI - AWS Deployment"
echo "=============================="
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo "ECR Repo: $ECR_REPO_NAME"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
FULL_IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPO_NAME}:${IMAGE_TAG}"

echo "📦 Step 1: Create ECR Repository (if not exists)"
aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION 2>/dev/null || \
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256

echo "✅ ECR repository ready"

echo ""
echo "🔐 Step 2: Login to ECR"
aws ecr get-login-password --region $REGION | \
docker login --username AWS --password-stdin $ECR_REGISTRY

echo "✅ Logged in to ECR"

echo ""
echo "🏗️  Step 3: Build Docker Image"
cd ../..
docker build -f Dockerfile.production -t $ECR_REPO_NAME:$IMAGE_TAG .

echo "✅ Image built"

echo ""
echo "🏷️  Step 4: Tag Image"
docker tag $ECR_REPO_NAME:$IMAGE_TAG $FULL_IMAGE_NAME

echo "✅ Image tagged"

echo ""
echo "⬆️  Step 5: Push Image to ECR"
docker push $FULL_IMAGE_NAME

echo "✅ Image pushed"

echo ""
echo "☁️  Step 6: Deploy CloudFormation Stack"
aws cloudformation deploy \
    --template-file cloud/aws/cloudformation.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        ContainerImage=$FULL_IMAGE_NAME \
        Environment=production \
    --capabilities CAPABILITY_IAM \
    --region $REGION

echo "✅ Stack deployed"

echo ""
echo "📊 Step 7: Get Outputs"
ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
    --output text)

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo "Application URL: $ALB_URL"
echo "ECR Image: $FULL_IMAGE_NAME"
echo ""
echo "To view logs:"
echo "  aws logs tail /ecs/$STACK_NAME --follow --region $REGION"
echo ""
echo "To update service (after image push):"
echo "  aws ecs update-service --cluster ${STACK_NAME}-Cluster --service ${STACK_NAME}-service --force-new-deployment --region $REGION"
echo ""
