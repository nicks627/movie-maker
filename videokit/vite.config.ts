import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { loadLocalEnv, resolveCommandOrPath, isPathLike } from './scripts/env-utils.mjs';
import { normalizeSpeechText } from './scripts/text-normalization.mjs';

loadLocalEnv();

const projectPython = path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe');
const configuredPython = resolveCommandOrPath(process.env.PYTHON_BIN, process.cwd());
const resolvePythonBinary = () => {
  if (configuredPython && (!isPathLike(configuredPython) || fs.existsSync(configuredPython))) {
    return configuredPython;
  }
  return fs.existsSync(projectPython) ? projectPython : 'python';
};
const MATERIAL_LIBRARY_DIRS = {
  stock: path.resolve(process.cwd(), 'public', 'assets', 'stock'),
  image: path.resolve(process.cwd(), 'public', 'assets', 'images'),
  bgm: path.resolve(process.cwd(), 'public', 'assets', 'bgm'),
} as const;
const MATERIAL_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const MATERIAL_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v']);
const MATERIAL_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);

type MaterialLibraryCategory = keyof typeof MATERIAL_LIBRARY_DIRS;

const ensureDirectory = (directory: string) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const toPosixPath = (value: string) => value.replace(/\\/g, '/');

const sanitizeMaterialFileName = (fileName: string) => {
  const parsed = path.parse(path.basename(fileName));
  const safeBase =
    parsed.name
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'asset';
  return `${safeBase}${parsed.ext.toLowerCase()}`;
};

const createUniqueMaterialPath = (directory: string, fileName: string) => {
  const sanitized = sanitizeMaterialFileName(fileName);
  let candidate = sanitized;
  let candidatePath = path.join(directory, candidate);

  if (!fs.existsSync(candidatePath)) {
    return { fileName: candidate, filePath: candidatePath };
  }

  const parsed = path.parse(sanitized);
  candidate = `${parsed.name}-${Date.now()}${parsed.ext}`;
  candidatePath = path.join(directory, candidate);
  return { fileName: candidate, filePath: candidatePath };
};

const getMaterialKind = (fileName: string) => {
  const extension = path.extname(fileName).toLowerCase();
  if (MATERIAL_IMAGE_EXTENSIONS.has(extension)) {
    return 'image' as const;
  }
  if (MATERIAL_VIDEO_EXTENSIONS.has(extension)) {
    return 'video' as const;
  }
  if (MATERIAL_AUDIO_EXTENSIONS.has(extension)) {
    return 'audio' as const;
  }
  return null;
};

const buildMaterialItem = (category: MaterialLibraryCategory, fileName: string) => {
  const kind = getMaterialKind(fileName);
  if (!kind) {
    return null;
  }

  if (category === 'image' && kind !== 'image') {
    return null;
  }
  if (category === 'bgm' && kind !== 'audio') {
    return null;
  }

  const relativePath = toPosixPath(
    path.join(
      'assets',
      category === 'stock' ? 'stock' : category === 'image' ? 'images' : 'bgm',
      fileName,
    ),
  );
  const title = path
    .parse(fileName)
    .name
    .replace(/[-_]+/g, ' ')
    .trim() || 'Untitled';

  if (category === 'stock') {
    return {
      id: `${category}:${fileName}`,
      title,
      type: 'bg' as const,
      kind,
      bg_image: kind === 'image' ? relativePath : undefined,
      bg_video: kind === 'video' ? relativePath : undefined,
      previewSrc: relativePath,
    };
  }

  if (category === 'bgm') {
    return {
      id: `${category}:${fileName}`,
      title,
      type: 'bgm' as const,
      kind: 'audio' as const,
      bgmFile: fileName,
      previewSrc: relativePath,
    };
  }

  return {
    id: `${category}:${fileName}`,
    title,
    type: 'image' as const,
    kind: 'image' as const,
    image: relativePath,
    previewSrc: relativePath,
  };
};

// Custom Vite plugin: saves uploaded WAV files to public/voices/
function voiceSaverPlugin(): Plugin {
  return {
    name: 'voice-saver',
    configureServer(server) {
      server.middlewares.use('/api/save-voice', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const filename = (req.headers['x-filename'] as string) || 'unknown.wav';
            const safeName = path.basename(filename);
            const voicesDir = path.resolve(process.cwd(), 'public', 'voices');
            if (!fs.existsSync(voicesDir)) {
              fs.mkdirSync(voicesDir, { recursive: true });
            }
            const filePath = path.join(voicesDir, safeName);
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(filePath, buffer);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, path: filePath, size: buffer.length }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });
    },
  };
}

function materialsLibraryPlugin(): Plugin {
  return {
    name: 'materials-library',
    configureServer(server) {
      server.middlewares.use('/api/materials/list', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const url = new URL(req.url || '', 'http://localhost');
          const category = url.searchParams.get('category') as MaterialLibraryCategory | null;
          if (!category || !(category in MATERIAL_LIBRARY_DIRS)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'Invalid category' }));
            return;
          }

          const directory = MATERIAL_LIBRARY_DIRS[category];
          ensureDirectory(directory);

          const items = fs
            .readdirSync(directory, { withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => buildMaterialItem(category, entry.name))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .sort((a, b) => a.title.localeCompare(b.title, 'ja'));

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              ok: true,
              directory: toPosixPath(path.relative(process.cwd(), directory)),
              items,
            }),
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });

      server.middlewares.use('/api/materials/upload', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const url = new URL(req.url || '', 'http://localhost');
        const category = url.searchParams.get('category') as MaterialLibraryCategory | null;
        const originalFileName = url.searchParams.get('filename');

        if (!category || !(category in MATERIAL_LIBRARY_DIRS) || !originalFileName) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: 'Missing category or filename' }));
          return;
        }

        const materialKind = getMaterialKind(originalFileName);
        const isValidForCategory =
          category === 'stock'
            ? materialKind === 'image' || materialKind === 'video'
            : category === 'image'
              ? materialKind === 'image'
              : materialKind === 'audio';

        if (!materialKind || !isValidForCategory) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: 'Unsupported file type for this library' }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const directory = MATERIAL_LIBRARY_DIRS[category];
            ensureDirectory(directory);

            const target = createUniqueMaterialPath(directory, originalFileName);
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(target.filePath, buffer);

            const item = buildMaterialItem(category, target.fileName);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                directory: toPosixPath(path.relative(process.cwd(), directory)),
                item,
              }),
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });
    },
  };
}

// Proxy search requests to stock APIs (avoids CORS)
function stockSearchProxyPlugin(): Plugin {
  return {
    name: 'stock-search-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy-search', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const targetUrl = url.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'MovieMaker/1.0',
              // Forward authorization header if present
              ...(req.headers['x-api-auth'] ? { 'Authorization': req.headers['x-api-auth'] as string } : {}),
            },
          });
          const data = await response.text();
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = response.status;
          res.end(data);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Download stock file to public/assets/stock/
      server.middlewares.use('/api/download-stock', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { url, filename } = body;
            if (!url || !filename) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing url or filename' }));
              return;
            }

            const stockDir = path.resolve(process.cwd(), 'public', 'assets', 'stock');
            if (!fs.existsSync(stockDir)) {
              fs.mkdirSync(stockDir, { recursive: true });
            }

            const safeName = path.basename(filename);
            const filePath = path.join(stockDir, safeName);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, path: `assets/stock/${safeName}`, size: arrayBuffer.byteLength }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });

      // Save script.json directly
      server.middlewares.use('/api/save-script', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString();
            // Validate it's JSON
            JSON.parse(body);
            
            const scriptPath = path.resolve(process.cwd(), 'src', 'data', 'script.json');
            fs.writeFileSync(scriptPath, body, 'utf8');
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });
    },
  };
}

// VOICEVOX Core generation plugin
function voicevoxCorePlugin(): Plugin {
  return {
    name: 'voicevox-core-generator',
    configureServer(server) {
      server.middlewares.use('/api/generate-voicevox-core', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { text, params, outputFilename } = body;
            const speechText = normalizeSpeechText(text);

            if (!text || !params || !outputFilename) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing parameters' }));
              return;
            }

            const voicesDir = path.resolve(process.cwd(), 'public', 'voices');
            if (!fs.existsSync(voicesDir)) {
              fs.mkdirSync(voicesDir, { recursive: true });
            }
            const outputPath = path.join(voicesDir, path.basename(outputFilename));

            const { spawn } = require('node:child_process');
            const pythonProcess = spawn(resolvePythonBinary(), [
              'scripts/voicevox_core_bridge.py',
              outputPath,
              speechText,
              JSON.stringify(params),
            ], {
              cwd: process.cwd(),
            });

            let stderr = '';
            pythonProcess.stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });

            pythonProcess.on('close', (code: number) => {
              if (code === 0) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({ ok: true, path: `voices/${path.basename(outputFilename)}` }));
              } else {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: stderr || `Python process exited with code ${code}` }));
              }
            });
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message })); 
          }
        });
      });
    }
  };
}

// AquesTalk generation plugin
function aquestalkPlugin(): Plugin {
  return {
    name: 'aquestalk-generator',
    configureServer(server) {
      server.middlewares.use('/api/generate-aquestalk', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { text, params, outputFilename } = body;
            const speechText = normalizeSpeechText(text);
            
            if (!text || !params || !outputFilename) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing parameters' }));
              return;
            }

            const voicesDir = path.resolve(process.cwd(), 'public', 'voices');
            if (!fs.existsSync(voicesDir)) {
              fs.mkdirSync(voicesDir, { recursive: true });
            }
            const outputPath = path.join(voicesDir, outputFilename);
            
            // Execute Python bridge
            const { spawn } = require('node:child_process');
            const pythonProcess = spawn(resolvePythonBinary(), [
              'scripts/aquestalk_bridge.py',
              outputPath,
              speechText,
              JSON.stringify(params)
            ], {
              cwd: process.cwd(),
            });

            let stderr = '';
            pythonProcess.stderr.on('data', (data: any) => {
              stderr += data.toString();
            });

            pythonProcess.on('close', (code: number) => {
              if (code === 0) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({ ok: true, path: `voices/${outputFilename}` }));
              } else {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: stderr || `Python process exited with code ${code}` }));
              }
            });
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    voiceSaverPlugin(),
    materialsLibraryPlugin(),
    stockSearchProxyPlugin(),
    voicevoxCorePlugin(),
    aquestalkPlugin(),
  ],
  define: {
    // Remotion relies on process.env in some places
    'process.env.REMOTION_ENV': JSON.stringify('development')
  },
  server: {
    port: 5173,
    open: true
  }
});
