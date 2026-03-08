// Script to update all existing videos to Hodgkin workspace
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFilePath = path.join(__dirname, 'server', 'data', 'videos.json');

// Read the data file
const videos = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

// Update all videos without a workspace to hodgkin
let updatedCount = 0;
const updatedVideos = videos.map(video => {
  if (!video.workspace) {
    updatedCount++;
    return { ...video, workspace: 'hodgkin' };
  }
  return video;
});

// Write back to file
fs.writeFileSync(dataFilePath, JSON.stringify(updatedVideos, null, 2));

console.log(`Updated ${updatedCount} videos to Hodgkin workspace`);
console.log(`Total videos: ${updatedVideos.length}`);
