import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

export function isBedrockConfigured() {
  return !!(process.env.AWS_REGION);
}

export async function generateVideoSummary(transcript) {
  if (!isBedrockConfigured()) {
    throw new Error('AWS Bedrock is not configured');
  }

  // Combine all transcript segments into full text
  const fullTranscript = transcript.map(segment => segment.text).join(' ');

  // Create prompt for Claude
  const prompt = `Please analyze this video transcript and provide a concise summary in bullet point format. Focus on the main topics, key points, and important takeaways discussed in the video.

Transcript:
${fullTranscript}

Please provide:
1. A brief overview (1-2 sentences)
2. Main topics covered (bullet points)
3. Key takeaways (bullet points)

Format your response in a clear, easy-to-read structure.`;

  try {
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0", // Using Haiku for speed and cost
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const summary = responseBody.content[0].text;
    console.log('AI summary generated successfully');
    
    return summary;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw error;
  }
}
