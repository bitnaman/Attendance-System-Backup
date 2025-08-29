#!/bin/bash
# AWS S3 Setup Script for BTech Attendance System

echo "🚀 Setting up AWS S3 for BTech Attendance System"
echo "================================================"

# Configuration
BUCKET_NAME="btech-attendance-photos"
REGION="us-east-1"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'"
    echo "   unzip awscliv2.zip"
    echo "   sudo ./aws/install"
    exit 1
fi

echo "✅ AWS CLI found"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run: aws configure"
    exit 1
fi

echo "✅ AWS credentials configured"

# Create S3 bucket
echo "🪣 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Set bucket policy for public read access
echo "🔓 Setting bucket policy for public read access..."
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json

# Set CORS configuration
echo "🌐 Setting CORS configuration..."
cat > cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": []
    }
  ]
}
EOF

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json

# Create folder structure
echo "📁 Creating folder structure..."
aws s3api put-object --bucket $BUCKET_NAME --key student_photos/
aws s3api put-object --bucket $BUCKET_NAME --key attendance_photos/
aws s3api put-object --bucket $BUCKET_NAME --key dataset/
aws s3api put-object --bucket $BUCKET_NAME --key face_encodings/

# Clean up temporary files
rm bucket-policy.json cors-config.json

echo ""
echo "🎉 S3 setup completed successfully!"
echo ""
echo "📋 Bucket Information:"
echo "   Bucket Name: $BUCKET_NAME"
echo "   Region: $REGION"
echo "   Public URL: https://$BUCKET_NAME.s3.$REGION.amazonaws.com"
echo ""
echo "🔧 Next steps:"
echo "   1. Update your backend .env file with:"
echo "      PHOTO_STORAGE_TYPE=s3"
echo "      S3_BUCKET_NAME=$BUCKET_NAME"
echo "      AWS_REGION=$REGION"
echo "   2. Update your frontend .env file with:"
echo "      REACT_APP_PHOTO_BASE=https://$BUCKET_NAME.s3.$REGION.amazonaws.com"
echo "   3. Deploy your application"
echo ""
