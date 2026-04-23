import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const scriptPath = path.join(rootDir, 'src', 'data', 'script.json');
const destImagesDir = path.join(rootDir, 'public', 'assets', 'images', 'generated');

if (!fs.existsSync(destImagesDir)) {
    fs.mkdirSync(destImagesDir, { recursive: true });
}

// Artifact images to copy
const images = [
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\quant_7_stages_portrait_1775561530638.png', name: 'quant_7_stages_portrait.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\overfitting_trap_portrait_1775561488285.png', name: 'overfitting_trap_portrait.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\walk_forward_portrait_1775561572655.png', name: 'walk_forward_portrait.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\kelly_criterion_portrait_1775561549902.png', name: 'kelly_criterion_portrait.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\bionic_trader_portrait_1775561502874.png', name: 'bionic_trader_portrait.png' }
];

images.forEach(img => {
    if (fs.existsSync(img.src)) {
        fs.copyFileSync(img.src, path.join(destImagesDir, img.name));
    }
});

const data = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));

const topicMapShort = [
    { start: 0, end: 1, mode: 'popup', image: '' },
    { start: 2, end: 2, mode: 'bg', image: 'assets/images/generated/quant_7_stages_portrait.png' },
    { start: 3, end: 3, mode: 'bg', image: 'assets/images/generated/overfitting_trap_portrait.png' },
    { start: 4, end: 5, mode: 'bg', image: 'assets/images/generated/walk_forward_portrait.png' },
    { start: 6, end: 6, mode: 'bg', image: 'assets/images/generated/kelly_criterion_portrait.png' },
    { start: 7, end: 7, mode: 'bg', image: 'assets/images/generated/bionic_trader_portrait.png' },
    { start: 8, end: 999, mode: 'popup', image: '' }
];

function applyRules(scenes, topicMap) {
    if (!scenes) return;

    for (let i = 0; i < scenes.length; i++) {
        let scene = scenes[i];
        
        const topic = topicMap.find(t => i >= t.start && i <= t.end) || { mode: 'popup', image: '' };
        
        if (topic.mode === 'bg') {
            scene.bg_image = topic.image;
            if (scene.popups && scene.popups.length > 0) {
                scene.popups = []; 
            }
        } else if (topic.mode === 'popup') {
            scene.bg_image = '';
        }
    }
}

// ONLY APPLY TO SHORT!
if (data['short'] && data['short'].scenes) {
    applyRules(data['short'].scenes, topicMapShort);
}

fs.writeFileSync(scriptPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully enforced visual rules on short variant.');
