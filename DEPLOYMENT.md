# Deployment Guide

This guide covers deploying both the backend to EC2 and frontend to S3.

## Prerequisites

1. **AWS CLI installed** (for frontend deployment)
   ```bash
   # macOS
   brew install awscli
   
   # Or download from: https://aws.amazon.com/cli/
   ```

2. **AWS credentials configured**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter default region: us-east-1
   # Enter default output format: json
   ```

3. **S3 bucket created** for frontend hosting
   ```bash
   aws s3 mb s3://yourqatester-frontend --region us-east-1
   ```

4. **EC2 key file** at `../key1.pem` (relative to backend directory)

## Backend Deployment to EC2

The backend is already deployed! ✅

**Status:** Backend deployed to `http://3.137.217.41:8080`

**To redeploy:**
```bash
cd backend
./deploy-to-ec2.sh
```

**To check backend status:**
```bash
ssh -i ../key1.pem ec2-user@3.137.217.41 'curl http://localhost:8080/actuator/health'
```

## Frontend Deployment to S3

### Step 1: Update S3 Bucket Name

Edit `deploy-frontend.sh` and update the bucket name:
```bash
S3_BUCKET="yourqatester-frontend"  # Change to your actual bucket name
```

### Step 2: Deploy Frontend

```bash
./deploy-frontend.sh
```

This will:
1. Build the frontend with production settings
2. Set `VITE_API_BASE_URL` to point to EC2 backend (`http://3.137.217.41:8080`)
3. Upload the built files to S3

### Step 3: Enable Static Website Hosting

After deployment, enable static website hosting on your S3 bucket:

```bash
aws s3 website s3://yourqatester-frontend \
  --index-document index.html \
  --error-document index.html
```

### Step 4: Configure Bucket Policy

Allow public read access:

```bash
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::yourqatester-frontend/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket yourqatester-frontend --policy file://bucket-policy.json
```

### Step 5: Access Your Frontend

Your frontend will be available at:
```
http://yourqatester-frontend.s3-website-us-east-1.amazonaws.com
```

Or if you have a custom domain:
```
https://yourdomain.com
```

## Frontend Configuration

The frontend is configured to connect to the EC2 backend:

- **Development:** Uses Vite proxy to `localhost:8080`
- **Production:** Uses `VITE_API_BASE_URL` environment variable or defaults to `http://3.137.217.41:8080`

The configuration is in `src/api/auth.js`:
```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'http://3.137.217.41:8080' : '');
```

## Optional: CloudFront Setup (Recommended)

For better performance and HTTPS:

1. Create CloudFront distribution pointing to your S3 bucket
2. Configure custom domain (optional)
3. Update frontend to use CloudFront URL

## Troubleshooting

### Backend not accessible
- Check EC2 security group allows inbound traffic on port 8080
- Check backend logs: `ssh -i ../key1.pem ec2-user@3.137.217.41 'tail -f /opt/youraitester/logs/application.log'`

### Frontend can't connect to backend
- Verify backend is running: `curl http://3.137.217.41:8080/actuator/health`
- Check CORS settings in backend (should allow your S3/CloudFront domain)
- Check browser console for CORS errors

### S3 upload fails
- Verify AWS credentials: `aws sts get-caller-identity`
- Check bucket exists: `aws s3 ls s3://yourqatester-frontend`
- Verify bucket permissions

## Quick Deploy Commands

**Backend:**
```bash
cd backend && ./deploy-to-ec2.sh
```

**Frontend:**
```bash
./deploy-frontend.sh
```

**Both:**
```bash
cd backend && ./deploy-to-ec2.sh && cd .. && ./deploy-frontend.sh
```

