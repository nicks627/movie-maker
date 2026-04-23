import React, { useEffect, useRef, useState } from 'react';
import { Clip } from '../types';
import { getSpeakerMeta, isLeftSpeaker, SPEAKER_OPTIONS } from '../voice/speakers';

interface MaterialsSidebarProps {
  clips: Clip[];
  currentFrame: number;
  selectedClipId: string | null;
  selectedLayer: number;
  numLayers: number;
  onAddClip: (clip: Clip) => void;
}

type MaterialLibraryCategory = 'stock' | 'image' | 'bgm';
type MaterialsTab = 'project' | 'stock' | 'image' | 'bgm' | 'quick';
type DragTarget = MaterialLibraryCategory | 'project' | null;

type MaterialLibraryItem = {
  id: string;
  title: string;
  type: 'bg' | 'image' | 'bgm';
  kind: 'image' | 'video' | 'audio';
  bg_image?: string;
  bg_video?: string;
  image?: string;
  bgmFile?: string;
  previewSrc: string;
};

type MaterialLibraryResponse = {
  directory?: string;
  items?: MaterialLibraryItem[];
  error?: string;
};

const QUICK_SPEAKERS = SPEAKER_OPTIONS.filter((speaker) => speaker.quickAdd);
const MATERIAL_DIRECTORIES: Record<MaterialLibraryCategory, string> = {
  stock: 'public/assets/stock',
  image: 'public/assets/images',
  bgm: 'public/assets/bgm',
};
const MATERIAL_ACCEPT: Record<MaterialLibraryCategory, string> = {
  stock: 'image/*,video/*',
  image: 'image/*',
  bgm: 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac',
};
const THEME_CLASSES: Record<string, { surface: string; border: string; icon: string; text: string }> = {
  rose: { surface: 'bg-rose-500/5 hover:bg-rose-500/10', border: 'border-rose-500/20', icon: 'bg-rose-500/20', text: 'text-rose-300' },
  emerald: { surface: 'bg-emerald-500/5 hover:bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'bg-emerald-500/20', text: 'text-emerald-300' },
  amber: { surface: 'bg-amber-500/5 hover:bg-amber-500/10', border: 'border-amber-500/20', icon: 'bg-amber-500/20', text: 'text-amber-300' },
  red: { surface: 'bg-red-500/5 hover:bg-red-500/10', border: 'border-red-500/20', icon: 'bg-red-500/20', text: 'text-red-300' },
  yellow: { surface: 'bg-yellow-500/5 hover:bg-yellow-500/10', border: 'border-yellow-500/20', icon: 'bg-yellow-500/20', text: 'text-yellow-300' },
  violet: { surface: 'bg-violet-500/5 hover:bg-violet-500/10', border: 'border-violet-500/20', icon: 'bg-violet-500/20', text: 'text-violet-300' },
  sky: { surface: 'bg-sky-500/5 hover:bg-sky-500/10', border: 'border-sky-500/20', icon: 'bg-sky-500/20', text: 'text-sky-300' },
  cyan: { surface: 'bg-cyan-500/5 hover:bg-cyan-500/10', border: 'border-cyan-500/20', icon: 'bg-cyan-500/20', text: 'text-cyan-300' },
  lime: { surface: 'bg-lime-500/5 hover:bg-lime-500/10', border: 'border-lime-500/20', icon: 'bg-lime-500/20', text: 'text-lime-300' },
  indigo: { surface: 'bg-indigo-500/5 hover:bg-indigo-500/10', border: 'border-indigo-500/20', icon: 'bg-indigo-500/20', text: 'text-indigo-300' },
  pink: { surface: 'bg-pink-500/5 hover:bg-pink-500/10', border: 'border-pink-500/20', icon: 'bg-pink-500/20', text: 'text-pink-300' },
  slate: { surface: 'bg-slate-500/5 hover:bg-slate-500/10', border: 'border-slate-500/20', icon: 'bg-slate-500/20', text: 'text-slate-300' },
};
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']);

const readJsonSafely = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getFileExtension = (fileName: string) => {
  const pieces = fileName.toLowerCase().split('.');
  return pieces.length > 1 ? pieces[pieces.length - 1] ?? '' : '';
};

const detectProjectTarget = (file: File): MaterialLibraryCategory | null => {
  if (file.type.startsWith('video/')) {
    return 'stock';
  }

  if (file.type.startsWith('image/')) {
    return 'image';
  }

  if (file.type.startsWith('audio/')) {
    return 'bgm';
  }

  const extension = getFileExtension(file.name);
  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'stock';
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (AUDIO_EXTENSIONS.has(extension)) {
    return 'bgm';
  }

  return null;
};

export const MaterialsSidebar: React.FC<MaterialsSidebarProps> = ({
  clips,
  currentFrame,
  numLayers,
  onAddClip,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<MaterialsTab>('quick');
  const [materialItems, setMaterialItems] = useState<Record<MaterialLibraryCategory, MaterialLibraryItem[]>>({
    stock: [],
    image: [],
    bgm: [],
  });
  const [materialDirectories, setMaterialDirectories] = useState<Record<MaterialLibraryCategory, string>>(MATERIAL_DIRECTORIES);
  const [loadingState, setLoadingState] = useState<Record<MaterialLibraryCategory, boolean>>({
    stock: false,
    image: false,
    bgm: false,
  });
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const stockFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const bgmFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const refreshMaterials = async (category: MaterialLibraryCategory) => {
    setLoadingState((current) => ({ ...current, [category]: true }));
    try {
      const response = await fetch(`/api/materials/list?category=${category}`);
      const data = (await readJsonSafely(response)) as MaterialLibraryResponse | null;

      if (!response.ok || !data) {
        throw new Error(data?.error || `Failed to load ${category} materials`);
      }

      setMaterialItems((current) => ({
        ...current,
        [category]: data.items ?? [],
      }));

      if (data.directory) {
        setMaterialDirectories((current) => ({
          ...current,
          [category]: data.directory,
        }));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to load ${category} materials`);
    } finally {
      setLoadingState((current) => ({ ...current, [category]: false }));
    }
  };

  useEffect(() => {
    void Promise.all([refreshMaterials('stock'), refreshMaterials('image'), refreshMaterials('bgm')]);
  }, []);

  const handleAddVoice = (speaker: string | 'custom') => {
    const id = `voice_${speaker}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const speakerMeta = speaker === 'custom' ? null : getSpeakerMeta(speaker);
    const newClip: Clip = {
      id,
      type: 'voice',
      layer: speakerMeta && isLeftSpeaker(speaker) ? 1 : 0,
      startTime: currentFrame,
      duration: 60,
      speaker: speaker === 'custom' ? undefined : speaker,
      text: speaker === 'custom' ? '(Custom Audio)' : 'ここにセリフを入力',
      emotion: speakerMeta?.defaultEmotion ?? '普通',
      voiceType: speaker === 'custom' ? 'original' : 'original',
      voiceFile: `${id}.wav`,
      fadeInDuration: 5,
      fadeOutDuration: 5,
      speedScale: 1.0,
      pitchScale: 0,
      intonationScale: 1.0,
      volumeScale: 1.0,
    };
    onAddClip(newClip);
  };

  const handleAddAsset = (item: MaterialLibraryItem) => {
    const id = `${item.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newClip: Clip = {
      id,
      type: item.type,
      startTime: currentFrame,
      duration: item.type === 'bgm' ? 300 : 150,
      layer: item.type === 'bg' ? 3 : item.type === 'bgm' ? numLayers - 1 : 4,
      bg_image: item.bg_image,
      bg_video: item.bg_video,
      image: item.image,
      bgmFile: item.bgmFile,
    };
    onAddClip(newClip);
  };

  const onDragStart = (e: React.DragEvent, item: MaterialLibraryItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const uploadFile = async (file: File, category: MaterialLibraryCategory) => {
    const response = await fetch(
      `/api/materials/upload?category=${category}&filename=${encodeURIComponent(file.name)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      },
    );

    const data = (await readJsonSafely(response)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(data?.error || `Failed to upload ${file.name}`);
    }
  };

  const uploadToCategory = async (files: File[], category: MaterialLibraryCategory) => {
    if (!files.length) {
      return;
    }

    setErrorMessage(null);
    setFeedback(`Uploading ${files.length} file(s) to ${materialDirectories[category]}...`);

    for (const file of files) {
      await uploadFile(file, category);
    }

    await refreshMaterials(category);
    setFeedback(`${files.length} file(s) added to ${materialDirectories[category]}.`);
  };

  const handleCategoryInput = async (
    event: React.ChangeEvent<HTMLInputElement>,
    category: MaterialLibraryCategory,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await uploadToCategory(files, category);
  };

  const handleProjectUpload = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    const stockFiles: File[] = [];
    const imageFiles: File[] = [];
    const bgmFiles: File[] = [];
    const rejectedFiles: string[] = [];

    files.forEach((file) => {
      const target = detectProjectTarget(file);
      if (target === 'stock') {
        stockFiles.push(file);
        return;
      }

      if (target === 'image') {
        imageFiles.push(file);
        return;
      }

      if (target === 'bgm') {
        bgmFiles.push(file);
        return;
      }

      rejectedFiles.push(file.name);
    });

    try {
      if (stockFiles.length) {
        await uploadToCategory(stockFiles, 'stock');
      }
      if (imageFiles.length) {
        await uploadToCategory(imageFiles, 'image');
      }
      if (bgmFiles.length) {
        await uploadToCategory(bgmFiles, 'bgm');
      }

      if (!stockFiles.length && !imageFiles.length && !bgmFiles.length) {
        setErrorMessage('Supported files are images, videos, and audio.');
        return;
      }

      const importedCount = stockFiles.length + imageFiles.length + bgmFiles.length;
      const summary = [`${importedCount} file(s) imported`];
      if (stockFiles.length) {
        summary.push(`${stockFiles.length} to ${materialDirectories.stock}`);
      }
      if (imageFiles.length) {
        summary.push(`${imageFiles.length} to ${materialDirectories.image}`);
      }
      if (bgmFiles.length) {
        summary.push(`${bgmFiles.length} to ${materialDirectories.bgm}`);
      }
      setFeedback(summary.join(' / '));

      if (rejectedFiles.length) {
        setErrorMessage(`Skipped unsupported files: ${rejectedFiles.join(', ')}`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import files');
    }
  };

  const handleProjectInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await handleProjectUpload(files);
  };

  const filteredStock = materialItems.stock.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredImages = materialItems.image.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredBgm = materialItems.bgm.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const renderLibraryDropzone = (
    category: MaterialLibraryCategory,
    description: string,
    actionLabel: string,
  ) => {
    const isActive = dragTarget === category;
    return (
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragTarget(category);
        }}
        onDragLeave={() => {
          if (dragTarget === category) {
            setDragTarget(null);
          }
        }}
        onDrop={async (event) => {
          event.preventDefault();
          setDragTarget(null);
          await uploadToCategory(Array.from(event.dataTransfer.files ?? []), category);
        }}
        className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
          isActive
            ? 'border-indigo-400 bg-indigo-500/10 text-indigo-200'
            : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-indigo-500/30 hover:bg-indigo-500/5'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-lg flex-shrink-0">
            {category === 'stock' ? '🎬' : category === 'image' ? '🖼️' : '🎵'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-1">
              {actionLabel}
            </div>
            <div className="text-[10px] leading-relaxed text-slate-400 mb-2">
              {description}
            </div>
            <div className="text-[9px] text-indigo-300/80 font-mono mb-3">
              {materialDirectories[category]}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  (
                    category === 'stock'
                      ? stockFileInputRef.current
                      : category === 'image'
                        ? imageFileInputRef.current
                        : bgmFileInputRef.current
                  )?.click()
                }
                className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-[10px] font-bold text-indigo-200 transition-colors"
              >
                Choose Files
              </button>
              <span className="text-[9px] text-slate-500">Drag and drop is supported</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFolderContents = (
    category: MaterialLibraryCategory,
    items: MaterialLibraryItem[],
  ) => {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-950/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-950/40">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Folder Contents
            </div>
            <div className="text-[9px] text-slate-500 mt-1">{materialDirectories[category]}</div>
          </div>
          <div className="text-[9px] font-bold text-indigo-300">{items.length} files</div>
        </div>

        <div className="max-h-56 overflow-y-auto custom-scrollbar">
          {items.length ? (
            items.map((item) => {
              const fileName = item.previewSrc.split('/').pop() ?? item.title;
              const kindLabel =
                category === 'stock'
                  ? item.kind === 'video'
                    ? 'VIDEO'
                    : 'BACKGROUND'
                  : category === 'image'
                    ? 'IMAGE'
                    : 'AUDIO';

              return (
                <div
                  key={`${item.id}-file`}
                  draggable
                  onDragStart={(event) => onDragStart(event, item)}
                  onClick={() => handleAddAsset(item)}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all cursor-grab"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-[10px] font-black text-indigo-200 flex-shrink-0">
                    {item.kind === 'video' ? 'VID' : item.kind === 'audio' ? 'BGM' : 'IMG'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-white truncate">{fileName}</div>
                    <div className="text-[9px] text-slate-500 truncate">{kindLabel}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAddAsset(item);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-bold text-indigo-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-6 text-[10px] text-slate-500">
              No files in this folder yet.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-white/5 overflow-hidden">
      <input
        type="file"
        ref={stockFileInputRef}
        className="hidden"
        accept={MATERIAL_ACCEPT.stock}
        multiple
        onChange={(event) => {
          void handleCategoryInput(event, 'stock');
        }}
      />
      <input
        type="file"
        ref={imageFileInputRef}
        className="hidden"
        accept={MATERIAL_ACCEPT.image}
        multiple
        onChange={(event) => {
          void handleCategoryInput(event, 'image');
        }}
      />
      <input
        type="file"
        ref={bgmFileInputRef}
        className="hidden"
        accept={MATERIAL_ACCEPT.bgm}
        multiple
        onChange={(event) => {
          void handleCategoryInput(event, 'bgm');
        }}
      />
      <input
        type="file"
        ref={projectFileInputRef}
        className="hidden"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={(event) => {
          void handleProjectInput(event);
        }}
      />

      <div className="p-4 bg-slate-950/20">
        <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">
          Assets Material
        </h2>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full bg-slate-950/60 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-[11px] text-white outline-none focus:border-indigo-500/30 transition-all font-medium"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
        </div>

        <div className="flex p-0.5 bg-slate-950/40 rounded-lg gap-0.5 border border-white/5">
          {(['quick', 'stock', 'image', 'bgm', 'project'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all ${
                activeTab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {feedback && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[10px] text-emerald-200">
            {feedback}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[10px] text-rose-200">
            {errorMessage}
          </div>
        )}

        {activeTab === 'quick' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_SPEAKERS.map((speaker) => {
                const theme = THEME_CLASSES[speaker.theme] ?? THEME_CLASSES.indigo;
                return (
                  <button
                    key={speaker.key}
                    onClick={() => handleAddVoice(speaker.key)}
                    className={`flex flex-col items-center gap-2 p-3 ${theme.surface} border ${theme.border} rounded-xl transition-all group active:scale-[0.98]`}
                  >
                    <div className={`w-10 h-10 ${theme.icon} rounded-lg flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform`}>
                      {speaker.emoji}
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] font-bold ${theme.text}`}>{speaker.quickLabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handleAddVoice('custom')}
              className="w-full flex items-center justify-center gap-3 p-3 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl transition-all group active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-sm shadow-inner group-hover:rotate-12 transition-transform">📁</div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">Custom Audio</div>
                <div className="text-[9px] text-indigo-500/60 font-medium">Add external voice / BGM leak</div>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="space-y-4">
            {renderLibraryDropzone('stock', 'Background images and videos placed here will appear in STOCK.', 'Stock Library')}
            {renderFolderContents('stock', filteredStock)}

            {loadingState.stock ? (
              <div className="text-[10px] text-slate-500 px-1">Loading stock files...</div>
            ) : filteredStock.length ? (
              <div className="space-y-2">
                {filteredStock.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(event) => onDragStart(event, item)}
                    onClick={() => handleAddAsset(item)}
                    className="flex items-center gap-3 p-2 group cursor-grab hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all"
                  >
                    <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-950 flex-shrink-0 relative group-hover:scale-105 transition-transform">
                      {item.bg_image ? (
                        <img
                          src={`/${item.previewSrc}`}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                          alt={item.title}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-500/20 text-[10px] text-indigo-300">
                          VID
                        </div>
                      )}
                      {item.bg_video && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-glow" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-white truncate">{item.title}</div>
                      <div className="text-[9px] text-slate-500">{item.bg_video ? 'Video background' : 'Image background'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-slate-950/30 p-4 text-[10px] text-slate-500">
                No stock assets yet. Drop files into {materialDirectories.stock}.
              </div>
            )}
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-4">
            {renderLibraryDropzone('image', 'Popup images and overlays placed here will appear in IMAGE.', 'Image Library')}
            {renderFolderContents('image', filteredImages)}

            {loadingState.image ? (
              <div className="text-[10px] text-slate-500 px-1">Loading image files...</div>
            ) : filteredImages.length ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredImages.map((item) => {
                  const inUse = clips.some((clip) => clip.type === 'image' && clip.image === item.image);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, item)}
                      onClick={() => handleAddAsset(item)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-white/5 hover:border-indigo-500/40 group cursor-grab transition-all"
                    >
                      <img
                        src={`/${item.previewSrc}`}
                        className="w-full h-full object-contain p-2 opacity-70 group-hover:opacity-100 transition-opacity"
                        alt={item.title}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between gap-2">
                        <span className="text-[8px] font-bold text-slate-300 truncate">{item.title}</span>
                        {inUse && <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" title="In Use" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-slate-950/30 p-4 text-[10px] text-slate-500">
                No image assets yet. Drop files into {materialDirectories.image}.
              </div>
            )}
          </div>
        )}

        {activeTab === 'bgm' && (
          <div className="space-y-4">
            {renderLibraryDropzone('bgm', 'Music and ambience tracks placed here will appear in BGM.', 'BGM Library')}
            {renderFolderContents('bgm', filteredBgm)}

            {loadingState.bgm ? (
              <div className="text-[10px] text-slate-500 px-1">Loading BGM files...</div>
            ) : filteredBgm.length ? (
              <div className="space-y-2">
                {filteredBgm.map((item) => {
                  const inUse = clips.some((clip) => clip.type === 'bgm' && clip.bgmFile === item.bgmFile);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, item)}
                      onClick={() => handleAddAsset(item)}
                      className="flex items-center gap-3 p-3 group cursor-grab hover:bg-white/5 rounded-xl border border-white/5 hover:border-indigo-500/40 transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/25 via-cyan-500/15 to-slate-950 flex items-center justify-center text-sm font-black text-indigo-100 flex-shrink-0">
                        BGM
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-white truncate">{item.title}</div>
                        <div className="text-[9px] text-slate-500 truncate">{item.bgmFile}</div>
                      </div>
                      {inUse && (
                        <span className="px-2 py-1 rounded-lg bg-indigo-500/15 text-[8px] font-bold uppercase tracking-[0.15em] text-indigo-200">
                          In Use
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-slate-950/30 p-4 text-[10px] text-slate-500">
                No BGM assets yet. Drop files into {materialDirectories.bgm}.
              </div>
            )}
          </div>
        )}

        {activeTab === 'project' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-[9px] font-bold text-slate-600 mb-2 uppercase tracking-widest px-1 flex items-center justify-between">
                <span>Active Clips ({clips.length})</span>
                <button
                  onClick={() => projectFileInputRef.current?.click()}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Add More
                </button>
              </div>
              {clips.slice(0, 15).map((c) => (
                <div key={c.id} className="group flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-default">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.type === 'voice' ? 'bg-rose-500/40' : 'bg-indigo-500/40'}`} />
                  <div className="text-[10px] text-slate-400 truncate flex-1">{c.id}</div>
                </div>
              ))}
              {clips.length > 15 && <div className="text-[9px] text-center text-slate-700 py-2">... and {clips.length - 15} more</div>}
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragTarget('project');
              }}
              onDragLeave={() => {
                if (dragTarget === 'project') {
                  setDragTarget(null);
                }
              }}
              onDrop={async (event) => {
                event.preventDefault();
                setDragTarget(null);
                await handleProjectUpload(Array.from(event.dataTransfer.files ?? []));
              }}
              className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                dragTarget === 'project'
                  ? 'border-indigo-400 bg-indigo-500/10 text-indigo-200'
                  : 'border-white/5 text-slate-600 hover:bg-white/5 hover:text-slate-400'
              }`}
            >
              <span className="text-2xl">📥</span>
              <div className="text-[9px] font-bold uppercase tracking-widest">Drop files to import</div>
              <div className="text-[9px] text-center leading-relaxed max-w-[220px]">
                Videos go to {materialDirectories.stock}. Images go to {materialDirectories.image}. Audio goes to {materialDirectories.bgm}.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Tip */}
      <div className="p-4 border-t border-white/5 bg-slate-950/20">
        <div className="flex gap-2 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
          <span className="text-xs">✨</span>
          <p className="text-[9px] text-slate-500 leading-normal">
            Drag any asset directly onto a timeline layer to add it at the current frame.
          </p>
        </div>
      </div>
    </div>
  );
};
