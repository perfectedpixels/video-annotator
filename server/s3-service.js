import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSignedUrl as getCloudfrontSignedUrl } from '@aws-sdk/cloudfront-signer';
import fs from 'fs';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const USE_CLOUDFRONT = process.env.USE_CLOUDFRONT === 'true';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const CLOUDFRONT_KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID;
const CLOUDFRONT_PRIVATE_KEY_PATH = process.env.CLOUDFRONT_PRIVATE_KEY_PATH;

let CLOUDFRONT_PRIVATE_KEY;
if (USE_CLOUDFRONT && CLOUDFRONT_PRIVATE_KEY_PATH) {
  try {
    CLOUDFRONT_PRIVATE_KEY = fs.readFileSync(CLOUDFRONT_PRIVATE_KEY_PATH, 'utf8');
    console.log('CloudFront private key loaded successfully');
  } catch (error) {
    console.error('Failed to load CloudFront private key:', error);
  }
}

/**
 * Upload video to S3
 * @param {Buffer} fileBuffer - Video file buffer
 * @param {string} filename - Unique filename
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} S3 key
 */
export async function uploadVideoToS3(fileBuffer, filename, contentType) {
  const key = `videos/${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    Metadata: {
      uploadedAt: Date.now().toString()
    }
  });

  await s3Client.send(command);
  console.log(`Video uploaded to S3: ${key}`);
  
  return key;
}

/**
 * Generate CloudFront signed URL or S3 presigned URL
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} Signed URL
 */
export async function getPresignedUrl(s3Key) {
  // Use CloudFront signed URLs if configured
  if (USE_CLOUDFRONT && CLOUDFRONT_DOMAIN && CLOUDFRONT_KEY_PAIR_ID && CLOUDFRONT_PRIVATE_KEY) {
    try {
      const url = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
      const expiresIn = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      const signedUrl = getCloudfrontSignedUrl({
        url,
        keyPairId: CLOUDFRONT_KEY_PAIR_ID,
        privateKey: CLOUDFRONT_PRIVATE_KEY,
        dateLessThan: new Date(Date.now() + expiresIn).toISOString()
      });
      
      return signedUrl;
    } catch (error) {
      console.error('CloudFront signing failed, falling back to S3:', error);
      // Fall through to S3 presigned URL
    }
  }
  
  // Fallback to S3 presigned URL
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  const url = await getSignedUrl(s3Client, command, { 
    expiresIn: 3600 // 1 hour
  });
  
  return url;
}

/**
 * Delete video from S3
 * @param {string} s3Key - S3 object key
 */
export async function deleteVideoFromS3(s3Key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  await s3Client.send(command);
  console.log(`Video deleted from S3: ${s3Key}`);
}

/**
 * Check if S3 is configured
 * @returns {boolean}
 */
export function isS3Configured() {
  return !!BUCKET_NAME;
}
