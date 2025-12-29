#!/bin/bash

################################################################################
# Frontend Deployment Script
# Builds and deploys the frontend to S3
################################################################################

# Configuration - UPDATE THESE!
S3_BUCKET="yourqatester-frontend"  # Your S3 bucket name
AWS_REGION="us-east-1"
EC2_BACKEND_URL="http://3.137.217.41:8080"  # EC2 backend URL

echo "================================"
echo "Deploying Frontend to S3"
echo "================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Build the frontend with production environment variable
echo "Building frontend for production..."
export VITE_API_BASE_URL=$EC2_BACKEND_URL
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Build failed!"
    exit 1
fi

echo "Build complete!"

# Sync to S3
echo "Uploading to S3 bucket: $S3_BUCKET..."
aws s3 sync dist/ s3://$S3_BUCKET/ --region $AWS_REGION --delete

if [ $? -ne 0 ]; then
    echo "Error: S3 upload failed!"
    exit 1
fi

echo ""
echo "================================"
echo "Deployment Complete!"
echo "================================"
echo ""
echo "Frontend deployed to: s3://$S3_BUCKET"
echo "Backend URL configured: $EC2_BACKEND_URL"
echo ""
echo "To enable static website hosting, run:"
echo "  aws s3 website s3://$S3_BUCKET --index-document index.html --error-document index.html"
echo ""
echo "Or configure CloudFront distribution for better performance."
echo ""
