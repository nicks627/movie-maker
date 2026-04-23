import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import {
  CHARACTER_BOX_HEIGHT_PCT,
  CHARACTER_BOX_WIDTH_PCT,
  CHARACTER_SCALE_MAX,
  CHARACTER_SCALE_MIN,
  getCharacterBoxSizePct,
  normalizeCharacterScale,
} from '../components/CharacterSkin';
import { getPopupLayoutBox } from '../components/popup-layout';
import { getAutoSubtitleSlot, getSubtitleLayoutDefaults } from '../components/subtitle-layout';
import { normalizeProjectScript } from '../script/normalize';
import { TemplateComposition } from '../templates/TemplateComposition';
import { getSpeakerMeta, isLeftSpeaker } from '../voice/speakers';
import { Timeline } from './Timeline';
import { PropertiesPanel } from './PropertiesPanel';
import { MaterialsSidebar } from './MaterialsSidebar';
import {
  resolveStarterDefinition,
  resolveStarterFromSearch,
  resolveStarterScriptData,
} from './starter-presets';
import { resolveEditorTemplateAdapter } from './template-adapters';

import { Clip, clipsToProjectData } from '../types';


const NUM_LAYERS = 8;
const SUBTITLE_MIN_WIDTH = 10;
const SUBTITLE_MIN_HEIGHT = 5;
const SUBTITLE_GAP = 1.5;
const SNAP_THRESHOLD = 1.5;
const CHARACTER_MIN_Y = 4;

type DragGuideState = {
  vertical: number | null;
  horizontal: number | null;
  hint: string | null;
};

type SubtitleRect = {
  left: number;
  bottom: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getInitialEditorVariant = (sourceScriptData: unknown): 'long' | 'short' => {
  if (typeof window !== 'undefined') {
    const requestedVariant = new URLSearchParams(window.location.search).get('variant');
    if (requestedVariant === 'short' || requestedVariant === 'long') {
      return requestedVariant;
    }
  }

  const activeVariant = (sourceScriptData as { activeVariant?: string }).activeVariant;
  const defaultVariant = (sourceScriptData as { project?: { defaultVariant?: string } }).project?.defaultVariant;
  return activeVariant === 'short' || defaultVariant === 'short' ? 'short' : 'long';
};

const clampSubtitleRect = (rect: SubtitleRect): SubtitleRect => ({
  left: clamp(rect.left, 0, Math.max(0, 100 - rect.width)),
  bottom: clamp(rect.bottom, 0, Math.max(0, 100 - rect.height)),
  width: clamp(rect.width, SUBTITLE_MIN_WIDTH, 100),
  height: clamp(rect.height, SUBTITLE_MIN_HEIGHT, 100),
});

const clampCharacterPosition = (x: number, y: number, scale?: number) => {
  const { width, height } = getCharacterBoxSizePct(scale);
  return {
    x: clamp(x, width / 2, 100 - width / 2),
    y: clamp(y, CHARACTER_MIN_Y, 100 - height),
  };
};

const getCharacterLayout = (clip: Clip) => {
  const defaultX = isLeftSpeaker(clip.speaker) ? 15 : 85;
  const defaultY = 10;
  const { width, height, scale } = getCharacterBoxSizePct(clip.characterScale);
  const clamped = clampCharacterPosition(
    clip.characterX ?? defaultX,
    clip.characterY ?? defaultY,
    clip.characterScale
  );

  return {
    x: clamped.x,
    y: clamped.y,
    width,
    height,
    scale,
  };
};

const subtitleRectsOverlap = (a: SubtitleRect, b: SubtitleRect, gap = 0) => (
  a.left < b.left + b.width + gap &&
  a.left + a.width + gap > b.left &&
  a.bottom < b.bottom + b.height + gap &&
  a.bottom + a.height + gap > b.bottom
);

const getPreviewSubtitleDefaults = (hasOverlap = false) =>
  getSubtitleLayoutDefaults({
    width: initialScriptConfig.output.width,
    height: initialScriptConfig.output.height,
    hasOverlap,
  });

const getPreviewSubtitleRect = (clip: Clip, autoLayout?: { x: number; y: number; width: number; height: number }): SubtitleRect => {
  const defaults = getPreviewSubtitleDefaults(false);
  const width = clip.subtitleWidth ?? autoLayout?.width ?? defaults.widthPct;
  const height = clip.subtitleHeight ?? autoLayout?.height ?? defaults.heightPct;
  const left = clip.subtitleX ?? autoLayout?.x ?? (50 - width / 2);
  const bottom = clip.subtitleY ?? autoLayout?.y ?? defaults.bottomPct;

  return { left, bottom, width, height };
};

const applySnapToSubtitleRect = (rect: SubtitleRect): { rect: SubtitleRect; guides: DragGuideState } => {
  const next = { ...rect };
  let vertical: number | null = null;
  let horizontal: number | null = null;
  let hint: string | null = null;
  const defaults = getPreviewSubtitleDefaults(false);

  const centerX = next.left + next.width / 2;
  if (Math.abs(centerX - 50) <= SNAP_THRESHOLD) {
    next.left = 50 - next.width / 2;
    vertical = 50;
    hint = 'Center snap';
  }

  if (Math.abs(next.bottom - defaults.bottomPct) <= SNAP_THRESHOLD) {
    next.bottom = defaults.bottomPct;
    horizontal = defaults.bottomPct;
    hint = hint ?? 'Baseline snap';
  }

  return { rect: next, guides: { vertical, horizontal, hint } };
};

const resolveSubtitleOverlap = (
  rect: SubtitleRect,
  occupied: SubtitleRect[]
): SubtitleRect => {
  let next = clampSubtitleRect(rect);
  const maxAttempts = occupied.length + 6;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const overlapping = occupied.find((other) => subtitleRectsOverlap(next, other, SUBTITLE_GAP));
    if (!overlapping) {
      return next;
    }

    const upwardBottom = overlapping.bottom + overlapping.height + SUBTITLE_GAP;
    if (upwardBottom + next.height <= 100) {
      next = clampSubtitleRect({ ...next, bottom: upwardBottom });
      continue;
    }

    const downwardBottom = overlapping.bottom - next.height - SUBTITLE_GAP;
    if (downwardBottom >= 0) {
      next = clampSubtitleRect({ ...next, bottom: downwardBottom });
      continue;
    }

    const rightLeft = overlapping.left + overlapping.width + SUBTITLE_GAP;
    if (rightLeft + next.width <= 100) {
      next = clampSubtitleRect({ ...next, left: rightLeft });
      continue;
    }

    const leftLeft = overlapping.left - next.width - SUBTITLE_GAP;
    if (leftLeft >= 0) {
      next = clampSubtitleRect({ ...next, left: leftLeft });
      continue;
    }

    return next;
  }

  return next;
};

const buildAutoSubtitleLayouts = (activeVoiceClips: Clip[]) => {
  const layoutMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  if (activeVoiceClips.length <= 1) {
    return layoutMap;
  }

  const autoVoiceClips = activeVoiceClips.filter((clip) => clip.subtitleX === undefined && clip.subtitleY === undefined);
  const groups = {
    left: autoVoiceClips.filter((clip) => isLeftSpeaker(clip.speaker)),
    right: autoVoiceClips.filter((clip) => !isLeftSpeaker(clip.speaker)),
  };

  const applyGroupLayout = (group: Clip[], side: 'left' | 'right') => {
    group
      .sort((a, b) => a.startTime - b.startTime)
      .forEach((clip, index) => {
        const slot = getAutoSubtitleSlot({
          width: initialScriptConfig.output.width,
          height: initialScriptConfig.output.height,
          side,
          index,
        });

        layoutMap.set(clip.id, {
          x: slot.x,
          y: slot.y,
          width: slot.width,
          height: slot.height,
        });
      });
  };

  applyGroupLayout(groups.left, 'left');
  applyGroupLayout(groups.right, 'right');

  return layoutMap;
};

const freezeVisibleAutoSubtitles = (clips: Clip[], frame: number) => {
  const activeVoiceClips = clips.filter(
    (clip) => clip.type === 'voice' && frame >= clip.startTime && frame < clip.startTime + clip.duration
  );
  const autoLayouts = buildAutoSubtitleLayouts(activeVoiceClips);

  return clips.map((clip) => {
    if (clip.type !== 'voice') {
      return clip;
    }

    if (!(frame >= clip.startTime && frame < clip.startTime + clip.duration)) {
      return clip;
    }

    if (
      clip.subtitleX !== undefined &&
      clip.subtitleY !== undefined &&
      clip.subtitleWidth !== undefined &&
      clip.subtitleHeight !== undefined
    ) {
      return clip;
    }

    const rect = getPreviewSubtitleRect(clip, autoLayouts.get(clip.id));
    return {
      ...clip,
      subtitleX: clip.subtitleX ?? Math.round(rect.left),
      subtitleY: clip.subtitleY ?? Math.round(rect.bottom),
      subtitleWidth: clip.subtitleWidth ?? Math.round(rect.width),
      subtitleHeight: clip.subtitleHeight ?? Math.round(rect.height),
    };
  });
};

const getDefaultSubtitleRectForNewVoice = (
  clip: Clip,
  clips: Clip[],
  frame: number
): SubtitleRect => {
  const activeVoiceClips = clips.filter(
    (existing) => existing.type === 'voice' && frame >= existing.startTime && frame < existing.startTime + existing.duration
  );
  const occupiedRects = activeVoiceClips.map((existing) => getPreviewSubtitleRect(existing));

  if (occupiedRects.length === 0) {
    const defaults = getPreviewSubtitleDefaults(false);
    return {
      left: 50 - defaults.widthPct / 2,
      bottom: defaults.bottomPct,
      width: defaults.widthPct,
      height: defaults.heightPct,
    };
  }

  const slot = getAutoSubtitleSlot({
    width: initialScriptConfig.output.width,
    height: initialScriptConfig.output.height,
    side: isLeftSpeaker(clip.speaker) ? 'left' : 'right',
    index: 0,
  });
  const baseRect: SubtitleRect = {
    left: slot.x,
    bottom: slot.y,
    width: slot.width,
    height: slot.height,
  };

  return resolveSubtitleOverlap(baseRect, occupiedRects);
};

const initialStarter = resolveStarterFromSearch(
  typeof window !== 'undefined' ? window.location.search : ''
);
const initialStarterDefinition = resolveStarterDefinition(initialStarter);
const initialSourceScriptData = resolveStarterScriptData(initialStarter);
const initialEditorVariant = getInitialEditorVariant(initialSourceScriptData);
const initialScriptConfig = normalizeProjectScript(initialSourceScriptData, initialEditorVariant, {
  forceVariant: true,
});
const initialEditorAdapter = resolveEditorTemplateAdapter(initialScriptConfig.props.template?.id);
const PREVIEW_FPS = initialScriptConfig.output.fps;

// ---- Initialize clips from legacy script.json ----
function initClips(): Clip[] {
  return initialEditorAdapter.createInitialClips(initialScriptConfig, NUM_LAYERS);
}




export const Editor: React.FC = () => {
  const currentVariant = initialScriptConfig.variant ?? 'long';
  const [clips, setClips] = useState<Clip[]>(initClips);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [scrollToFrame, setScrollToFrame] = useState<number | null>(null);
  const [numLayers, setNumLayers] = useState(NUM_LAYERS);
  const [editOverlayOpen, setEditOverlayOpen] = useState(false);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'char' | 'char_resize' | 'image_move' | 'img_nw' | 'img_ne' | 'img_sw' | 'img_se' | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0, clipX: 0, clipY: 0, clipW: 0, clipH: 0 });
  const [dragGuides, setDragGuides] = useState<DragGuideState>({ vertical: null, horizontal: null, hint: null });

  // Resizable panel states
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [propertiesWidth, setPropertiesWidth] = useState(360);
  const [timelineHeight, setTimelineHeight] = useState(320);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'properties' | 'timeline' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const playerRef = useRef<PlayerRef>(null);
  const selectedClip = clips.find(c => c.id === selectedClipId) ?? null;

  useEffect(() => {
    const id = setInterval(() => {
      const frame = playerRef.current?.getCurrentFrame();
      if (frame !== undefined && frame !== null) setCurrentFrame(frame);
    }, 33);
    return () => clearInterval(id);
  }, []);

  const resetDragState = useCallback(() => {
    setDraggingClipId(null);
    setDraggingHandle(null);
    setDragGuides({ vertical: null, horizontal: null, hint: null });
  }, []);

  const setEditLayoutMode = useCallback((open: boolean, hint?: string | null) => {
    setEditOverlayOpen(open);
    if (!open) {
      resetDragState();
      return;
    }
    setDragGuides({ vertical: null, horizontal: null, hint: hint ?? 'Layout edit opened' });
  }, [resetDragState]);

  const handleSeek = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  }, []);

  // Panel Resize Handlers
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isResizing) return;
      if (isResizing === 'sidebar') {
        setSidebarWidth(Math.max(200, Math.min(e.clientX, 600)));
      } else if (isResizing === 'properties') {
        setPropertiesWidth(Math.max(250, Math.min(window.innerWidth - e.clientX, 600)));
      } else if (isResizing === 'timeline') {
        setTimelineHeight(Math.max(150, Math.min(window.innerHeight - e.clientY, window.innerHeight * 0.7)));
      }
    };
    const handlePointerUp = () => setIsResizing(null);

    if (isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!editOverlayOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      setEditLayoutMode(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editOverlayOpen, setEditLayoutMode]);

  const totalFrames = React.useMemo(() => {
    if (clips.length === 0) {
      return initialScriptConfig.durationInFrames;
    }

    let max = 60;
    clips.forEach(c => {
      const end = c.startTime + c.duration;
      if (end > max) max = end;
    });
    return max + 60;
  }, [clips]);

  const inputProps = React.useMemo(
    () => initialEditorAdapter.buildPreviewProps(initialScriptConfig, clips),
    [clips]
  );

  const activeVoiceClips = React.useMemo(
    () => clips.filter((c) => c.type === 'voice' && currentFrame >= c.startTime && currentFrame < c.startTime + c.duration),
    [clips, currentFrame]
  );

  const activeCharacterClips = React.useMemo(() => {
    const latestBySpeaker = new Map<string, Clip>();
    activeVoiceClips.forEach((clip) => {
      if (clip.characterVisible === false) {
        return;
      }
      const speakerKey = clip.speaker ?? 'unknown';
      const previous = latestBySpeaker.get(speakerKey);
      if (!previous || clip.startTime >= previous.startTime) {
        latestBySpeaker.set(speakerKey, clip);
      }
    });
    return Array.from(latestBySpeaker.values());
  }, [activeVoiceClips]);

  const previewSubtitleLayouts = React.useMemo(() => {
    return buildAutoSubtitleLayouts(activeVoiceClips);
  }, [activeVoiceClips]);

  const handleSelectClip = useCallback((id: string) => {
    setSelectedClipId(id);
    setContextMenu(null);
    const clip = clips.find(c => c.id === id);
    if (clip) setSelectedLayer(clip.layer);
  }, [clips]);

  const handleSelectLayer = useCallback((layer: number) => {
    setSelectedLayer(layer);
  }, []);

  const handleClipChange = useCallback((id: string, updates: Partial<Clip>) => {
    setClips(prev => {
      const prevIdx = prev.findIndex(c => c.id === id);
      if (prevIdx === -1) return prev;
      const prevClip = prev[prevIdx];
      const stabilizationFrame =
        updates.duration !== undefined && prevClip.type === 'voice'
          ? prevClip.startTime
          : currentFrame;
      const stabilizedPrev = freezeVisibleAutoSubtitles(prev, stabilizationFrame);
      const sourceClips = updates.duration !== undefined ? stabilizedPrev : prev;
      const idx = sourceClips.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const old = sourceClips[idx];
      const updated = { ...old, ...updates };

      if (
        updated.type === 'voice' &&
        (
          updates.characterScale !== undefined ||
          updates.characterX !== undefined ||
          updates.characterY !== undefined ||
          old.characterX !== undefined ||
          old.characterY !== undefined
        )
      ) {
        const defaultX = isLeftSpeaker(updated.speaker) ? 15 : 85;
        const clampedCharacter = clampCharacterPosition(
          updated.characterX ?? old.characterX ?? defaultX,
          updated.characterY ?? old.characterY ?? 10,
          updated.characterScale
        );
        updated.characterX = Math.round(clampedCharacter.x);
        updated.characterY = Math.round(clampedCharacter.y);
      }

      const next = [...sourceClips];
      next[idx] = updated;
      if (old.type === 'voice' && updates.duration && updates.duration !== old.duration) {
        const delta = updates.duration - old.duration;
        return next.map(c => {
          if (c.id !== id && c.layer === old.layer && c.type === 'voice' && c.startTime > old.startTime) {
            return { ...c, startTime: c.startTime + delta };
          }
          return c;
        });
      }
      return next;
    });
  }, [currentFrame]);

  const handleMoveClip = useCallback((id: string, newStartTime: number, newLayer?: number) => {
    setClips(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, startTime: Math.max(0, newStartTime) };
      if (newLayer !== undefined) updated.layer = Math.max(0, Math.min(newLayer, 14));
      return updated;
    }));
  }, []);

  const handleResizeClip = useCallback((id: string, newStartTime: number, newDuration: number) => {
    setClips(prev => prev.map(c =>
      c.id === id ? { ...c, startTime: Math.max(0, newStartTime), duration: Math.max(1, newDuration) } : c
    ));
  }, []);

  const onUpdateClip = useCallback((id: string, updates: Partial<Clip>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    const menuW = 170, menuH = 180;
    const x = Math.min(e.pageX, window.innerWidth - menuW);
    const y = Math.min(e.pageY, window.innerHeight - menuH);
    setContextMenu({ x: Math.max(0, x), y: Math.max(0, y), clipId });
  }, []);

  const closeContextMenu = () => setContextMenu(null);

  const handleDuplicate = () => {
    if (!contextMenu) return;
    const clip = clips.find(c => c.id === contextMenu.clipId);
    if (!clip) { closeContextMenu(); return; }
    const newClip: Clip = {
      ...clip,
      id: clip.id + '_copy_' + Date.now(),
      startTime: clip.startTime + clip.duration,
    };
    setClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
    closeContextMenu();
  };

  const handleSplit = () => {
    handleCut();
    closeContextMenu();
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    setClips(prev => prev.filter(c => c.id !== contextMenu.clipId));
    if (selectedClipId === contextMenu.clipId) setSelectedClipId(null);
    closeContextMenu();
  };

  const handleAddClip = useCallback((clip: Clip) => {
    setClips(prev => {
      const stabilizedPrev = freezeVisibleAutoSubtitles(prev, clip.startTime);
      if (clip.type !== 'voice') {
        return [...stabilizedPrev, clip];
      }

      const defaultSubtitleRect = getDefaultSubtitleRectForNewVoice(clip, stabilizedPrev, clip.startTime);
      const nextClip: Clip = {
        ...clip,
        subtitleX: clip.subtitleX ?? Math.round(defaultSubtitleRect.left),
        subtitleY: clip.subtitleY ?? Math.round(defaultSubtitleRect.bottom),
        subtitleWidth: clip.subtitleWidth ?? Math.round(defaultSubtitleRect.width),
        subtitleHeight: clip.subtitleHeight ?? Math.round(defaultSubtitleRect.height),
      };

      return [...stabilizedPrev, nextClip];
    });
    setSelectedClipId(clip.id);
    setScrollToFrame(clip.startTime);
  }, [currentFrame]);

  const handleCut = useCallback(() => {
    if (!selectedClipId) return;
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === selectedClipId);
      if (idx === -1) return prev;
      const clip = prev[idx];
      
      // Can only cut if playhead is within clip
      if (currentFrame <= clip.startTime || currentFrame >= clip.startTime + clip.duration) {
        return prev;
      }

      const relativeFrame = currentFrame - clip.startTime;
      const firstHalfDuration = relativeFrame;
      const secondHalfDuration = clip.duration - relativeFrame;

      const firstHalf = { ...clip, duration: firstHalfDuration };
      const secondHalf = { 
        ...clip, 
        id: `${clip.id}_split_${Date.now()}`, 
        startTime: currentFrame, 
        duration: secondHalfDuration 
      };

      const next = [...prev];
      next[idx] = firstHalf;
      next.push(secondHalf);
      
      // Select the second half
      setTimeout(() => setSelectedClipId(secondHalf.id), 0);
      
      return next;
    });
  }, [selectedClipId, currentFrame]);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const newScript = JSON.parse(JSON.stringify(initialSourceScriptData));
      const exportVariant = initialScriptConfig.variant ?? 'long';
      const projectData = clipsToProjectData(clips);

      if (!newScript[exportVariant]) {
        newScript[exportVariant] = {
          config: {
            width: initialScriptConfig.output.width,
            height: initialScriptConfig.output.height,
            fps: initialScriptConfig.output.fps,
          },
        };
      }

      newScript[exportVariant].scenes = projectData.scenes;
      newScript[exportVariant].bgm_sequence = projectData.bgm_sequence;
      newScript.activeVariant = exportVariant;
      
      const payload = JSON.stringify(newScript, null, 2);
      const res = await fetch('/api/save-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      });
      
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || 'Failed to save script');
      
      alert('Project saved automatically to src/data/script.json!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to save project. Error: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddLayer = () => {
    if (numLayers < 15) setNumLayers(n => n + 1);
  };

  const handleSwitchVariant = useCallback((variant: 'long' | 'short') => {
    if (variant === currentVariant || typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set('variant', variant);
    window.location.search = params.toString();
  }, [currentVariant]);

  const handleOpenStarterLauncher = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete('starter');
    params.delete('variant');
    window.location.search = params.toString();
  }, []);

  const renderCommand = currentVariant === 'short' ? 'npm run render:short' : 'npm run render:long';

  return (
    <div
      className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans"
      onClick={closeContextMenu}
      onContextMenu={(e) => { if (contextMenu) e.preventDefault(); }}
    >
      {/* Top Main Section */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left: Materials Sidebar (Resizable) */}
        <div style={{ width: `${sidebarWidth}px` }} className="flex-shrink-0 flex flex-col h-full overflow-hidden">
          <MaterialsSidebar
            clips={clips}
            currentFrame={currentFrame}
            selectedClipId={selectedClipId}
            selectedLayer={selectedLayer}
            numLayers={numLayers}
            onAddClip={handleAddClip}
          />
        </div>

        {/* Vertical Resizer Handle (Left) */}
        <div 
          className="w-1.5 hover:bg-indigo-500/50 cursor-ew-resize transition-all z-20 flex-shrink-0"
          onPointerDown={() => setIsResizing('sidebar')}
        />

        {/* Center: Preview Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-1 relative group">
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenStarterLauncher}
              className="rounded-full border border-white/10 bg-slate-950/65 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-slate-200 transition-colors hover:border-white/20 hover:bg-white/8"
            >
              Templates
            </button>
            <div className="rounded-full border border-white/8 bg-slate-950/55 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 backdrop-blur-sm pointer-events-none">
              {initialStarterDefinition.title}
            </div>
          </div>
          <div className="absolute top-10 left-2 font-bold text-[10px] text-slate-500 opacity-40 pointer-events-none tracking-widest uppercase whitespace-nowrap overflow-hidden">
            Antigravity NLE Editor
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
            <div className="flex items-center gap-1 rounded-full border border-white/8 bg-slate-950/55 p-1 backdrop-blur-sm">
              {(['long', 'short'] as const).map((variant) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => handleSwitchVariant(variant)}
                  className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${
                    currentVariant === variant
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-slate-500 font-mono bg-slate-950/40 px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-sm pointer-events-none">
              {currentFrame}f / {(currentFrame / PREVIEW_FPS).toFixed(2)}s
            </div>
          </div>
            <div
              className="w-full h-full max-w-full max-h-full flex items-center justify-center relative"
            >
                <div
                  className={`preview-container w-full h-full bg-black rounded-xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] border border-white/5 relative flex items-center justify-center ${
                    editOverlayOpen ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                  title={editOverlayOpen ? 'Middle click or Esc to exit Edit Layout' : 'Middle click to enter Edit Layout'}
                  onMouseDown={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      setEditLayoutMode(!editOverlayOpen);
                    }
                  }}
                >
                  <div className="w-full h-full relative" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                    <Player
                      ref={playerRef}
                      component={TemplateComposition}
                      inputProps={inputProps}
                      durationInFrames={totalFrames}
                      compositionWidth={initialScriptConfig.output.width}
                      compositionHeight={initialScriptConfig.output.height}
                      fps={PREVIEW_FPS}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      controls={true}
                      autoPlay={false}
                    />
                  </div>
                  {!editOverlayOpen && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/75 text-slate-200 text-[10px] px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm pointer-events-none shadow-lg">
                      Middle click to toggle Edit Layout
                    </div>
                  )}

                {/* Direct Canvas Edit Mode */}
                {editOverlayOpen && (
                  <div
                    className="absolute inset-0 bg-indigo-500/5 z-50 pointer-events-auto overflow-hidden animate-in fade-in duration-300"
                    onMouseMove={(e) => {
                      if (!draggingClipId || !draggingHandle) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
                      const mouseY = 100 - (((e.clientY - rect.top) / rect.height) * 100);
                      const deltaX = mouseX - dragStartPos.x;
                      const deltaY = mouseY - dragStartPos.y;
                      if (draggingHandle === 'move') {
                        const snapped = applySnapToSubtitleRect(clampSubtitleRect({
                          left: dragStartPos.clipX + deltaX,
                          bottom: dragStartPos.clipY + deltaY,
                          width: dragStartPos.clipW,
                          height: dragStartPos.clipH,
                        }));
                        const occupiedRects = activeVoiceClips
                          .filter((clip) => clip.id !== draggingClipId)
                          .map((clip) => getPreviewSubtitleRect(clip, previewSubtitleLayouts.get(clip.id)));
                        const resolvedRect = resolveSubtitleOverlap(snapped.rect, occupiedRects);

                        setDragGuides(snapped.guides);
                        handleClipChange(draggingClipId, {
                          subtitleX: Math.round(resolvedRect.left),
                          subtitleY: Math.round(resolvedRect.bottom),
                          subtitleWidth: Math.round(resolvedRect.width),
                          subtitleHeight: Math.round(resolvedRect.height),
                        });
                      } else if (draggingHandle === 'char') {
                        const draggingCharacterClip = clips.find((clip) => clip.id === draggingClipId);
                        const clamped = clampCharacterPosition(
                          dragStartPos.clipX + deltaX,
                          dragStartPos.clipY + deltaY,
                          draggingCharacterClip?.characterScale
                        );
                        setDragGuides({ vertical: null, horizontal: null, hint: null });
                        handleClipChange(draggingClipId, {
                          characterX: Math.round(clamped.x),
                          characterY: Math.round(clamped.y)
                        });
                      } else if (draggingHandle === 'char_resize') {
                        const draggingCharacterClip = clips.find((clip) => clip.id === draggingClipId);
                        const startScale = normalizeCharacterScale(dragStartPos.clipW || draggingCharacterClip?.characterScale);
                        const scaleDeltaX = deltaX / CHARACTER_BOX_WIDTH_PCT;
                        const scaleDeltaY = -deltaY / CHARACTER_BOX_HEIGHT_PCT;
                        const nextScale = clamp(
                          startScale + (scaleDeltaX + scaleDeltaY) / 2,
                          CHARACTER_SCALE_MIN,
                          CHARACTER_SCALE_MAX
                        );
                        const clamped = clampCharacterPosition(
                          dragStartPos.clipX,
                          dragStartPos.clipY,
                          nextScale
                        );
                        setDragGuides({
                          vertical: null,
                          horizontal: null,
                          hint: `Character ${Math.round(nextScale * 100)}%`,
                        });
                        handleClipChange(draggingClipId, {
                          characterScale: Number(nextScale.toFixed(2)),
                          characterX: Math.round(clamped.x),
                          characterY: Math.round(clamped.y),
                        });
                      } else if (draggingHandle === 'image_move') {
                        setDragGuides({ vertical: null, horizontal: null, hint: null });
                        handleClipChange(draggingClipId, {
                          imageX: Math.round(dragStartPos.clipX + deltaX),
                          imageY: Math.round(dragStartPos.clipY + deltaY)
                        });
                      } else if (draggingHandle.startsWith('img_')) {
                        const h = draggingHandle.replace('img_', '');
                        const updates: Partial<Clip> = {
                          imageX: dragStartPos.clipX,
                          imageY: dragStartPos.clipY,
                          imageWidth: dragStartPos.clipW,
                          imageHeight: dragStartPos.clipH,
                        };
                        if (h === 'nw') {
                          updates.imageX = Math.round(dragStartPos.clipX + deltaX);
                          updates.imageWidth = Math.round(Math.max(5, dragStartPos.clipW - deltaX));
                          updates.imageHeight = Math.round(Math.max(5, dragStartPos.clipH + deltaY));
                        } else if (h === 'ne') {
                          updates.imageWidth = Math.round(Math.max(5, dragStartPos.clipW + deltaX));
                          updates.imageHeight = Math.round(Math.max(5, dragStartPos.clipH + deltaY));
                        } else if (h === 'sw') {
                          updates.imageX = Math.round(dragStartPos.clipX + deltaX);
                          updates.imageY = Math.round(dragStartPos.clipY + deltaY);
                          updates.imageWidth = Math.round(Math.max(5, dragStartPos.clipW - deltaX));
                          updates.imageHeight = Math.round(Math.max(5, dragStartPos.clipH - deltaY));
                        } else if (h === 'se') {
                          updates.imageY = Math.round(dragStartPos.clipY + deltaY);
                          updates.imageWidth = Math.round(Math.max(5, dragStartPos.clipW + deltaX));
                          updates.imageHeight = Math.round(Math.max(5, dragStartPos.clipH - deltaY));
                        }
                        setDragGuides({ vertical: null, horizontal: null, hint: null });
                        handleClipChange(draggingClipId, updates);
                      } else {
                        let nextRect: SubtitleRect = {
                          left: dragStartPos.clipX,
                          bottom: dragStartPos.clipY,
                          width: dragStartPos.clipW,
                          height: dragStartPos.clipH,
                        };

                        if (draggingHandle === 'nw') {
                          nextRect = {
                            left: dragStartPos.clipX + deltaX,
                            bottom: dragStartPos.clipY,
                            width: Math.max(SUBTITLE_MIN_WIDTH, dragStartPos.clipW - deltaX),
                            height: Math.max(SUBTITLE_MIN_HEIGHT, dragStartPos.clipH + deltaY),
                          };
                        } else if (draggingHandle === 'ne') {
                          nextRect = {
                            left: dragStartPos.clipX,
                            bottom: dragStartPos.clipY,
                            width: Math.max(SUBTITLE_MIN_WIDTH, dragStartPos.clipW + deltaX),
                            height: Math.max(SUBTITLE_MIN_HEIGHT, dragStartPos.clipH + deltaY),
                          };
                        } else if (draggingHandle === 'sw') {
                          nextRect = {
                            left: dragStartPos.clipX + deltaX,
                            bottom: dragStartPos.clipY + deltaY,
                            width: Math.max(SUBTITLE_MIN_WIDTH, dragStartPos.clipW - deltaX),
                            height: Math.max(SUBTITLE_MIN_HEIGHT, dragStartPos.clipH - deltaY),
                          };
                        } else if (draggingHandle === 'se') {
                          nextRect = {
                            left: dragStartPos.clipX,
                            bottom: dragStartPos.clipY + deltaY,
                            width: Math.max(SUBTITLE_MIN_WIDTH, dragStartPos.clipW + deltaX),
                            height: Math.max(SUBTITLE_MIN_HEIGHT, dragStartPos.clipH - deltaY),
                          };
                        } else {
                          nextRect = {
                            left: dragStartPos.clipX + deltaX,
                            bottom: dragStartPos.clipY + deltaY,
                            width: dragStartPos.clipW,
                            height: dragStartPos.clipH,
                          };
                        }

                        const snapped = { rect: clampSubtitleRect(nextRect), guides: { vertical: null, horizontal: null, hint: null } };
                        const occupiedRects = activeVoiceClips
                          .filter((clip) => clip.id !== draggingClipId)
                          .map((clip) => getPreviewSubtitleRect(clip, previewSubtitleLayouts.get(clip.id)));
                        const resolvedRect = resolveSubtitleOverlap(snapped.rect, occupiedRects);

                        setDragGuides(snapped.guides);
                        handleClipChange(draggingClipId, {
                          subtitleX: Math.round(resolvedRect.left),
                          subtitleY: Math.round(resolvedRect.bottom),
                          subtitleWidth: Math.round(resolvedRect.width),
                          subtitleHeight: Math.round(resolvedRect.height),
                        });
                      }
                    }}
                    onMouseUp={() => {
                      resetDragState();
                    }}
                  >
                    {/* (Existing Edit Logic Rest - unchanged) */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full font-bold shadow-2xl flex gap-3 items-center border border-white/20">
                      <span className="bg-white/10 px-2 py-0.5 rounded-full whitespace-nowrap">Edit Mode Active</span>
                      <span className="opacity-80">Middle click or Esc to exit • Snap guides • Resize handles</span>
                    </div>

                    <div className="absolute inset-0 pointer-events-none opacity-30">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                      <div className="absolute left-0 right-0 h-px bg-white/10" style={{ bottom: '4%' }} />
                    </div>

                    {dragGuides.vertical !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-cyan-300/80 pointer-events-none"
                        style={{ left: `${dragGuides.vertical}%` }}
                      />
                    )}
                    {dragGuides.horizontal !== null && (
                      <div
                        className="absolute left-0 right-0 h-px bg-cyan-300/80 pointer-events-none"
                        style={{ bottom: `${dragGuides.horizontal}%` }}
                      />
                    )}
                    {dragGuides.hint && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 text-cyan-200 text-[10px] px-3 py-1 rounded-full border border-cyan-300/20 shadow-lg pointer-events-none">
                        {dragGuides.hint}
                      </div>
                    )}

                    {activeVoiceClips
                      .map(c => {
                        const previewRect = getPreviewSubtitleRect(c, previewSubtitleLayouts.get(c.id));
                        const sw = previewRect.width;
                        const sh = previewRect.height;
                        const leftPos = previewRect.left;
                        const sy = previewRect.bottom;
                        const isActive = draggingClipId === c.id;

                        const handleStartDrag = (h: typeof draggingHandle, e: React.MouseEvent) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleSelectClip(c.id);
                          const rect = (e.currentTarget.closest('.preview-container') as HTMLElement).getBoundingClientRect();
                          setDraggingClipId(c.id);
                          setDraggingHandle(h);
                          setDragStartPos({
                            x: ((e.clientX - rect.left) / rect.width) * 100,
                            y: 100 - (((e.clientY - rect.top) / rect.height) * 100),
                            clipX: leftPos,
                            clipY: sy,
                            clipW: sw, clipH: sh
                          });
                          setDragGuides({ vertical: null, horizontal: null, hint: null });
                        };

                        return (
                          <div
                            key={`edit_${c.id}`}
                            className={`absolute border-2 rounded-lg transition-all pointer-events-auto ${
                              isActive ? 'border-indigo-300 bg-indigo-400/20 shadow-[0_0_50px_rgba(99,102,241,0.45)] ring-2 ring-indigo-300/30' : 'border-white/30 bg-black/20 hover:border-white/70 hover:bg-white/5'
                            }`}
                            style={{
                              left: `${leftPos}%`, bottom: `${sy}%`, width: `${sw}%`, height: `${sh}%`,
                              cursor: isActive ? 'grabbing' : 'grab',
                            }}
                            onMouseDown={(e) => handleStartDrag('move', e)}
                          >
                            <div className="absolute top-0 left-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-indigo-500 cursor-nwse-resize" onMouseDown={(e) => handleStartDrag('nw', e)} />
                            <div className="absolute top-0 right-0 w-3 h-3 translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-indigo-500 cursor-nesw-resize" onMouseDown={(e) => handleStartDrag('ne', e)} />
                            <div className="absolute bottom-0 left-0 w-3 h-3 -translate-x-1/2 translate-y-1/2 bg-white rounded-full border-2 border-indigo-500 cursor-nesw-resize" onMouseDown={(e) => handleStartDrag('sw', e)} />
                            <div className="absolute bottom-0 right-0 w-3 h-3 translate-x-1/2 translate-y-1/2 bg-white rounded-full border-2 border-indigo-500 cursor-nwse-resize" onMouseDown={(e) => handleStartDrag('se', e)} />
                            
                            {/* Label for Subtitle */}
                            <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter flex items-center gap-1">
                              <span>{getSpeakerMeta(c.speaker).label}</span>
                              <span className="opacity-70">{Math.round(sw)}x{Math.round(sh)}</span>
                            </div>
                          </div>
                        );
                      })}

                    {/* Character Drag Handles */}
                    {(inputProps.characterScale ?? 1) > 0.01 && activeCharacterClips
                      .map(c => {
                        const characterLayout = getCharacterLayout(c);
                        const cx = characterLayout.x;
                        const cy = characterLayout.y;
                        const isActive = draggingClipId === c.id && (draggingHandle === 'char' || draggingHandle === 'char_resize');

                        return (
                          <div
                            key={`char_edit_${c.id}`}
                            className={`absolute border-2 border-dashed rounded-2xl transition-all pointer-events-auto flex items-center justify-center ${
                              isActive ? 'border-amber-300 bg-amber-400/12 shadow-[0_0_50px_rgba(251,191,36,0.35)] ring-2 ring-amber-200/20' : 'border-amber-300/35 bg-black/5 hover:border-amber-300/70 hover:bg-amber-300/10'
                            }`}
                            style={{
                              left: `${cx}%`,
                              bottom: `${cy}%`,
                              width: `${characterLayout.width}%`,
                              height: `${characterLayout.height}%`,
                              opacity: c.characterOpacity ?? 1,
                              transform: `translateX(-50%) rotate(${c.characterRotation ?? 0}deg)`,
                              transformOrigin: 'bottom center',
                              cursor: isActive ? 'grabbing' : 'grab',
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleSelectClip(c.id);
                              const rect = (e.currentTarget.closest('.preview-container') as HTMLElement).getBoundingClientRect();
                              setDraggingClipId(c.id);
                              setDraggingHandle('char');
                              setDragStartPos({
                                x: ((e.clientX - rect.left) / rect.width) * 100,
                                y: 100 - (((e.clientY - rect.top) / rect.height) * 100),
                                clipX: cx,
                                clipY: cy,
                                clipW: 0, clipH: 0
                              });
                              setDragGuides({ vertical: null, horizontal: null, hint: null });
                            }}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tight whitespace-nowrap">
                              {getSpeakerMeta(c.speaker).label} {Math.round(characterLayout.scale * 100)}%
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-amber-300/10 to-transparent rounded-[inherit]" />
                            <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-300/80 border border-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.35)]" />
                            <div
                              className="absolute top-0 right-0 w-4 h-4 translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-amber-500 shadow-[0_0_18px_rgba(251,191,36,0.35)] cursor-nwse-resize"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleSelectClip(c.id);
                                const rect = (e.currentTarget.closest('.preview-container') as HTMLElement).getBoundingClientRect();
                                setDraggingClipId(c.id);
                                setDraggingHandle('char_resize');
                                setDragStartPos({
                                  x: ((e.clientX - rect.left) / rect.width) * 100,
                                  y: 100 - (((e.clientY - rect.top) / rect.height) * 100),
                                  clipX: cx,
                                  clipY: cy,
                                  clipW: characterLayout.scale,
                                  clipH: 0,
                                });
                                setDragGuides({
                                  vertical: null,
                                  horizontal: null,
                                  hint: `Character ${Math.round(characterLayout.scale * 100)}%`,
                                });
                              }}
                            />
                          </div>
                        );
                      })}

                    {/* Image Drag Handles */}
                    {clips
                      .filter(c => c.type === 'image' && currentFrame >= c.startTime && currentFrame < c.startTime + c.duration)
                      .map(ic => {
                        const ix = ic.imageX ?? 50;
                        const iy = ic.imageY ?? 90;
                        const iw = ic.imageWidth ?? 25; // Estimate from height 400px logic
                        const ih = ic.imageHeight ?? 40;
                        const popupLayout = getPopupLayoutBox({
                          width: initialScriptConfig.output.width,
                          height: initialScriptConfig.output.height,
                          x: ix,
                          y: iy,
                          popupWidth: iw,
                          popupHeight: ih,
                          visualMode: ic.sceneVisualMode,
                          popupZone: ic.popupZone,
                        });
                        const isActive = draggingClipId === ic.id;

                        const handleStartImgDrag = (h: string, e: React.MouseEvent) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleSelectClip(ic.id);
                          const rect = (e.currentTarget.closest('.preview-container') as HTMLElement).getBoundingClientRect();
                          setDraggingClipId(ic.id);
                          setDraggingHandle(h as any);
                          setDragStartPos({
                            x: ((e.clientX - rect.left) / rect.width) * 100,
                            y: 100 - (((e.clientY - rect.top) / rect.height) * 100),
                            clipX: ix,
                            clipY: iy,
                            clipW: iw, clipH: ih
                          });
                        };

                        return (
                          <div
                            key={`img_edit_${ic.id}`}
                            className={`absolute border-2 transition-all pointer-events-auto ${
                              isActive ? 'border-emerald-400 bg-emerald-400/20 shadow-[0_0_50px_rgba(52,211,153,0.5)]' : 'border-emerald-400/30 bg-black/10 hover:border-emerald-400/60'
                            }`}
                            style={{
                              left: `${popupLayout.centerX}%`,
                              top: `${popupLayout.top}%`,
                              width: `${popupLayout.width}%`,
                              height: `${popupLayout.height}%`,
                              opacity: ic.imageOpacity ?? 1,
                              transform: `translateX(-50%) translateY(0%) rotate(${ic.imageRotation ?? 0}deg) scale(${ic.imageScale ?? 1})`,
                              transformOrigin: 'center top',
                              cursor: 'move',
                            }}
                            onMouseDown={(e) => handleStartImgDrag('image_move', e)}
                          >
                            <div className="absolute top-0 left-0 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-emerald-500 cursor-nwse-resize" onMouseDown={(e) => handleStartImgDrag('img_nw', e)} />
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-emerald-500 cursor-nesw-resize" onMouseDown={(e) => handleStartImgDrag('img_ne', e)} />
                            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 -translate-x-1/2 translate-y-1/2 bg-white rounded-full border-2 border-emerald-500 cursor-nesw-resize" onMouseDown={(e) => handleStartImgDrag('img_sw', e)} />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 translate-x-1/2 translate-y-1/2 bg-white rounded-full border-2 border-emerald-500 cursor-nwse-resize" onMouseDown={(e) => handleStartImgDrag('img_se', e)} />
                            
                            <div className="absolute -top-5 left-0 bg-emerald-600 text-white text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                              {ic.component ? 'Component' : 'Image'}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
          </div>
        </div>
      </div>

        {/* Vertical Resizer Handle (Right) */}
        <div 
          className="w-1.5 hover:bg-indigo-500/50 cursor-ew-resize transition-all z-20 flex-shrink-0"
          onPointerDown={() => setIsResizing('properties')}
        />

        {/* Right: Properties Panel (Resizable) */}
        <div style={{ width: `${propertiesWidth}px` }} className="flex-shrink-0 bg-slate-900 border-l border-white/5 overflow-y-auto overflow-x-hidden flex flex-col h-full">
          <PropertiesPanel
            clip={selectedClip}
            clips={clips}
            currentFrame={currentFrame}
            onChangeClip={handleClipChange}
          />
        </div>
      </div>

      {/* Horizontal Resizer Handle (Bottom) */}
      <div 
        className="h-1.5 hover:bg-indigo-500/50 cursor-ns-resize transition-all z-20 flex-shrink-0"
        onPointerDown={() => setIsResizing('timeline')}
      />

      {/* Bottom: Timeline (Resizable) */}
      <div style={{ height: `${timelineHeight}px` }} className="flex-shrink-0 bg-slate-950 border-t border-white/10 flex flex-col min-h-[100px]">
        <div className="px-4 py-2 border-b border-indigo-500/5 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/40">
          <div className="flex items-center gap-6">
            <span className="text-slate-400">Timeline / タイムライン</span>
            <button
              onClick={handleAddLayer}
              disabled={numLayers >= 15}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition-colors"
            >
              <span>+</span> <span>Add Layer</span>
            </button>
            <button
              onClick={handleCut}
              disabled={!selectedClipId}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition-colors text-rose-400 border border-white/5"
            >
              <span>✂️</span> <span>Cut</span>
            </button>
            <button
              onClick={() => setEditOverlayOpen(!editOverlayOpen)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-bold ${editOverlayOpen ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <span>{editOverlayOpen ? '👁️' : '✏️'}</span> <span>{editOverlayOpen ? 'Exit Edit' : 'Edit Layout'}</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleExportJSON} 
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-white/5 transition-all flex items-center gap-2"
            >
              <span>💾</span> <span>Save Project</span>
            </button>
            <button 
              onClick={() => setIsExporting(true)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 font-bold"
            >
              <span>🎬</span> <span>Export Video</span>
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <Timeline
            clips={clips}
            totalFrames={totalFrames}
            numLayers={numLayers}
            currentFrame={currentFrame}
            scrollToFrame={scrollToFrame}
            onScrollToFrameDone={() => setScrollToFrame(null)}
            selectedClipId={selectedClipId}
            selectedLayer={selectedLayer}
            onSelectClip={handleSelectClip}
            onSelectLayer={handleSelectLayer}
            onContextMenu={handleContextMenu}
            onMoveClip={handleMoveClip}
            onResizeClip={handleResizeClip}
            onUpdateClip={onUpdateClip}
            onAddClip={handleAddClip}
            onSeek={handleSeek}
          />
        </div>
      </div>

      {/* Export / Render Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-[450px] bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_100px_rgba(99,102,241,0.2)] animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner animate-pulse">🎬</div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Ready to Export</h3>
              <p className="text-slate-400 text-xs mb-8 leading-relaxed px-4">
                The project state will be saved to <code className="text-indigo-400">script.json</code>. 
                Run the command below in your terminal to generate the high-quality MP4 video.
              </p>

              <div className="w-full bg-black/60 rounded-2xl p-4 border border-white/5 mb-8 relative group">
                <code className="text-indigo-300 text-[11px] font-mono break-all">{renderCommand}</code>
                <button 
                  onClick={() => {
                    handleExportJSON();
                    navigator.clipboard.writeText(renderCommand);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 transition-all border border-white/5 opacity-0 group-hover:opacity-100"
                >
                  Copy & Save
                </button>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setIsExporting(false)} 
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold rounded-xl transition-all border border-white/5"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleExportJSON();
                    // In a more advanced setup, this could trigger a server-side render
                  }}
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest"
                >
                  Save & Prepare
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu (Existing Unchanged Logic) */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] py-2 text-xs text-slate-200 min-w-[190px] animate-in zoom-in-95 duration-100"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest opacity-60">
            {contextMenu.clipId ? (clips.find(c => c.id === contextMenu.clipId)?.type ?? 'Clip') + ' Options' : 'Timeline Options'}
          </div>
          
          {contextMenu.clipId ? (
            <>
              <button className="w-full text-left px-4 py-2.5 hover:bg-indigo-600 transition-colors flex items-center gap-3" onClick={handleDuplicate}>
                <span>👯</span> Duplicate Clip
              </button>
              <button className="w-full text-left px-4 py-2.5 hover:bg-indigo-600 transition-colors flex items-center gap-3" onClick={handleSplit}>
                <span>✂️</span> Cut
              </button>
              <div className="h-px bg-white/10 my-1 mx-2" />
              <button className="w-full text-left px-4 py-2.5 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors flex items-center gap-3" onClick={handleDelete}>
                <span>🗑️</span> Remove Clip
              </button>
            </>
          ) : (
            <>
              <button className="w-full text-left px-4 py-2.5 hover:bg-indigo-600 transition-colors flex items-center gap-3" onClick={() => {
                // Add at playhead
                handleAddClip({
                  id: `voice_${Date.now()}`,
                  type: 'voice',
                  layer: selectedLayer,
                  startTime: currentFrame,
                  duration: 90,
                  speaker: 'zundamon',
                  text: '新しく追加されたセリフなのだ！'
                });
                closeContextMenu();
              }}>
                <span>➕</span> Add Voice Clip
              </button>
              <button className="w-full text-left px-4 py-2.5 hover:bg-indigo-600 transition-colors flex items-center gap-3" onClick={() => {
                handleAddClip({
                  id: `bg_${Date.now()}`,
                  type: 'bg',
                  layer: 3,
                  startTime: currentFrame,
                  duration: 90,
                  bg_image: 'bg.png'
                });
                closeContextMenu();
              }}>
                <span>🖼️</span> Add Background
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
