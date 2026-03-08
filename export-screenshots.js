#!/usr/bin/env node

/**
 * Export Screenshots from Video Annotations
 * 
 * This script extracts all annotated screenshots from a video and saves them as PNG files.
 * 
 * Usage:
 *   node export-screenshots.js <videoId>
 * 
 * Example:
 *   node export-screenshots.js abc123
 */

const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

async function fetchAnnotations(videoId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}/annotations`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch annotations');
    }
    
    return data.annotations || [];
  } catch (error) {
    console.error('Error fetching annotations:', error.message);
    process.exit(1);
  }
}

async function fetchVideoInfo(videoId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to fetch videos');
    }
    
    const video = data.videos.find(v => v.id === videoId);
    if (!video) {
      throw new Error(`Video with ID "${videoId}" not found`);
    }
    
    return video;
  } catch (error) {
    console.error('Error fetching video info:', error.message);
    process.exit(1);
  }
}

function base64ToBuffer(base64String) {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m${secs}s`;
}

function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

async function exportScreenshots(videoId) {
  console.log(`\n📹 Fetching video information...`);
  const video = await fetchVideoInfo(videoId);
  console.log(`✓ Found video: "${video.title}"`);
  
  console.log(`\n📸 Fetching annotations...`);
  const annotations = await fetchAnnotations(videoId);
  
  if (annotations.length === 0) {
    console.log('⚠️  No annotations found for this video.');
    process.exit(0);
  }
  
  console.log(`✓ Found ${annotations.length} annotation${annotations.length !== 1 ? 's' : ''}`);
  
  // Create output directory
  const videoTitle = sanitizeFilename(video.title);
  const outputDir = path.join(process.cwd(), 'exported-screenshots', `${videoTitle}_${videoId}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`\n💾 Exporting to: ${outputDir}\n`);
  
  let exportedCount = 0;
  
  // Export each annotation's screenshot
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    const timestamp = formatTimestamp(annotation.timestamp);
    const filename = `${i + 1}_${timestamp}_${annotation.username}.png`;
    const filepath = path.join(outputDir, filename);
    
    try {
      // Use edited screenshot if available, otherwise use original
      const screenshot = annotation.editedScreenshot || annotation.screenshot;
      const buffer = base64ToBuffer(screenshot);
      
      fs.writeFileSync(filepath, buffer);
      
      const commentCount = annotation.comments?.length || 0;
      console.log(`  ✓ ${filename} (${commentCount} comment${commentCount !== 1 ? 's' : ''})`);
      exportedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to export ${filename}:`, error.message);
    }
  }
  
  console.log(`\n✅ Successfully exported ${exportedCount} screenshot${exportedCount !== 1 ? 's' : ''}`);
  console.log(`📁 Location: ${outputDir}\n`);
  console.log(`💡 Tip: You can now drag these images into Figma!\n`);
}

// Main execution
const videoId = process.argv[2];

if (!videoId) {
  console.error('\n❌ Error: Video ID is required\n');
  console.log('Usage: node export-screenshots.js <videoId>\n');
  console.log('To find video IDs, check the URL when viewing a video:');
  console.log('  http://localhost:5173?video=<videoId>\n');
  process.exit(1);
}

exportScreenshots(videoId);
