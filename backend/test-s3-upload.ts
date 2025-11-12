import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, './.env') });

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function testS3Upload() {
  try {
    const testFile = path.join(__dirname, 'test-upload.txt');
    
    // Create a test file if it doesn't exist
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, 'This is a test file for S3 upload');
    }

    const fileContent = fs.readFileSync(testFile);
    const fileName = `test-${Date.now()}.txt`;
    
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error('AWS_BUCKET_NAME is not set in environment variables');
    }

    // Upload file directly
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `test-uploads/${fileName}`,
      Body: fileContent,
      ContentType: 'text/plain',
      ACL: 'public-read' as const, // Using const assertion for the ACL value
    };

    console.log('Uploading file to S3...');
    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);
    
    console.log('Upload successful!', result);
    
    // Get public URL
    const publicUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    console.log('File is available at:', publicUrl);
    
    // Test signed URL generation
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('Signed URL (valid for 1 hour):', signedUrl);
    
  } catch (error) {
    console.error('Error testing S3 upload:', error);
  }
}

testS3Upload();
