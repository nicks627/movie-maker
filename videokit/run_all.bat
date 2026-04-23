@echo off
npm run se:assign
node fetch-pixabay-assets.mjs
node generate-voices.mjs --variant long --force
node scripts\render-video.mjs --variant long --output out-terafab-new.mp4
