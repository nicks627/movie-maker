import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';

export const CHARACTER_BOX_WIDTH_PCT = 28;
export const CHARACTER_BOX_HEIGHT_PCT = 55;
export const CHARACTER_SCALE_MIN = 0.5;
export const CHARACTER_SCALE_MAX = 1.8;

export const normalizeCharacterScale = (scale?: number) => {
  const resolved = scale ?? 1;
  return Math.min(Math.max(resolved, CHARACTER_SCALE_MIN), CHARACTER_SCALE_MAX);
};

export const getCharacterBoxSizePct = (scale?: number) => {
  const resolvedScale = normalizeCharacterScale(scale);
  return {
    width: CHARACTER_BOX_WIDTH_PCT * resolvedScale,
    height: CHARACTER_BOX_HEIGHT_PCT * resolvedScale,
    scale: resolvedScale,
  };
};

interface CharacterProps {
  character: string;
  emotion: string;
  side: 'left' | 'right';
  posX?: number;
  posY?: number;
  sizeScale?: number;
  rotation?: number;
  opacity?: number;
}

export const CharacterSkin: React.FC<CharacterProps> = ({
  character,
  emotion,
  side,
  posX,
  posY,
  sizeScale,
  rotation = 0,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const bounce = Math.sin(frame / 5) * 5; // Slight bouncing animation
  const boxSize = getCharacterBoxSizePct(sizeScale);

  // Use custom positioning if provided, else default to side-based
  const isCustom = posX !== undefined && posY !== undefined;
  const defaultX = side === 'left' ? 15 : 85;
  const alignment = isCustom 
    ? { left: `${posX}%`, bottom: `${posY}%` }
    : { left: `${defaultX}%`, bottom: '10%' };
  
  // Resolve the image based on character and emotion
  // Default to normal/usually if the specified emotion image is not found
  const defaultEmotion = character === 'zundamon' ? '無' : '通常';
  const resolvedEmotion =
    character === 'zundamon' && emotion === '通常'
      ? '普通'
      : emotion || defaultEmotion;
  const hasDedicatedFallback = character === 'reimu' || character === 'marisa';
  const skinImage = hasDedicatedFallback
    ? `${character}.svg`
    : `${character}/${resolvedEmotion}.png`;
  const fallbackImage = `${character}.svg`;

  return (
    <div
      style={{
        position: 'absolute',
        ...alignment,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: `${boxSize.width}%`,
        height: `${boxSize.height}%`,
        overflow: 'visible',
        opacity,
        transform: `translateX(-50%) translateY(${bounce}px) rotate(${rotation}deg)`,
        transformOrigin: 'bottom center',
      }}
    >
      <Img 
        src={staticFile(skinImage)} 
        onError={(e) => {
          // Fallback to {character}.png if directory-based skin fails
          const target = e.currentTarget as HTMLImageElement;
          if (target.src.includes(skinImage)) {
            target.src = staticFile(fallbackImage);
          } else {
            // Final fallback to transparent if even that fails
            target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transform: `scaleX(${side === 'left' ? -1 : 1})`, // Reverted to -1 : 1. The left image is physically drawn facing left, so it needs -1 to face right (center).
          transformOrigin: 'bottom center',
        }} 
      />
    </div>
  );
};
