@echo off
call .venv\Scripts\activate.bat
node generate_script_first_principles.js
npm run se:assign
node fetch-pixabay-assets.mjs
node generate-voices.mjs --variant long --force
node scripts\render-video.mjs --variant long --output out-terafab_first_principles.mp4
