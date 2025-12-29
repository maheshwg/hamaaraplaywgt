#!/bin/bash

# Frontend deployment script to S3
# Usage: ./deploy.sh

BUCKET_NAME="youraitester.com"  # S3 bucket name
AWS_REGION="us-east-2"  # US East (Ohio)
CLOUDFRONT_ID="YOUR_DISTRIBUTION_ID"  # Optional: Replace with your CloudFront distribution ID
EC2_BACKEND_URL="http://3.137.217.41:8080"  # EC2 backend URL

echo "Building frontend with EC2 backend URL: $EC2_BACKEND_URL..."
export VITE_API_BASE_URL=$EC2_BACKEND_URL
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Build failed!"
    exit 1
fi

echo "Uploading to S3 (${AWS_REGION})..."
aws s3 sync dist/ s3://${BUCKET_NAME} --region ${AWS_REGION} --delete

if [ $? -ne 0 ]; then
    echo "Error: S3 upload failed!"
    exit 1
fi

# Invalidate CloudFront cache if CloudFront ID is provided (optional)
if [ "$CLOUDFRONT_ID" != "YOUR_DISTRIBUTION_ID" ] && [ ! -z "$CLOUDFRONT_ID" ]; then
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*"
else
    echo "Skipping CloudFront cache invalidation (not configured)"
fi

echo ""
echo "Deployment complete!"
echo "Frontend URL: http://${BUCKET_NAME}.s3-website-${AWS_REGION}.amazonaws.com"
echo "Backend URL: ${EC2_BACKEND_URL}"
echo ""
echo "Note: If you have CloudFront set up, update CLOUDFRONT_ID in this script for cache invalidation."
