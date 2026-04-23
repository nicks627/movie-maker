import fs from 'fs';
import path from 'path';
import axios from 'axios';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');
const VIDEO_DIR = path.join(process.cwd(), 'public', 'assets', 'stock');
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '13567882-d6023c00ac6a19cffa9bc6174'; // Used user's API Key

async function downloadVideo(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function fetchPixabayVideo(query) {
  if (PIXABAY_API_KEY === 'YOUR_API_KEY_HERE' || !PIXABAY_API_KEY) {
    console.warn(`[WARN] No Pixabay API key found. Skipping search for "${query}".`);
    return null;
  }

  try {
    const res = await axios.get(`https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=3`);
    if (res.data && res.data.totalHits > 0) {
      // Get the first tiny/small video url
      const videoUrl = res.data.hits[0].videos.tiny.url || res.data.hits[0].videos.small.url;
      return videoUrl;
    }
  } catch (error) {
    console.error(`[ERROR] Pixabay API request failed:`, error.message);
  }
  return null;
}

async function main() {
  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  const scriptData = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
  let scenes = (scriptData.long || scriptData.short).scenes;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const outputPath = path.join(VIDEO_DIR, `scene_${i}.mp4`);
    const fileExists = fs.existsSync(outputPath);
    
    // Only fetch if the file is missing from disk or we don't have a bg_video assigned
    if ((!scene.bg_video || !fileExists) && scene.asset_query) {
      console.log(`[SEARCH] Looking for video: "${scene.asset_query}" (Scene ${i})`);
      const videoUrl = await fetchPixabayVideo(scene.asset_query);
      
      if (videoUrl) {
        if (!fileExists) {
          console.log(`[DOWNLOAD] Downloading to ${path.basename(outputPath)}...`);
          try {
            await downloadVideo(videoUrl, outputPath);
            scene.bg_video = `assets/stock/scene_${i}.mp4`;
          } catch(err) {
            console.error(`[ERROR] Failed to download video: ${err.message}`);
            delete scene.bg_video; // remove mapping on fail
          }
        } else {
          console.log(`[SKIP] Video already exists: ${path.basename(outputPath)}`);
          scene.bg_video = `assets/stock/scene_${i}.mp4`;
        }
      } else {
        console.log(`[FALLBACK] No video found or no API key for "${scene.asset_query}". Using generic fallback.`);
        delete scene.bg_video; // fallback to bg_image by deleting bg_video
      }
    } else if (!fileExists && scene.bg_video) {
        // If script has a video set but file is missing and no asset query context to fetch it, clean it up
        delete scene.bg_video;
    }
  }

  // Save the modified script.json with new bg_video paths mapped
  fs.writeFileSync(SCRIPT_PATH, JSON.stringify(scriptData, null, 2), 'utf8');
  console.log('[SUCCESS] Pixabay asset metadata updated in script.json');
}

main().catch(console.error);
