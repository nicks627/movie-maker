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
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\quant_7_stages_1775560857232.png', name: 'quant_7_stages.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\overfitting_trap_1775560882720.png', name: 'overfitting_trap.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\walk_forward_1775560895651.png', name: 'walk_forward.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\kelly_criterion_1775560910254.png', name: 'kelly_criterion.png' },
    { src: 'C:\\Users\\taipo\\.gemini\\antigravity\\brain\\b2a2b67e-b351-4f41-b712-e185d4760828\\bionic_trader_1775555599859.png', name: 'bionic_trader.png' }
];

images.forEach(img => {
    if (fs.existsSync(img.src)) {
        fs.copyFileSync(img.src, path.join(destImagesDir, img.name));
    }
});

const data = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));

const topicMapLong = [
    { start: 0, end: 5, mode: 'popup', image: '' }, 
    { start: 6, end: 15, mode: 'bg', image: 'assets/images/generated/quant_7_stages.png' },
    { start: 16, end: 20, mode: 'bg', image: 'assets/images/generated/overfitting_trap.png' },
    { start: 21, end: 27, mode: 'bg', image: 'assets/images/generated/walk_forward.png' },
    { start: 28, end: 38, mode: 'bg', image: 'assets/images/generated/kelly_criterion.png' },
    { start: 39, end: 50, mode: 'bg', image: 'assets/images/generated/bionic_trader.png' },
    { start: 51, end: 999, mode: 'popup', image: '' }
];

const topicMapShort = [
    { start: 0, end: 2, mode: 'popup', image: '' },
    { start: 3, end: 4, mode: 'bg', image: 'assets/images/generated/quant_7_stages.png' },
    { start: 5, end: 6, mode: 'bg', image: 'assets/images/generated/overfitting_trap.png' },
    { start: 7, end: 8, mode: 'bg', image: 'assets/images/generated/walk_forward.png' },
    { start: 9, end: 10, mode: 'bg', image: 'assets/images/generated/kelly_criterion.png' },
    { start: 11, end: 999, mode: 'popup', image: '' }
];

function applyRules(scenes, topicMap) {
    if (!scenes) return;
    
    let currentTopicIndex = -1;

    for (let i = 0; i < scenes.length; i++) {
        let scene = scenes[i];
        
        // Find which topic block this scene belongs to
        const topic = topicMap.find(t => i >= t.start && i <= t.end) || { mode: 'popup', image: '' };
        
        if (topic.mode === 'bg') {
            // STRICT MODE: If BG, then every scene in this topic has the BG image.
            scene.bg_image = topic.image;
            if (scene.popups && scene.popups.length > 0) {
                // Keep popups highly intentional: only if they are much shorter than the full scene,
                // implying the user explicitly set them for a short explanation window.
                scene.popups = scene.popups.filter(p => p.duration && p.duration < scene.duration - 10);
            }
        } else if (topic.mode === 'popup') {
            // STRICT MODE: If Popup, then NO BG IMAGE.
            scene.bg_image = '';
            
            // Popups are allowed to stay if defined in the script. Remotion clears them automatically each scene unless merged.
            // But if a popup spans multiple topics, or is lingering without being spoken about, Remotion handles scene isolation.
            // But we ensure bg_image is strictly empty.
        }
    }
}

['long', 'short'].forEach(variant => {
    if (data[variant] && data[variant].scenes) {
        applyRules(data[variant].scenes, variant === 'long' ? topicMapLong : topicMapShort);
    }
});

fs.writeFileSync(scriptPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully enforced visual rules on script.json.');
