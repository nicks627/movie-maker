import React, { useRef, useState, useEffect } from 'react';
import { Clip } from '../types';
import { getSpeakerMeta } from '../voice/speakers';

const LAYER_HEIGHT = 40; // Increased for modern look

type DragType = 'clip' | 'trim-left' | 'trim-right' | 'playhead' | 'fade-in' | 'fade-out';

interface DragState {
  type: DragType;
  clipId: string;
  startClientX: number;
  startClientY: number;
  startValue: number;
  startDuration?: number;
  startLayer?: number;
}

interface TimelineProps {
  clips: Clip[];
  totalFrames: number;
  numLayers: number;
  currentFrame: number;
  scrollToFrame: number | null;
  onScrollToFrameDone: () => void;
  selectedClipId: string | null;
  selectedLayer: number;
  onSelectClip: (id: string) => void;
  onSelectLayer: (layer: number) => void;
  onContextMenu: (e: React.MouseEvent, clipId: string) => void;
  onMoveClip: (id: string, newStartTime: number, newLayer?: number) => void;
  onResizeClip: (id: string, newStartTime: number, newDuration: number) => void;
  onUpdateClip: (id: string, updates: Partial<Clip>) => void;
  onAddClip: (clip: Clip) => void;
  onSeek: (frame: number) => void;
}

// Snap targets from all clips
function getSnapTargets(clips: Clip[], excludeId?: string): number[] {
  const targets: number[] = [0];
  clips.forEach(c => {
    if (c.id === excludeId) return;
    targets.push(c.startTime, c.startTime + c.duration);
  });
  return targets;
}

function snap(value: number, targets: number[], threshold = 8): number {
  for (const t of targets) {
    if (Math.abs(value - t) <= threshold) return t;
  }
  return value;
}

// Clip color based on type and speaker
function getClipColor(clip: Clip, isSelected: boolean, isDragging: boolean) {
  const base = clip.type === 'voice'
    ? (clip.speaker === 'zundamon'
      ? { bg: 'bg-emerald-600/40', border: 'border-emerald-500/50', selected: 'bg-emerald-500/80 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]', text: 'text-emerald-100' }
      : clip.speaker === 'reimu'
      ? { bg: 'bg-red-600/40', border: 'border-red-500/50', selected: 'bg-red-500/80 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]', text: 'text-red-100' }
      : clip.speaker === 'marisa'
      ? { bg: 'bg-amber-600/40', border: 'border-amber-500/50', selected: 'bg-amber-500/80 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]', text: 'text-amber-100' }
      : { bg: 'bg-rose-600/40', border: 'border-rose-500/50', selected: 'bg-rose-500/80 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]', text: 'text-rose-100' })
     : clip.type === 'image'
    ? { bg: 'bg-indigo-600/40', border: 'border-indigo-500/50', selected: 'bg-indigo-500/80 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]', text: 'text-indigo-100' }
    : clip.type === 'bg'
    ? { bg: 'bg-sky-600/40', border: 'border-sky-500/50', selected: 'bg-sky-500/80 border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.3)]', text: 'text-sky-100' }
    : { bg: 'bg-violet-600/40', border: 'border-violet-500/50', selected: 'bg-violet-500/80 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]', text: 'text-violet-100' };

  if (isDragging) return `${base.selected} cursor-grabbing opacity-90 scale-[1.01] transition-transform duration-75`;
  if (isSelected) return `${base.selected} ${base.text}`;
  return `${base.bg} ${base.border} ${base.text} hover:bg-opacity-60 transition-colors`;
}

function getClipLabel(clip: Clip): { title: string; sub: string } {
  if (clip.type === 'voice') {
    const name = getSpeakerMeta(clip.speaker).label;
    return { title: name, sub: clip.text?.slice(0, 30) ?? '' };
  }
  if (clip.type === 'image') {
    return { title: clip.component ? 'Component' : 'Image', sub: clip.component ?? clip.image?.split('/').pop() ?? '' };
  }
  if (clip.type === 'bg') {
    return { title: 'Background', sub: (clip.bg_video || clip.bg_image || '').split('/').pop() ?? '' };
  }
  return { title: 'BGM', sub: clip.bgmFile?.split('/').pop() ?? '' };
}

export const Timeline: React.FC<TimelineProps> = ({
  clips, totalFrames, numLayers, currentFrame, scrollToFrame, onScrollToFrameDone,
  selectedClipId, selectedLayer, onSelectClip, onSelectLayer, onContextMenu, onMoveClip, onResizeClip, onUpdateClip, onAddClip, onSeek,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const [dragOverride, setDragOverride] = useState<{ clipId: string; startTime: number; duration?: number; layer?: number; fadeIn?: number; fadeOut?: number } | null>(null);
  const dragOverrideRef = useRef(dragOverride);
  dragOverrideRef.current = dragOverride;

  const onUpdateClipRef = useRef(onUpdateClip);
  onUpdateClipRef.current = onUpdateClip;

  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  
  // Global drag: pointermove / pointerup
  useEffect(() => {
    let rafPending = false;

    const onMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const ds = dragState.current;
      const dx = e.clientX - ds.startClientX;
      const dy = e.clientY - ds.startClientY;
      const { type } = ds;

      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          if (type === 'clip') {
            const rawVal = Math.max(0, ds.startValue + Math.round(dx));
            const targets = getSnapTargets(clipsRef.current, ds.clipId);
            const snapped = snap(rawVal, targets);
            const layerDelta = Math.round(dy / LAYER_HEIGHT);
            const newLayer = Math.max(0, Math.min((ds.startLayer ?? 0) + layerDelta, numLayers - 1));
            setDragOverride({ clipId: ds.clipId, startTime: snapped, layer: newLayer });
          } else if (type === 'trim-right') {
            const newDur = Math.max(1, (ds.startDuration ?? 90) + Math.round(dx));
            setDragOverride({ clipId: ds.clipId, startTime: ds.startValue, duration: newDur });
          } else if (type === 'trim-left') {
            const delta = Math.round(dx);
            const newStart = Math.max(0, ds.startValue + delta);
            const origEnd = ds.startValue + (ds.startDuration ?? 90);
            const newDur = Math.max(1, origEnd - newStart);
            setDragOverride({ clipId: ds.clipId, startTime: newStart, duration: newDur });
          } else if (type === 'fade-in') {
            const newFadeIn = Math.max(0, Math.min(ds.startValue + Math.round(dx), (ds.startDuration ?? 90) / 2));
            setDragOverride({ clipId: ds.clipId, startTime: ds.startValue, fadeIn: newFadeIn });
          } else if (type === 'fade-out') {
            const newFadeOut = Math.max(0, Math.min(ds.startValue - Math.round(dx), (ds.startDuration ?? 90) / 2));
            setDragOverride({ clipId: ds.clipId, startTime: ds.startValue, fadeOut: newFadeOut });
          } else if (type === 'playhead') {
            const newFrame = Math.max(0, Math.min(totalFrames - 1, ds.startValue + Math.round(dx)));
            onSeek(newFrame);
          }
          rafPending = false;
        });
      }
    };

    const onUp = () => {
      if (!dragState.current) return;
      const ds = dragState.current;
      const current = dragOverrideRef.current;

      if (current && ds.type !== 'playhead') {
        if (ds.type === 'clip') {
          onMoveClip(ds.clipId, current.startTime, current.layer);
        } else if (ds.type === 'fade-in') {
          onUpdateClipRef.current(ds.clipId, { fadeInDuration: current.fadeIn });
        } else if (ds.type === 'fade-out') {
          onUpdateClipRef.current(ds.clipId, { fadeOutDuration: current.fadeOut });
        } else {
          onResizeClip(ds.clipId, current.startTime, current.duration ?? ds.startDuration ?? 90);
        }
      }
      dragState.current = null;
      setDragOverride(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onMoveClip, onResizeClip, onSeek, numLayers, totalFrames]);

  const rulerWidth = totalFrames;
  const FPS = 30;

  const [dropIndicator, setDropIndicator] = useState<{ x: number; layer: number } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left + e.currentTarget.scrollLeft);
    const layer = Math.floor((e.clientY - rect.top) / LAYER_HEIGHT);
    if (layer >= 0 && layer < numLayers) {
      setDropIndicator({ x, layer });
    } else {
      setDropIndicator(null);
    }
  };

  const handleDragLeave = () => setDropIndicator(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropIndicator(null);
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    try {
      const item = JSON.parse(data);
      const rect = e.currentTarget.getBoundingClientRect();
      const startTime = Math.round(e.clientX - rect.left + e.currentTarget.scrollLeft);
      const layer = Math.floor((e.clientY - rect.top) / LAYER_HEIGHT);
      const normalizedLayer =
        item.type === 'bgm'
          ? numLayers - 1
          : Math.max(0, Math.min(layer, numLayers - 1));
      
      const id = `${item.type}_${Date.now()}`;
      const newClip: Clip = {
        ...item,
        id,
        startTime,
        duration: item.type === 'bgm' ? 300 : 150,
        layer: normalizedLayer,
      };
      onAddClip(newClip);
    } catch (err) {
      console.error('Failed to parse drop data', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Time ruler */}
      <div className="flex flex-shrink-0 h-8 border-b border-indigo-500/10 overflow-hidden bg-slate-900/50">
        <div className="w-16 flex-shrink-0 bg-slate-900 border-r border-indigo-500/10 flex items-center justify-center">
          <span className="text-[10px] font-bold text-indigo-400">FPS 30</span>
        </div>
        <div className="flex-1 overflow-hidden relative" style={{ marginLeft: -(scrollRef.current?.scrollLeft ?? 0) }}>
          <div className="relative h-full" style={{ width: `${rulerWidth}px` }}>
            {Array.from({ length: Math.ceil(totalFrames / FPS) + 1 }).map((_, s) => (
              <div key={s} className="absolute top-0 h-full" style={{ left: `${s * FPS}px` }}>
                <div className="h-full w-px bg-white/5" />
                <span className="absolute top-1 left-1.5 text-[9px] text-slate-500 font-mono tracking-tighter">{s}s</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layers */}
      <div className="flex flex-1 overflow-hidden">
        {/* Layer labels */}
        <div className="w-16 flex-shrink-0 bg-slate-900 border-r border-indigo-500/10 overflow-y-auto">
          {Array.from({ length: numLayers }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center px-1 border-b border-indigo-500/5 transition-all duration-200 cursor-pointer ${
                selectedLayer === i ? 'bg-indigo-500/10' : 'hover:bg-white/5'
              }`}
              style={{ height: `${LAYER_HEIGHT}px` }}
              onClick={() => onSelectLayer(i)}
            >
              <div className={`w-1 h-4 rounded-full mr-1.5 transition-all ${selectedLayer === i ? 'bg-indigo-500 scale-y-100' : 'bg-transparent scale-y-0'}`} />
              <span className={`text-[9px] font-bold ${selectedLayer === i ? 'text-indigo-400' : 'text-slate-500'}`}>
                L{String(i).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        {/* Tracks area */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-auto relative scroll-smooth bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[size:30px_30px]" 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={(e) => {
            if (e.defaultPrevented) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(Math.round(e.clientX - rect.left + e.currentTarget.scrollLeft));
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, ''); // Empty string means background
          }}
        >
          <div className="relative" style={{ width: `${totalFrames}px`, height: `${numLayers * LAYER_HEIGHT}px` }}>
            {/* Row backgrounds */}
            {Array.from({ length: numLayers }).map((_, i) => (
              <div key={i} className={`absolute w-full border-b border-indigo-500/5 ${selectedLayer === i ? 'bg-indigo-500/[0.03]' : ''}`} style={{ top: `${i * LAYER_HEIGHT}px`, height: `${LAYER_HEIGHT}px` }} />
            ))}

            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-px bg-rose-500 z-40" style={{ left: `${currentFrame}px` }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)] cursor-ew-resize pointer-events-auto"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragState.current = { type: 'playhead', clipId: '', startClientX: e.clientX, startClientY: e.clientY, startValue: currentFrame };
                }}
              />
            </div>

            {/* Drop Indicator */}
            {dropIndicator && (
              <div 
                className="absolute bg-indigo-500/30 border-2 border-indigo-400/50 rounded-md z-30 pointer-events-none animate-pulse"
                style={{
                  left: `${dropIndicator.x}px`,
                  top: `${dropIndicator.layer * LAYER_HEIGHT + 4}px`,
                  width: '150px',
                  height: `${LAYER_HEIGHT - 8}px`
                }}
              />
            )}

            {/* Clips Rendering */}
            {clips.map(clip => {
              const isOverridden = dragOverride?.clipId === clip.id;
              const ds = isOverridden ? dragOverride : null;
              
              const start = ds?.startTime ?? clip.startTime;
              const dur = ds?.duration ?? clip.duration;
              const layer = ds?.layer ?? clip.layer;
              const fadeIn = ds?.fadeIn ?? clip.fadeInDuration ?? 0;
              const fadeOut = ds?.fadeOut ?? clip.fadeOutDuration ?? 0;

              const isSelected = selectedClipId === clip.id;
              const colorClass = getClipColor(clip, isSelected, isOverridden);
              const label = getClipLabel(clip);

              return (
                <div key={clip.id} className={`absolute rounded-md border flex flex-col justify-center px-2 select-none touch-none z-10 transition-shadow ${colorClass}`} style={{
                  left: `${start}px`, width: `${dur}px`, top: `${layer * LAYER_HEIGHT + 4}px`, height: `${LAYER_HEIGHT - 8}px`
                }} onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragState.current = { type: 'clip', clipId: clip.id, startClientX: e.clientX, startClientY: e.clientY, startValue: clip.startTime, startLayer: clip.layer };
                  onSelectClip(clip.id);
                }} onClick={(e) => {
                  e.stopPropagation();
                  onSelectClip(clip.id);
                  onSeek(clip.startTime);
                }} onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); onContextMenu(e, clip.id); }}>
                  
                  {/* Transition Zones & Handles */}
                  {fadeIn > 0 && (
                    <div className="absolute left-0 top-0 h-full bg-white/10 pointer-events-none" style={{ width: `${fadeIn}px`, clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }} />
                  )}
                  <div className="absolute left-0 top-0 h-full w-1 border-l-2 border-white/20 opacity-0 hover:opacity-100 cursor-ew-resize z-20" onPointerDown={(e) => {
                    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
                    dragState.current = { type: 'fade-in', clipId: clip.id, startClientX: e.clientX, startClientY: e.clientY, startValue: clip.fadeInDuration ?? 0, startDuration: clip.duration };
                  }} />

                  {fadeOut > 0 && (
                    <div className="absolute right-0 top-0 h-full bg-white/10 pointer-events-none" style={{ width: `${fadeOut}px`, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                  )}
                  <div className="absolute right-0 top-0 h-full w-1 border-r-2 border-white/20 opacity-0 hover:opacity-100 cursor-ew-resize z-20" onPointerDown={(e) => {
                    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
                    dragState.current = { type: 'fade-out', clipId: clip.id, startClientX: e.clientX, startClientY: e.clientY, startValue: clip.fadeOutDuration ?? 0, startDuration: clip.duration };
                  }} />

                  {/* Trim Handles */}
                  <div className="absolute left-0 top-1/4 h-1/2 w-1.5 cursor-ew-resize opacity-0 hover:opacity-100 bg-white/30 rounded-full z-30" onPointerDown={(e) => {
                    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
                    dragState.current = { type: 'trim-left', clipId: clip.id, startClientX: e.clientX, startClientY: e.clientY, startValue: clip.startTime, startDuration: clip.duration };
                  }} />
                  <div className="absolute right-0 top-1/4 h-1/2 w-1.5 cursor-ew-resize opacity-0 hover:opacity-100 bg-white/30 rounded-full z-30" onPointerDown={(e) => {
                    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
                    dragState.current = { type: 'trim-right', clipId: clip.id, startClientX: e.clientX, startClientY: e.clientY, startValue: clip.startTime, startDuration: clip.duration };
                  }} />

                  <div className="text-[10px] font-bold truncate tracking-tight">{label.title}</div>
                  {dur > 50 && <div className="text-[9px] truncate opacity-80 font-medium">{label.sub}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
