/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface ExerciseVideoPlayerProps {
  src: string;
  title: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
  forceError?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onLoadedMetadata?: (durationSeconds: number) => void;
  onTimeUpdate?: (currentTimeSeconds: number) => void;
  onErrorChange?: (hasError: boolean) => void;
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({
  src,
  title,
  videoRef,
  className = '',
  forceError = false,
  onPlay,
  onPause,
  onEnded,
  onLoadedMetadata,
  onTimeUpdate,
  onErrorChange
}) => {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const resolvedRef = videoRef ?? internalRef;
  const onErrorChangeRef = useRef(onErrorChange);
  onErrorChangeRef.current = onErrorChange;

  const [hasError, setHasError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    setHasError(false);
    onErrorChangeRef.current?.(false);
  }, [src]);

  const handleVideoError = () => {
    setHasError(true);
    onPause?.();
    onErrorChange?.(true);
  };

  const handleRetry = () => {
    setHasError(false);
    onErrorChange?.(false);
    setReloadKey((prev) => prev + 1);
  };

  if (hasError || forceError) {
    return (
      <div
        role="alert"
        className={`w-full rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6 text-amber-950 ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <p className="text-sm font-bold text-amber-950">
                운동 영상을 불러오거나 재생할 수 없습니다.
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                네트워크 상태를 확인한 뒤 다시 시도해 주세요. 영상이 재생되지 않더라도 아래의 시작 자세,
                운동 방법, 처방 정보를 확인하고 운동 수행 기록을 정상적으로 남기실 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>다시 시도</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-xl overflow-hidden bg-black aspect-video max-h-[70vh] flex items-center justify-center ${className}`}
    >
      <video
        key={`${src}-${reloadKey}`}
        ref={resolvedRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        aria-label={`${title} 시범 영상`}
        onPlay={() => onPlay?.()}
        onPause={() => onPause?.()}
        onEnded={() => {
          onPause?.();
          onEnded?.();
        }}
        onLoadedMetadata={(e) => {
          const duration = e.currentTarget.duration;
          if (duration && Number.isFinite(duration)) {
            onLoadedMetadata?.(Math.round(duration));
          }
        }}
        onTimeUpdate={(e) => {
          onTimeUpdate?.(Math.floor(e.currentTarget.currentTime));
        }}
        onError={handleVideoError}
        className="w-full h-full object-contain bg-black"
      />
    </div>
  );
};
