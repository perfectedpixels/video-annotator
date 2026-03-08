import { 
  TranscribeClient, 
  StartTranscriptionJobCommand, 
  GetTranscriptionJobCommand 
} from '@aws-sdk/client-transcribe';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const transcribeClient = new TranscribeClient({ 
  region: process.env.AWS_REGION || 'us-east-1'
  // Will automatically use IAM role credentials if available
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

export function isTranscribeConfigured() {
  // Check if we have AWS region and S3 bucket (credentials can come from IAM role)
  const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
  return !!(
    process.env.AWS_REGION &&
    bucketName
  );
}

export async function startTranscriptionJob(videoId, s3Key, languageCode = 'en-US') {
  if (!isTranscribeConfigured()) {
    throw new Error('AWS Transcribe is not configured');
  }

  const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
  const jobName = `transcribe-${videoId}-${Date.now()}`;
  const s3Uri = `s3://${bucketName}/${s3Key}`;

  const params = {
    TranscriptionJobName: jobName,
    LanguageCode: languageCode,
    Media: {
      MediaFileUri: s3Uri
    },
    OutputBucketName: bucketName,
    OutputKey: `transcripts/${videoId}.json`
    // Removed speaker labeling settings - not needed for basic transcription
  };

  try {
    const command = new StartTranscriptionJobCommand(params);
    const response = await transcribeClient.send(command);
    console.log('Transcription job started:', jobName);
    return {
      jobName,
      status: response.TranscriptionJob.TranscriptionJobStatus
    };
  } catch (error) {
    console.error('Error starting transcription job:', error);
    throw error;
  }
}

export async function getTranscriptionJobStatus(jobName) {
  try {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName
    });
    const response = await transcribeClient.send(command);
    return {
      status: response.TranscriptionJob.TranscriptionJobStatus,
      transcriptFileUri: response.TranscriptionJob.Transcript?.TranscriptFileUri
    };
  } catch (error) {
    console.error('Error getting transcription job status:', error);
    throw error;
  }
}

export async function fetchTranscriptFromUri(transcriptUri, videoId) {
  try {
    // Instead of fetching from the URI (which may have auth issues),
    // read directly from S3 where we know the file is stored
    const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
    const key = `transcripts/${videoId}.json`;
    
    console.log(`Fetching transcript from S3: s3://${bucketName}/${key}`);
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const response = await s3Client.send(command);
    const bodyString = await response.Body.transformToString();
    const data = JSON.parse(bodyString);
    
    // Parse AWS Transcribe output format
    const transcript = data.results.items
      .filter(item => item.type === 'pronunciation')
      .map(item => ({
        start: parseFloat(item.start_time),
        end: parseFloat(item.end_time),
        text: item.alternatives[0].content
      }));

    // Group words into sentences (approximately every 10 words or at punctuation)
    const segments = [];
    let currentSegment = { start: 0, end: 0, text: '' };
    let wordCount = 0;

    transcript.forEach((word, index) => {
      if (wordCount === 0) {
        currentSegment.start = word.start;
      }

      currentSegment.text += (currentSegment.text ? ' ' : '') + word.text;
      currentSegment.end = word.end;
      wordCount++;

      // Create new segment every 10 words or at sentence end
      const isEndOfSentence = word.text.match(/[.!?]$/);
      if (wordCount >= 10 || isEndOfSentence || index === transcript.length - 1) {
        segments.push({ ...currentSegment });
        currentSegment = { start: 0, end: 0, text: '' };
        wordCount = 0;
      }
    });

    console.log(`Successfully parsed ${segments.length} transcript segments`);
    return segments;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
}
