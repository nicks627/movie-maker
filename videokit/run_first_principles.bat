@echo off
node scripts/build-terafab-video.mjs
npm run se:assign
node fetch-pixabay-assets.mjs
node generate-voices.mjs --variant long --force
node generate-voices.mjs --variant short --force
npm run render:long -- --output out-terafab_first_principles_long.mp4
npm run render:short -- --output out-terafab_first_principles_short.mp4
