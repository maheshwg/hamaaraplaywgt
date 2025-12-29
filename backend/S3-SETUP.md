# S3 Screenshot Storage Setup

Your backend already supports S3 for storing test screenshots. Here's how to set it up:

## Quick Setup Checklist

- [ ] Create S3 bucket
- [ ] Create IAM user with S3 access
- [ ] Configure bucket policy (if public access needed)
- [ ] Setup CloudFront (optional, for faster delivery)
- [ ] Update backend environment variables
- [ ] Deploy to EC2

## 1. Create S3 Bucket

```bash
Bucket name: yourqatester-screenshots
Region: us-east-1 (or your preferred region)
Block Public Access: Uncheck if you want direct URLs
Versioning: Disabled (optional)
```

## 2. Bucket Policy (for public access)

Go to S3 bucket → Permissions → Bucket policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::yourqatester-screenshots/*"
        }
    ]
}
```

## 3. CORS Configuration

Go to S3 bucket → Permissions → CORS:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": [
            "https://yourqatester.com",
            "http://localhost:5173"
        ],
        "ExposeHeaders": []
    }
]
```

## 4. Create IAM User

1. IAM → Users → Create user
2. Username: `yourqatester-backend`
3. Create and attach inline policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::yourqatester-screenshots",
                "arn:aws:s3:::yourqatester-screenshots/*"
            ]
        }
    ]
}
```

4. Create access key → Save Access Key ID and Secret Access Key

## 5. Backend Configuration

### Local Development

Create/update `backend/.env`:

```bash
SCREENSHOT_STORAGE_TYPE=s3
AWS_S3_BUCKET=yourqatester-screenshots
AWS_REGION=us-east-1
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_CLOUDFRONT_URL=  # Optional
```

### EC2 Production

Update `deploy-to-ec2.sh`:

```bash
AWS_S3_BUCKET="yourqatester-screenshots"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
AWS_CLOUDFRONT_URL=""
```

Then deploy:
```bash
./backend/deploy-to-ec2.sh
```

## 6. CloudFront Setup (Optional, Recommended)

For faster screenshot delivery worldwide:

1. CloudFront → Create Distribution
2. **Origin domain**: Select S3 bucket
3. **Origin access**: Origin access control (create new OAC)
4. **Viewer protocol**: Redirect HTTP to HTTPS
5. Create distribution
6. Copy the distribution URL (e.g., `https://d123456.cloudfront.net`)
7. Update backend config:
   ```bash
   AWS_CLOUDFRONT_URL=https://d123456.cloudfront.net
   ```
8. Update S3 bucket policy with CloudFront OAC policy

## 7. Testing

After deployment, screenshots will be stored in S3 and URLs will look like:

**Without CloudFront:**
```
https://yourqatester-screenshots.s3.us-east-1.amazonaws.com/screenshots/uuid.png
```

**With CloudFront:**
```
https://d123456.cloudfront.net/screenshots/uuid.png
```

Check your test results in the frontend - screenshot URLs should now point to S3/CloudFront.

## Troubleshooting

### Uploads failing
```bash
# Check IAM credentials are correct
ssh -i your-key.pem ec2-user@your-ec2-ip
cat /opt/youraitester/.env | grep AWS

# Check backend logs
tail -f /opt/youraitester/logs/application.log | grep S3
```

### Images not loading in frontend
- Check bucket policy allows public read
- Check CORS configuration includes your domain
- Verify CloudFront distribution is deployed (if using)

### Alternative: Use IAM Role (More Secure)

Instead of access keys, attach IAM role to EC2:

1. Create IAM role with S3 policy (same as above)
2. Attach role to EC2 instance
3. Remove `AWS_ACCESS_KEY` and `AWS_SECRET_KEY` from .env
4. Backend will automatically use IAM role credentials

## Cost Estimation

**S3 Storage:**
- $0.023 per GB/month
- 1000 screenshots (~10MB each) = ~10GB = $0.23/month

**S3 Requests:**
- $0.005 per 1000 PUT requests
- $0.0004 per 1000 GET requests
- 10,000 uploads = $0.05/month

**CloudFront (if used):**
- First 1TB/month = $0.085/GB
- 100GB transfer = $8.50/month

**Total estimate: ~$10-20/month** for typical usage
