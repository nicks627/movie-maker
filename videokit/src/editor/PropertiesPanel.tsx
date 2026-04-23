import React, { useState } from 'react';
import type { Clip, ClipEffect, SceneEffect, SceneTransition, SubtitleStyle } from '../types';
import {
  createClipEffectTemplate,
  effectSupportsBlur,
  effectSupportsColor,
  effectSupportsDirection,
  effectSupportsFrequency,
  effectSupportsIntensity,
  effectSupportsRotation,
  effectSupportsScale,
  effectSupportsSecondaryColor,
  POPUP_EFFECT_OPTIONS,
} from '../effects/popup-effect-templates';
import {
  CAMERA_MOTION_OPTIONS,
  COLOR_GRADE_OPTIONS,
  createDefaultCameraMotion,
  createDefaultSceneOverlay,
  createSceneEffectPreset,
  SCENE_OVERLAY_OPTIONS,
  SCENE_STYLE_PRESET_OPTIONS,
} from '../effects/scene-effect-presets';
import {
  DIRECTION_OPTIONS,
  SCENE_TRANSITION_OPTIONS,
  transitionSupportsDirection,
} from '../effects/scene-transition-presets';
import { getSpeakerMeta, SPEAKER_OPTIONS } from '../voice/speakers';

const FPS = 30;

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter (Modern)' },
  { value: "'Outfit', sans-serif", label: 'Outfit (Geometric)' },
  { value: "'Nico Moji', cursive", label: 'ニコモジ' },
  { value: 'sans-serif', label: '標準サンセリフ' },
];

interface PropertiesPanelProps {
  clip: Clip | null;
  clips: Clip[];
  currentFrame: number;
  onChangeClip: (id: string, updates: Partial<Clip>) => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-3 mt-2">
    {children}
  </h3>
);

const ControlGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-[11px] font-medium text-slate-400 capitalize">{label}</label>
    {children}
  </div>
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ clip, clips, currentFrame, onChangeClip }) => {
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState('');

  if (!clip) {
    return (
      <div className="p-10 text-slate-500 text-center mt-20 italic">
        Select a clip on the timeline to edit its properties
      </div>
    );
  }

  const update = (field: string, value: any) => onChangeClip(clip.id, { [field]: value });
  const renderClipTransitionControls = (
    label: string,
    accentClass: string
  ) => {
    const transition = clip.transition ?? { type: 'none' as const, duration: 20, direction: 'left' as const };
    const supportsDirection = transitionSupportsDirection(transition.type);
    const updateTransition = (updates: Partial<SceneTransition>) => {
      update('transition', { ...transition, ...updates });
    };

    return (
      <>
        <SectionTitle>{label}</SectionTitle>
        <ControlGroup label="Transition Type">
          <select
            value={transition.type}
            onChange={(e) => updateTransition({ type: e.target.value as SceneTransition['type'] })}
            className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none"
          >
            {SCENE_TRANSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ControlGroup>

        {transition.type !== 'none' && (
          <>
            <ControlGroup label={`Transition Duration (${transition.duration ?? 20}f)`}>
              <input
                type="range"
                min={5}
                max={60}
                value={transition.duration ?? 20}
                onChange={(e) => updateTransition({ duration: parseInt(e.target.value, 10) || 20 })}
                className={accentClass}
              />
            </ControlGroup>

            {supportsDirection && (
              <ControlGroup label="Direction">
                <select
                  value={transition.direction ?? 'left'}
                  onChange={(e) => updateTransition({ direction: e.target.value as SceneTransition['direction'] })}
                  className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none"
                >
                  {DIRECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </ControlGroup>
            )}
          </>
        )}
      </>
    );
  };

  // ---- Voice Generation ----
  const handleGenerateVoice = async () => {
    if (clip.type !== 'voice') return;
    setVoiceStatus('loading');
    setVoiceError('');
    try {
      let previewBlob: Blob;
      let originalBuffer: ArrayBuffer;
      const filename = `${clip.id}_gen.wav`;
      const speakerMeta = getSpeakerMeta(clip.speaker);

      if (speakerMeta.engine === 'aquestalk') {
        const aqParams = {
          speakerKey: speakerMeta.key,
          bas: speakerMeta.aquestalkBas ?? 0,
          spd: Math.round((clip.speedScale ?? 1.0) * 100),
          vol: Math.round((clip.volumeScale ?? 1.0) * 100),
          pit: Math.round((speakerMeta.aquestalkBasePitch ?? 100) + (clip.pitchScale ?? 0) * 500),
          acc: 100,
          lmd: Math.round((clip.intonationScale ?? 1.0) * 100),
          fsc: 100
        };
        
        const res = await fetch('/api/generate-aquestalk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clip.speechText ?? clip.text ?? '',
            params: aqParams,
            outputFilename: filename
          })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(`AquesTalk生成に失敗: ${result.error}`);
        
        // Fetch the generated file to get bits/duration
        const audioRes = await fetch(`/voices/${filename}?t=${Date.now()}`);
        originalBuffer = await audioRes.arrayBuffer();
        previewBlob = new Blob([originalBuffer], { type: 'audio/wav' });
      } else {
        const speakerId = speakerMeta.styleId ?? 3;
        const res = await fetch('/api/generate-voicevox-core', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clip.speechText ?? clip.text ?? '',
            params: {
              speaker: clip.speaker ?? 'zundamon',
              styleId: speakerId,
              speedScale: clip.speedScale ?? 1.0,
              pitchScale: clip.pitchScale ?? 0,
              intonationScale: clip.intonationScale ?? 1.0,
              volumeScale: clip.volumeScale ?? 1.0,
            },
            outputFilename: filename
          })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(`VOICEVOX Core生成に失敗: ${result.error}`);

        const audioRes = await fetch(`/voices/${filename}?t=${Date.now()}`);
        originalBuffer = await audioRes.arrayBuffer();
        previewBlob = new Blob([originalBuffer], { type: 'audio/wav' });
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(originalBuffer.slice(0));
      audioCtx.close();
      const durationFrames = Math.ceil(audioBuffer.duration * FPS);
      const blobUrl = URL.createObjectURL(previewBlob);

      onChangeClip(clip.id, { duration: durationFrames, voiceBlobUrl: blobUrl, voiceType: 'generated', voiceFile: filename });
      setVoiceStatus('done');
    } catch (err: any) {
      setVoiceError(err.message ?? 'Unknown error');
      setVoiceStatus('error');
    }
  };

  // Common Header
  const renderHeader = (title: string, colorClass: string) => (
    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
      <div>
        <h2 className={`text-sm font-bold ${colorClass} tracking-tight`}>{title}</h2>
        <div className="text-[9px] text-slate-500 font-mono mt-0.5">ID: {clip.id.split('_').pop()}</div>
      </div>
      <div className="bg-white/5 px-2 py-1 rounded text-[10px] text-slate-400 font-bold border border-white/5 uppercase">
        Layer {clip.layer}
      </div>
    </div>
  );

  const renderTransitions = () => (
    <div className="p-5 border-t border-white/5">
      <SectionTitle>Transitions & Effects / トランジション</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <ControlGroup label="Fade In (f)">
          <input type="number" value={clip.fadeInDuration ?? 0} onChange={(e) => update('fadeInDuration', parseInt(e.target.value) || 0)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors" />
        </ControlGroup>
        <ControlGroup label="Fade Out (f)">
          <input type="number" value={clip.fadeOutDuration ?? 0} onChange={(e) => update('fadeOutDuration', parseInt(e.target.value) || 0)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors" />
        </ControlGroup>
      </div>
    </div>
  );

  const renderTiming = () => (
    <div className="p-5 border-t border-white/5">
      <SectionTitle>Timing / タイミング</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <ControlGroup label="Start (Frames)">
          <input type="number" value={clip.startTime} onChange={(e) => update('startTime', parseInt(e.target.value) || 0)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors" />
        </ControlGroup>
        <ControlGroup label="Duration (Frames)">
          <input type="number" value={clip.duration} onChange={(e) => update('duration', parseInt(e.target.value) || 1)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors" />
        </ControlGroup>
      </div>
    </div>
  );

  // ---- Voice Panel ----
  if (clip.type === 'voice') {
    const ss: SubtitleStyle = clip.subtitleStyle ?? {};
    const handleStyleChange = (field: keyof SubtitleStyle, value: any) => {
      onChangeClip(clip.id, { subtitleStyle: { ...ss, [field]: value } });
    };
    const isBold = (ss.fontWeight ?? '900') !== '500';
    const isItalic = (ss.fontStyle ?? 'normal') === 'italic';

    return (
      <div className="flex flex-col animate-in fade-in duration-300">
        {renderHeader('Voice Properties', 'text-indigo-400')}

        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-250px)]">
          <SectionTitle>Character & Dialogue</SectionTitle>
          
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label="Speaker">
              <select value={clip.speaker} onChange={(e) => update('speaker', e.target.value)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors">
                {SPEAKER_OPTIONS.map((speaker) => (
                  <option key={speaker.key} value={speaker.key}>{speaker.label}</option>
                ))}
              </select>
            </ControlGroup>
            <ControlGroup label="Emotion">
              <select value={clip.emotion || '普通'} onChange={(e) => update('emotion', e.target.value)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors">
                {['普通', '通常', '怒り', '驚き', '企み', '恐怖', '喜び', '得意', '困惑', '泣き', '無'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </ControlGroup>
          </div>

          <SectionTitle>Voice Modulation / 音声調整</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <ControlGroup label={`Speed (${(clip.speedScale ?? 1.0).toFixed(1)}x)`}>
              <input type="range" min={0.5} max={2.0} step={0.1} value={clip.speedScale ?? 1.0} onChange={(e) => update('speedScale', parseFloat(e.target.value))} className="accent-rose-500" />
            </ControlGroup>
            <ControlGroup label={`Pitch (${(clip.pitchScale ?? 0).toFixed(2)})`}>
              <input type="range" min={-0.15} max={0.15} step={0.01} value={clip.pitchScale ?? 0} onChange={(e) => update('pitchScale', parseFloat(e.target.value))} className="accent-rose-500" />
            </ControlGroup>
            <ControlGroup label={`Intonation (${(clip.intonationScale ?? 1.0).toFixed(1)}x)`}>
              <input type="range" min={0.0} max={2.0} step={0.1} value={clip.intonationScale ?? 1.0} onChange={(e) => update('intonationScale', parseFloat(e.target.value))} className="accent-rose-500" />
            </ControlGroup>
            <ControlGroup label={`Volume (${(clip.volumeScale ?? 1.0).toFixed(1)}x)`}>
              <input type="range" min={0.0} max={2.0} step={0.1} value={clip.volumeScale ?? 1.0} onChange={(e) => update('volumeScale', parseFloat(e.target.value))} className="accent-rose-500" />
            </ControlGroup>
          </div>

          <ControlGroup label="Display Text / 表示テキスト">
            <textarea value={clip.text} onChange={(e) => update('text', e.target.value)} rows={3} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed" />
          </ControlGroup>

          <ControlGroup label="Speech Text / 読み上げテキスト">
            <textarea
              value={clip.speechText ?? ''}
              onChange={(e) => update('speechText', e.target.value || undefined)}
              rows={3}
              placeholder="空なら表示テキストから自動で読み上げ用に変換"
              className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed placeholder:text-slate-500"
            />
          </ControlGroup>

          <button onClick={handleGenerateVoice} disabled={voiceStatus === 'loading'} className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
            {voiceStatus === 'loading' ? 'Generating...' : '🎤 Generate Voice'}
          </button>

          {voiceStatus === 'error' && <div className="text-[10px] text-red-400 bg-red-400/5 p-3 rounded border border-red-400/20">{voiceError}</div>}

          {renderClipTransitionControls('Character Transition / 立ち絵', 'accent-rose-500')}

          <SectionTitle>Character Layout / 立ち絵レイアウト</SectionTitle>
          <ControlGroup label="Show Character / 立ち絵を表示">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={clip.characterVisible !== false}
                onChange={(e) => update('characterVisible', e.target.checked)}
                className="accent-amber-500"
              />
              <span>{clip.characterVisible !== false ? 'ON' : 'OFF'}</span>
            </label>
          </ControlGroup>
          <ControlGroup label={`Character Size (${Math.round((clip.characterScale ?? 1) * 100)}%)`}>
            <div className="grid grid-cols-[1fr_72px] gap-3 items-center">
              <input
                type="range"
                min={0.5}
                max={1.8}
                step={0.05}
                value={clip.characterScale ?? 1}
                onChange={(e) => update('characterScale', parseFloat(e.target.value))}
                className="accent-amber-500"
              />
              <input
                type="number"
                min={50}
                max={180}
                step={5}
                value={Math.round((clip.characterScale ?? 1) * 100)}
                onChange={(e) => update('characterScale', (parseInt(e.target.value, 10) || 100) / 100)}
                className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none"
              />
            </div>
          </ControlGroup>
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label={`Character Rotation (${Math.round(clip.characterRotation ?? 0)}deg)`}>
              <input
                type="range"
                min={-45}
                max={45}
                step={1}
                value={clip.characterRotation ?? 0}
                onChange={(e) => update('characterRotation', parseFloat(e.target.value))}
                className="accent-amber-500"
              />
            </ControlGroup>
            <ControlGroup label={`Character Opacity (${Math.round((clip.characterOpacity ?? 1) * 100)}%)`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={clip.characterOpacity ?? 1}
                onChange={(e) => update('characterOpacity', parseFloat(e.target.value))}
                className="accent-amber-500"
              />
            </ControlGroup>
          </div>

          <SectionTitle>Typography / タイポグラフィ</SectionTitle>
          
          <ControlGroup label="Font Family">
            <select value={ss.fontFamily ?? "'Inter', sans-serif"} onChange={(e) => handleStyleChange('fontFamily', e.target.value)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-indigo-500 transition-colors font-medium">
              {FONT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </ControlGroup>

          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label="Font Size">
              <input type="number" value={ss.fontSize ?? 48} onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 24)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none" />
            </ControlGroup>
            <ControlGroup label={`Text Border (${ss.borderSize ?? Math.max(6, Math.round((ss.fontSize ?? 48) * 0.18))}px)`}>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={ss.borderSize ?? Math.max(6, Math.round((ss.fontSize ?? 48) * 0.18))}
                onChange={(e) => handleStyleChange('borderSize', parseInt(e.target.value, 10) || 0)}
                className="accent-indigo-500"
              />
            </ControlGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label="Text Align">
              <div className="flex bg-slate-900 rounded p-1 border border-white/10 gap-1">
                {['left', 'center', 'right'].map((align) => (
                  <button key={align} onClick={() => handleStyleChange('textAlign', align)} className={`flex-1 py-1 rounded text-[10px] font-bold capitalize transition-all ${ss.textAlign === align || (!ss.textAlign && align === 'center') ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                    {align}
                  </button>
                ))}
              </div>
            </ControlGroup>
            <ControlGroup label="Weight & Style">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStyleChange('fontWeight', isBold ? '500' : '900')}
                  className={`py-2 rounded text-[10px] font-bold transition-all border ${isBold ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'}`}
                >
                  Bold
                </button>
                <button
                  onClick={() => handleStyleChange('fontStyle', isItalic ? 'normal' : 'italic')}
                  className={`py-2 rounded text-[10px] font-bold transition-all border ${isItalic ? 'bg-indigo-600 border-indigo-400 text-white italic' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'}`}
                >
                  Italic
                </button>
              </div>
            </ControlGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label="Text Color">
              <input type="color" value={ss.textColor ?? '#ffffff'} onChange={(e) => handleStyleChange('textColor', e.target.value)} className="w-full h-8 rounded bg-transparent border border-white/10 cursor-pointer" />
            </ControlGroup>
            <ControlGroup label="Border Color">
              <input type="color" value={ss.borderColor ?? (clip.speaker === 'zundamon' ? '#4caf50' : '#e91e63')} onChange={(e) => handleStyleChange('borderColor', e.target.value)} className="w-full h-8 rounded bg-transparent border border-white/10 cursor-pointer" />
            </ControlGroup>
          </div>

          <SectionTitle>Text Transform / 文字変形</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label={`Scale (${(ss.scale ?? 1).toFixed(2)}x)`}>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={ss.scale ?? 1}
                onChange={(e) => handleStyleChange('scale', parseFloat(e.target.value))}
                className="accent-indigo-500"
              />
            </ControlGroup>
            <ControlGroup label={`Rotation (${Math.round(ss.rotation ?? 0)}deg)`}>
              <input
                type="range"
                min={-45}
                max={45}
                step={1}
                value={ss.rotation ?? 0}
                onChange={(e) => handleStyleChange('rotation', parseFloat(e.target.value))}
                className="accent-indigo-500"
              />
            </ControlGroup>
          </div>
          <ControlGroup label={`Opacity (${Math.round((ss.opacity ?? 1) * 100)}%)`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={ss.opacity ?? 1}
              onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))}
              className="accent-indigo-500"
            />
          </ControlGroup>

          <SectionTitle>Box Style / テキストボックス</SectionTitle>
          
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label={`Corner Radius (${ss.borderRadius ?? 30}px)`}>
              <input type="range" min={0} max={60} value={ss.borderRadius ?? 30} onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value))} className="accent-indigo-500" />
            </ControlGroup>
            <ControlGroup label={`Padding (${ss.padding ?? 15}px)`}>
              <input type="range" min={0} max={60} value={ss.padding ?? 15} onChange={(e) => handleStyleChange('padding', parseInt(e.target.value))} className="accent-indigo-500" />
            </ControlGroup>
          </div>

          <ControlGroup label="Background Color">
            <input type="text" value={ss.backgroundColor ?? ''} placeholder="rgba(255,255,255,0.9)" onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none" />
          </ControlGroup>
        </div>

        {renderTransitions()}
        {renderTiming()}
      </div>
    );
  }

  // ---- Image Panel ----
  if (clip.type === 'image') {
    const eff = clip.effect ?? { type: 'none' as const, duration: 15 };
    const updateEffect = (updates: Partial<ClipEffect>) => {
      update('effect', { ...eff, ...updates });
    };

    return (
      <div className="flex flex-col animate-in slide-in-from-right duration-300">
        {renderHeader('Image Properties', 'text-emerald-400')}
        <div className="p-5 flex flex-col gap-4">
          <SectionTitle>Asset</SectionTitle>
          {clip.component ? (
            <ControlGroup label="Remotion Component">
              <input
                type="text"
                value={clip.component}
                onChange={(e) => update('component', e.target.value)}
                className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-emerald-500"
              />
            </ControlGroup>
          ) : null}
          <ControlGroup label="File Path">
            <input type="text" value={clip.image ?? ''} onChange={(e) => update('image', e.target.value)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-emerald-500" />
          </ControlGroup>

          <SectionTitle>Transform / 変形</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label={`Scale (${(clip.imageScale ?? 1).toFixed(2)}x)`}>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.05}
                value={clip.imageScale ?? 1}
                onChange={(e) => update('imageScale', parseFloat(e.target.value))}
                className="accent-emerald-500"
              />
            </ControlGroup>
            <ControlGroup label={`Rotation (${Math.round(clip.imageRotation ?? 0)}deg)`}>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={clip.imageRotation ?? 0}
                onChange={(e) => update('imageRotation', parseFloat(e.target.value))}
                className="accent-emerald-500"
              />
            </ControlGroup>
          </div>
          <ControlGroup label={`Opacity (${Math.round((clip.imageOpacity ?? 1) * 100)}%)`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={clip.imageOpacity ?? 1}
              onChange={(e) => update('imageOpacity', parseFloat(e.target.value))}
              className="accent-emerald-500"
            />
          </ControlGroup>

          <SectionTitle>Transitions / エフェクト</SectionTitle>
          <ControlGroup label="Effect Type">
            <select
              value={eff.type}
              onChange={(e) =>
                update(
                  'effect',
                  createClipEffectTemplate(e.target.value as ClipEffect['type'], eff)
                )
              }
              className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-emerald-500"
            >
              {POPUP_EFFECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </ControlGroup>
          {eff.type !== 'none' && (
            <>
              <ControlGroup label={`Effect Duration (${eff.duration ?? 15}f)`}>
                <input
                  type="range"
                  min={5}
                  max={90}
                  value={eff.duration ?? 15}
                  onChange={(e) => updateEffect({ duration: parseInt(e.target.value, 10) || 15 })}
                  className="accent-emerald-500"
                />
              </ControlGroup>

              {effectSupportsDirection(eff.type) && (
                <ControlGroup label="Direction">
                  <select
                    value={eff.direction ?? 'left'}
                    onChange={(e) =>
                      updateEffect({ direction: e.target.value as ClipEffect['direction'] })
                    }
                    className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-emerald-500"
                  >
                    {DIRECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </ControlGroup>
              )}

              {effectSupportsScale(eff.type) && (
                <div className="grid grid-cols-2 gap-4">
                  <ControlGroup label={`Start Scale (${(eff.startScale ?? 0.8).toFixed(2)})`}>
                    <input
                      type="range"
                      min={0.3}
                      max={1.5}
                      step={0.05}
                      value={eff.startScale ?? 0.8}
                      onChange={(e) => updateEffect({ startScale: parseFloat(e.target.value) })}
                      className="accent-emerald-500"
                    />
                  </ControlGroup>
                  <ControlGroup label={`End Scale (${(eff.endScale ?? 1).toFixed(2)})`}>
                    <input
                      type="range"
                      min={0.6}
                      max={1.8}
                      step={0.05}
                      value={eff.endScale ?? 1}
                      onChange={(e) => updateEffect({ endScale: parseFloat(e.target.value) })}
                      className="accent-emerald-500"
                    />
                  </ControlGroup>
                </div>
              )}

              {effectSupportsBlur(eff.type) && (
                <ControlGroup label={`Blur Amount (${Math.round(eff.blurAmount ?? 14)}px)`}>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={eff.blurAmount ?? 14}
                    onChange={(e) => updateEffect({ blurAmount: parseFloat(e.target.value) })}
                    className="accent-emerald-500"
                  />
                </ControlGroup>
              )}

              {effectSupportsIntensity(eff.type) && (
                <ControlGroup label={`Intensity (${(eff.intensity ?? 1).toFixed(2)})`}>
                  <input
                    type="range"
                    min={0.2}
                    max={2}
                    step={0.05}
                    value={eff.intensity ?? 1}
                    onChange={(e) => updateEffect({ intensity: parseFloat(e.target.value) })}
                    className="accent-emerald-500"
                  />
                </ControlGroup>
              )}

              {effectSupportsFrequency(eff.type) && (
                <ControlGroup label={`Frequency (${(eff.frequency ?? 1).toFixed(2)})`}>
                  <input
                    type="range"
                    min={0.4}
                    max={2.5}
                    step={0.05}
                    value={eff.frequency ?? 1}
                    onChange={(e) => updateEffect({ frequency: parseFloat(e.target.value) })}
                    className="accent-emerald-500"
                  />
                </ControlGroup>
              )}

              {effectSupportsRotation(eff.type) && (
                <ControlGroup label={`Rotation (${Math.round(eff.rotation ?? 12)}deg)`}>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={1}
                    value={eff.rotation ?? 12}
                    onChange={(e) => updateEffect({ rotation: parseFloat(e.target.value) })}
                    className="accent-emerald-500"
                  />
                </ControlGroup>
              )}

              {effectSupportsColor(eff.type) && (
                <ControlGroup label="Accent Color">
                  <input
                    type="color"
                    value={eff.color ?? '#38bdf8'}
                    onChange={(e) => updateEffect({ color: e.target.value })}
                    className="w-full h-8 rounded bg-transparent border border-white/10 cursor-pointer"
                  />
                </ControlGroup>
              )}

              {effectSupportsSecondaryColor(eff.type) && (
                <ControlGroup label="Secondary Color">
                  <input
                    type="color"
                    value={eff.secondaryColor ?? '#ff4d8d'}
                    onChange={(e) => updateEffect({ secondaryColor: e.target.value })}
                    className="w-full h-8 rounded bg-transparent border border-white/10 cursor-pointer"
                  />
                </ControlGroup>
              )}
            </>
          )}

          {renderClipTransitionControls('Clip Transition / 画像トランジション', 'accent-emerald-500')}
        </div>
        {renderTransitions()}
        {renderTiming()}
      </div>
    );
  }

  // ---- BG Panel ----
  if (clip.type === 'bg') {
    const sceneEffect: SceneEffect = clip.sceneEffect ?? createSceneEffectPreset('none');
    const cameraMotion = sceneEffect.cameraMotion ?? createDefaultCameraMotion('none');
    const overlay = sceneEffect.overlay ?? createDefaultSceneOverlay('none');
    const updateSceneEffect = (
      updates: Omit<Partial<SceneEffect>, 'cameraMotion' | 'overlay'> & {
        cameraMotion?: Partial<NonNullable<SceneEffect['cameraMotion']>>;
        overlay?: Partial<NonNullable<SceneEffect['overlay']>>;
      },
    ) => {
      update('sceneEffect', {
        ...sceneEffect,
        ...updates,
        cameraMotion: updates.cameraMotion
          ? { ...cameraMotion, ...updates.cameraMotion }
          : cameraMotion,
        overlay: updates.overlay
          ? { ...overlay, ...updates.overlay }
          : overlay,
        filmGrain: updates.filmGrain
          ? { ...(sceneEffect.filmGrain ?? {}), ...updates.filmGrain }
          : sceneEffect.filmGrain,
        vignette: updates.vignette
          ? { ...(sceneEffect.vignette ?? {}), ...updates.vignette }
          : sceneEffect.vignette,
        colorGrade: updates.colorGrade
          ? { ...(sceneEffect.colorGrade ?? { preset: 'cinematic', intensity: 0.6 }), ...updates.colorGrade }
          : sceneEffect.colorGrade,
        cameraShake: updates.cameraShake
          ? { ...(sceneEffect.cameraShake ?? {}), ...updates.cameraShake }
          : sceneEffect.cameraShake,
      });
    };

    return (
      <div className="flex flex-col animate-in slide-in-from-right duration-300">
        {renderHeader('Background Properties', 'text-sky-400')}
        <div className="p-5 flex flex-col gap-4">
          <SectionTitle>Scene Media</SectionTitle>
          <ControlGroup label="Background Image">
            <input type="text" value={clip.bg_image ?? ''} onChange={(e) => update('bg_image', e.target.value)} placeholder="bg.png" className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500" />
          </ControlGroup>
          <ControlGroup label="Background Video">
            <input type="text" value={clip.bg_video ?? ''} onChange={(e) => update('bg_video', e.target.value)} placeholder="(Optional)" className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500" />
          </ControlGroup>
          <ControlGroup label={`Playback Rate (${clip.playbackRate ?? 1.0}x)`}>
            <input type="range" min={0.1} max={3.0} step={0.1} value={clip.playbackRate ?? 1.0} onChange={(e) => update('playbackRate', parseFloat(e.target.value))} className="accent-sky-500" />
          </ControlGroup>

          <SectionTitle>Scene Preset / 演出プリセット</SectionTitle>
          <ControlGroup label="Style Preset">
            <select
              value={sceneEffect.stylePreset ?? 'none'}
              onChange={(e) => update('sceneEffect', createSceneEffectPreset(e.target.value as any))}
              className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500"
            >
              {SCENE_STYLE_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          <SectionTitle>Camera Motion / カメラ演出</SectionTitle>
          <ControlGroup label="Motion Type">
            <select
              value={cameraMotion.type}
              onChange={(e) =>
                updateSceneEffect({
                  cameraMotion: createDefaultCameraMotion(e.target.value as any, cameraMotion),
                })
              }
              className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500"
            >
              {CAMERA_MOTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          {cameraMotion.type !== 'none' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <ControlGroup label={`Intensity (${(cameraMotion.intensity ?? 1).toFixed(2)})`}>
                  <input
                    type="range"
                    min={0.2}
                    max={2}
                    step={0.05}
                    value={cameraMotion.intensity ?? 1}
                    onChange={(e) => updateSceneEffect({ cameraMotion: { intensity: parseFloat(e.target.value) } })}
                    className="accent-sky-500"
                  />
                </ControlGroup>
                <ControlGroup label={`Speed (${(cameraMotion.speed ?? 1).toFixed(2)}x)`}>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={cameraMotion.speed ?? 1}
                    onChange={(e) => updateSceneEffect({ cameraMotion: { speed: parseFloat(e.target.value) } })}
                    className="accent-sky-500"
                  />
                </ControlGroup>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ControlGroup label={`Focus X (${Math.round(cameraMotion.focusX ?? 50)}%)`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={cameraMotion.focusX ?? 50}
                    onChange={(e) => updateSceneEffect({ cameraMotion: { focusX: parseInt(e.target.value, 10) } })}
                    className="accent-sky-500"
                  />
                </ControlGroup>
                <ControlGroup label={`Focus Y (${Math.round(cameraMotion.focusY ?? 50)}%)`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={cameraMotion.focusY ?? 50}
                    onChange={(e) => updateSceneEffect({ cameraMotion: { focusY: parseInt(e.target.value, 10) } })}
                    className="accent-sky-500"
                  />
                </ControlGroup>
              </div>
              {cameraMotion.type === 'parallax' ? (
                <ControlGroup label={`Parallax Depth (${(cameraMotion.parallaxDepth ?? 0.8).toFixed(2)})`}>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={cameraMotion.parallaxDepth ?? 0.8}
                    onChange={(e) => updateSceneEffect({ cameraMotion: { parallaxDepth: parseFloat(e.target.value) } })}
                    className="accent-sky-500"
                  />
                </ControlGroup>
              ) : null}
            </>
          ) : null}

          <SectionTitle>Scene Overlay / 画面レイヤー</SectionTitle>
          <ControlGroup label="Overlay Type">
            <select
              value={overlay.type}
              onChange={(e) =>
                updateSceneEffect({
                  overlay: createDefaultSceneOverlay(e.target.value as any, overlay),
                })
              }
              className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500"
            >
              {SCENE_OVERLAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          {overlay.type !== 'none' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <ControlGroup label={`Overlay Intensity (${(overlay.intensity ?? 1).toFixed(2)})`}>
                  <input
                    type="range"
                    min={0.2}
                    max={2}
                    step={0.05}
                    value={overlay.intensity ?? 1}
                    onChange={(e) => updateSceneEffect({ overlay: { intensity: parseFloat(e.target.value) } })}
                    className="accent-sky-500"
                  />
                </ControlGroup>
                <ControlGroup label="Primary Color">
                  <input
                    type="text"
                    value={overlay.color ?? ''}
                    onChange={(e) => updateSceneEffect({ overlay: { color: e.target.value } })}
                    className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500"
                    placeholder="#fbbf24"
                  />
                </ControlGroup>
              </div>
              <ControlGroup label="Secondary Color">
                <input
                  type="text"
                  value={overlay.secondaryColor ?? ''}
                  onChange={(e) => updateSceneEffect({ overlay: { secondaryColor: e.target.value } })}
                  className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500"
                  placeholder="#38bdf8"
                />
              </ControlGroup>
            </>
          ) : null}

          <SectionTitle>Scene Polish / 仕上げ</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label="Color Grade">
              <select
                value={sceneEffect.colorGrade?.preset ?? 'cinematic'}
                onChange={(e) =>
                  updateSceneEffect({
                    colorGrade: {
                      preset: e.target.value as any,
                      intensity: sceneEffect.colorGrade?.intensity ?? 0.6,
                    },
                  })
                }
                className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-sky-500"
              >
                {COLOR_GRADE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </ControlGroup>
            <ControlGroup label={`Grade Intensity (${(sceneEffect.colorGrade?.intensity ?? 0.6).toFixed(2)})`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sceneEffect.colorGrade?.intensity ?? 0.6}
                onChange={(e) =>
                  updateSceneEffect({
                    colorGrade: {
                      preset: sceneEffect.colorGrade?.preset ?? 'cinematic',
                      intensity: parseFloat(e.target.value),
                    },
                  })
                }
                className="accent-sky-500"
              />
            </ControlGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label={`Film Grain (${(sceneEffect.filmGrain?.opacity ?? 0).toFixed(2)})`}>
              <input
                type="range"
                min={0}
                max={0.2}
                step={0.01}
                value={sceneEffect.filmGrain?.opacity ?? 0}
                onChange={(e) => updateSceneEffect({ filmGrain: { opacity: parseFloat(e.target.value) } })}
                className="accent-sky-500"
              />
            </ControlGroup>
            <ControlGroup label={`Vignette (${(sceneEffect.vignette?.intensity ?? 0).toFixed(2)})`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sceneEffect.vignette?.intensity ?? 0}
                onChange={(e) => updateSceneEffect({ vignette: { intensity: parseFloat(e.target.value) } })}
                className="accent-sky-500"
              />
            </ControlGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label={`Shake (${(sceneEffect.cameraShake?.intensity ?? 0).toFixed(2)})`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sceneEffect.cameraShake?.intensity ?? 0}
                onChange={(e) => updateSceneEffect({ cameraShake: { intensity: parseFloat(e.target.value) } })}
                className="accent-sky-500"
              />
            </ControlGroup>
            <ControlGroup label={`Shake Speed (${(sceneEffect.cameraShake?.speed ?? 1).toFixed(2)}x)`}>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={sceneEffect.cameraShake?.speed ?? 1}
                onChange={(e) => updateSceneEffect({ cameraShake: { speed: parseFloat(e.target.value) } })}
                className="accent-sky-500"
              />
            </ControlGroup>
          </div>

          {renderClipTransitionControls('Scene Transition / 場面転換', 'accent-sky-500')}
        </div>
        {renderTransitions()}
        {renderTiming()}
      </div>
    );
  }

  // ---- BGM Panel ----
  if (clip.type === 'bgm') {
    return (
      <div className="flex flex-col animate-in slide-in-from-right duration-300">
        {renderHeader('Music Properties', 'text-purple-400')}
        <div className="p-5 flex flex-col gap-4">
          <SectionTitle>Audio Asset</SectionTitle>
          <ControlGroup label="BGM File">
            <input type="text" value={clip.bgmFile ?? ''} onChange={(e) => update('bgmFile', e.target.value)} className="bg-slate-900 border border-white/10 text-white rounded p-2 text-xs outline-none focus:border-purple-500" />
          </ControlGroup>
          <ControlGroup label={`Playback Rate (${clip.playbackRate ?? 1.0}x)`}>
            <input type="range" min={0.1} max={3.0} step={0.1} value={clip.playbackRate ?? 1.0} onChange={(e) => update('playbackRate', parseFloat(e.target.value))} className="accent-purple-500" />
          </ControlGroup>
        </div>
        {renderTiming()}
      </div>
    );
  }

  return null;
};
