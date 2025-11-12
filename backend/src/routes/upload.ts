import express from 'express';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/aws';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/sign-s3', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    
    const key = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      // Removed ACL as we're using bucket policy for access control
    });
    
    // Generate a pre-signed URL for uploading
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    
    // Since we're not using public-read ACL, we'll use the pre-signed URL pattern for access
    // The file will be accessible via the pre-signed URL until it expires
    const fileUrl = signedUrl.split('?')[0]; // This is the direct URL to the file (without the signature)

    res.json({ signedUrl, fileUrl });
  } catch (err) {
    // Cast the error to a type with the properties we expect
    const error = err as Error & { 
      name: string; 
      message: string; 
      stack?: string;
      code?: string;
    };
    
    console.error('Upload error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Upload failed';
    let statusCode = 500;
    
    if (error.name === 'CredentialsProviderError' || error.code === 'CredentialsError') {
      errorMessage = 'AWS credentials not configured properly';
      statusCode = 500;
    } else if (error.name === 'NoSuchBucket' || error.code === 'NoSuchBucket') {
      errorMessage = `S3 bucket not found: ${process.env.AWS_BUCKET_NAME}`;
      statusCode = 500;
    } else if (error.name === 'AccessDenied' || error.code === 'AccessDenied') {
      errorMessage = 'Access denied to S3 bucket. Check IAM permissions.';
      statusCode = 403;
    } else if (error.name === 'InvalidAccessKeyId' || error.code === 'InvalidAccessKeyId') {
      errorMessage = 'Invalid AWS access key ID';
      statusCode = 500;
    } else if (error.name === 'SignatureDoesNotMatch' || error.code === 'SignatureDoesNotMatch') {
      errorMessage = 'Error generating signed URL. Check AWS secret key.';
      statusCode = 500;
    }
    
    console.error('Detailed upload error:', {
      errorName: error.name,
      errorCode: (error as any).code,
      errorMessage: error.message,
      stack: error.stack,
      bucket: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION
    });
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      // Include additional error details in development
      ...(process.env.NODE_ENV === 'development' ? { 
        errorName: error.name,
        errorCode: (error as any).code,
        stack: error.stack
      } : {})
    });
  }
});

export default router;
