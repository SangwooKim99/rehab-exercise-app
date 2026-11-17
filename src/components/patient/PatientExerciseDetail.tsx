/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Exercise, Patient, AssignedExercise } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { ExerciseSvgGuide } from '../common/ExerciseSvgGuide';
import { PatientVideoUploadSection } from './PatientVideoUploadSection';
import { BodyPartBadge } from '../common/BodyPartIcons';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  HeartPulse,
  Plus,
  Minus,
  Video,
  ListChecks,
  ClipboardList
} from 'lucide-react';

interface PatientExerciseDetailProps {
  exercise: Exercise;
  assignment?: AssignedExercise;
  patient: Patient;
  onBack: () => void;
  onLogSuccess: (exerciseName: string) => void;
}

export const PatientExerciseDetail: React.FC<PatientExerciseDetailProps> = ({
  exercise,
  assignment,
  patient,
  onBack,
  onLogSuccess
}) => {
  const todayStr = StorageService.getTodayDateString();

  // Find existing log for today if any
  const existingLogs = StorageService.getWorkoutLogs(patient.id, todayStr);
  const existingLog = existingLogs.find((l) => l.exerciseId === exercise.id);

  // Form states initialized with existing log or assigned/default values
  const defaultSets = assignment ? assignment.sets : exercise.defaultSets;
  const defaultReps = assignment ? assignment.reps : exercise.defaultReps;
  const defaultFrequency = assignment ? assignment.frequency : exercise.defaultFrequency;

  const [actualSets, setActualSets] = useState<number>(existingLog ? existingLog.actualSets : defaultSets);
  const [actualReps, setActualReps] = useState<number>(existingLog ? existingLog.actualReps : defaultReps);
  const [painLevel, setPainLevel] = useState<number>(existingLog ? existingLog.painLevel : 1);
  const [patientNotes, setPatientNotes] = useState<string>(existingLog?.patientNotes || '');
  const [formValidationMsg, setFormValidationMsg] = useState<string>('');

  // Video & Motion Guide Playback State (defaults to playing so motion starts immediately)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasRealVideoUrl = Boolean(exercise.videoUrl && exercise.videoUrl.trim().length > 0);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [progressSec, setProgressSec] = useState<number>(0);
  const [videoDurationSec, setVideoDurationSec] = useState<number>(exercise.videoPlaceholder.durationSeconds);

  const totalDuration = Math.max(1, hasRealVideoUrl && !videoError ? videoDurationSec : exercise.videoPlaceholder.durationSeconds);

  // Active posture timer / metronome
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  // Reset playback state when switching exercise
  useEffect(() => {
    setVideoError(false);
    setIsPlaying(true);
    setProgressSec(0);
    setVideoDurationSec(exercise.videoPlaceholder.durationSeconds);
  }, [exercise.id, exercise.videoUrl, exercise.videoPlaceholder.durationSeconds]);

  // Timer for motion guide when real video is not active
  useEffect(() => {
    if (hasRealVideoUrl && !videoError) return;

    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressSec((prev) => {
          if (prev >= totalDuration) {
            if (isLooping) {
              return 0;
            }
            setIsPlaying(false);
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isLooping, totalDuration, hasRealVideoUrl, videoError]);

  // Hold posture timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isHolding) {
      timer = setInterval(() => {
        setHoldTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isHolding]);

  const handleTogglePlay = () => {
    if (hasRealVideoUrl && !videoError && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {
          setVideoError(true);
          setIsPlaying(true);
        });
      } else {
        videoRef.current.pause();
      }
      return;
    }

    if (!isPlaying && progressSec >= totalDuration) {
      setProgressSec(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestartVideo = () => {
    if (hasRealVideoUrl && !videoError && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setVideoError(true);
      });
      setIsPlaying(true);
      return;
    }
    setProgressSec(0);
    setIsPlaying(true);
  };

  const activeStepIndex =
    exercise.executionSteps.length > 0
      ? Math.min(
          exercise.executionSteps.length - 1,
          Math.floor((progressSec / Math.max(1, totalDuration)) * exercise.executionSteps.length)
        )
      : 0;

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationMsg('');

    if (actualSets <= 0 || actualReps <= 0) {
      setFormValidationMsg('세트 수와 반복 횟수는 1 이상이어야 합니다.');
      return;
    }

    StorageService.addWorkoutLog({
      patientId: patient.id,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      date: todayStr,
      completed: true,
      prescribedSets: defaultSets,
      prescribedReps: defaultReps,
      actualSets,
      actualReps,
      painLevel,
      patientNotes: patientNotes.trim()
    });

    onLogSuccess(exercise.name);
  };

  const getPainColor = (val: number) => {
    if (val === 0) return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    if (val <= 3) return 'bg-blue-50 text-blue-700 border-blue-300';
    if (val <= 6) return 'bg-amber-50 text-amber-700 border-amber-300';
    return 'bg-rose-50 text-rose-700 border-rose-300';
  };

  const getPainLabel = (val: number) => {
    if (val === 0) return '통증 없음 (0점)';
    if (val <= 3) return `가벼운 뻐근함 (${val}점) - 안전한 범위`;
    if (val <= 6) return `중간 정도의 통증 (${val}점) - 무리하지 마세요`;
    return `심한 통증 (${val}점) - 즉시 운동 중단 권장`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>목록으로 돌아가기</span>
        </button>

        {existingLog && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>오늘 완료 기록됨</span>
          </div>
        )}
      </div>

      {/* Main Exercise Title & Summary Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 flex-wrap">
              <span className="font-semibold text-blue-600">{exercise.category}</span>
              <span aria-hidden="true">·</span>
              <span>운동 부위: {exercise.targetArea}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {exercise.name}
            </h1>
            {exercise.bodyParts && exercise.bodyParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {exercise.bodyParts.map((bp) => (
                  <BodyPartBadge key={bp} part={bp} size="sm" />
                ))}
              </div>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-950 shrink-0">
            <span className="text-blue-600 block text-[11px] font-semibold">오늘의 처방 목표</span>
            <span className="text-base font-extrabold font-mono tabular-nums">
              {defaultSets}세트 × {defaultReps}회
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. 운동 영상 (및 동작 가이드) */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-mono font-bold flex items-center justify-center">
              1
            </span>
            <Video className="w-4 h-4 text-blue-600" />
            <span>운동 영상 및 동작 가이드</span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? '일시정지' : '재생'}</span>
            </button>
            <button
              type="button"
              onClick={handleRestartVideo}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="처음부터 다시 보기"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>처음부터</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLooping((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors ${
                isLooping
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>반복 {isLooping ? '켜짐' : '꺼짐'}</span>
            </button>
          </div>
        </div>

        {/* Video Error Fallback Banner */}
        {hasRealVideoUrl && videoError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <p className="font-bold">운동 동영상 파일을 불러오지 못했습니다.</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  영상이 보이지 않아도 아래의 <strong>실시간 동작 가이드</strong>와 설명을 보며 운동을 진행하고 완료 기록을 남기실 수 있습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setVideoError(false);
                setIsPlaying(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] shrink-0"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Video Player / Interactive Anatomical Motion Viewport */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-slate-900 text-white">
          {/* Top Video Status Bar */}
          <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/60 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="font-semibold text-slate-100">
                {hasRealVideoUrl && !videoError
                  ? '운동 시범 동영상 재생'
                  : isPlaying
                  ? '해부학 동작 가이드 재생 중 (실제 촬영 영상 미등록)'
                  : '해부학 동작 가이드 일시정지됨'}
              </span>
            </div>
            <span className="text-[11px] text-slate-300 bg-slate-700/80 px-2.5 py-0.5 rounded-md">
              현재 단계: {activeStepIndex + 1} / {exercise.executionSteps.length}단계
            </span>
          </div>

          {/* Viewport: HTML5 Video if videoUrl exists & works, else Animated ExerciseSvgGuide */}
          <div className="relative p-4 sm:p-6 flex flex-col items-center justify-center bg-white">
            {hasRealVideoUrl && !videoError ? (
              <video
                ref={videoRef}
                src={exercise.videoUrl}
                autoPlay
                muted
                loop={isLooping}
                playsInline
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => {
                  const dur = Math.round(e.currentTarget.duration);
                  if (dur && Number.isFinite(dur)) {
                    setVideoDurationSec(dur);
                  }
                }}
                onTimeUpdate={(e) => {
                  setProgressSec(Math.floor(e.currentTarget.currentTime));
                }}
                onError={() => {
                  setVideoError(true);
                  setIsPlaying(true);
                }}
                className="w-full max-w-lg h-56 sm:h-64 object-contain rounded-xl bg-black"
              />
            ) : (
              <>
                <ExerciseSvgGuide
                  type={exercise.videoPlaceholder.illustrationType}
                  isPlaying={isPlaying}
                  className="w-full max-w-lg h-56 sm:h-64 object-contain"
                />

                {/* Quick Play/Pause Toggle Button in Corner */}
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-blue-600/95 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                  aria-label={isPlaying ? '동작 가이드 일시정지' : '동작 가이드 재생'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>일시정지</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>동작 재생</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Synchronized Step Subtitle Bar */}
          {exercise.executionSteps[activeStepIndex] && (
            <div className="px-4 py-2.5 bg-slate-800/95 border-t border-slate-700 text-xs text-blue-100 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[11px] shrink-0">
                {activeStepIndex + 1}단계
              </span>
              <span className="leading-snug">{exercise.executionSteps[activeStepIndex]}</span>
            </div>
          )}

          {/* Player Bottom Control Bar */}
          <div className="p-4 bg-slate-800 border-t border-slate-700/60 space-y-3">
            {/* Progress Bar */}
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-300">
              <span>
                {Math.floor(progressSec / 60)}:{String(progressSec % 60).padStart(2, '0')}
              </span>
              <div
                className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const targetSec = Math.round(clickPos * totalDuration);
                  setProgressSec(targetSec);
                  if (hasRealVideoUrl && !videoError && videoRef.current) {
                    videoRef.current.currentTime = targetSec;
                  }
                }}
              >
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (progressSec / totalDuration) * 100)}%` }}
                />
              </div>
              <span>
                {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}
              </span>
            </div>

            {/* Guide Keypoints & Posture Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">핵심 포인트:</span>
                {exercise.videoPlaceholder.guidePoints.map((point, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-slate-700/80 text-slate-200 px-2.5 py-0.5 rounded-md"
                  >
                    {point}
                  </span>
                ))}
              </div>

              {/* Hold Posture Metronome */}
              <div className="flex items-center gap-2 bg-slate-700/60 px-3 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-slate-300">자세 유지 타이머:</span>
                <span className="text-xs font-bold text-white font-mono tabular-nums">
                  {holdTimer}초
                </span>
                <button
                  type="button"
                  onClick={() => setIsHolding(!isHolding)}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 ml-1 underline"
                >
                  {isHolding ? '정지' : '시작'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHolding(false);
                    setHoldTimer(0);
                  }}
                  className="text-slate-400 hover:text-slate-200"
                  title="타이머 초기화"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. 시작 자세 */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-2.5">
        <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-mono font-bold flex items-center justify-center">
            2
          </span>
          <Info className="w-4 h-4 text-blue-600" />
          <span>시작 자세</span>
        </h2>
        <p className="text-sm text-gray-800 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          {exercise.startPosition}
        </p>
      </section>

      {/* ===================================================================== */}
      {/* 3. 운동 방법 */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-mono font-bold flex items-center justify-center">
              3
            </span>
            <ListChecks className="w-4 h-4 text-blue-600" />
            <span>운동 방법 (단계별 따라 하기)</span>
          </h2>
          <span className="text-[11px] text-gray-500">동작을 눌러 해당 단계부터 확인할 수 있습니다</span>
        </div>

        <div className="space-y-2.5">
          {exercise.executionSteps.map((step, idx) => {
            const isCurrentStep = isPlaying && activeStepIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  const targetSec = Math.floor((idx / exercise.executionSteps.length) * totalDuration);
                  setProgressSec(targetSec);
                }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isCurrentStep
                    ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-200'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono ${
                    isCurrentStep ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'
                  }`}
                >
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">{step}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. 주의사항 */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-3">
        <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-500 text-white text-xs font-mono font-bold flex items-center justify-center">
            4
          </span>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>주의사항</span>
        </h2>

        <ul className="space-y-2 bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-xs sm:text-sm text-gray-800">
          {exercise.precautions.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-amber-600 font-extrabold mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {assignment?.customNotes && (
          <div className="p-4 rounded-xl bg-amber-100/70 border border-amber-300 text-xs sm:text-sm text-amber-950">
            <p className="font-bold mb-1">담당 물리치료사 개별 안내사항</p>
            <p className="leading-relaxed">{assignment.customNotes}</p>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 5. 기존 운동 처방 정보 (횟수·세트·시간) 및 운동 수행 기록 */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-blue-200 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="space-y-3">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-mono font-bold flex items-center justify-center">
              5
            </span>
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span>운동 처방 정보 (횟수·세트·시간)</span>
          </h2>

          {/* Prescription Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-gray-500 block text-[11px]">처방 세트 및 반복 횟수</span>
              <span className="text-base font-extrabold text-blue-900 font-mono tabular-nums mt-0.5 block">
                {defaultSets}세트 × {defaultReps}회
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-gray-500 block text-[11px]">권장 운동 빈도</span>
              <span className="text-base font-extrabold text-blue-900 font-mono tabular-nums mt-0.5 block">
                {defaultFrequency}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-gray-500 block text-[11px]">1세트 권장 수행 시간</span>
              <span className="text-base font-extrabold text-blue-900 font-mono tabular-nums mt-0.5 block">
                약 {exercise.videoPlaceholder.durationSeconds}초
              </span>
            </div>
          </div>

          {/* Exercise Purpose in Easy Korean */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-gray-900">운동 효과: </strong>
              {exercise.purpose}
            </div>
          </div>
        </div>

        {/* Actual Workout Performance Logging Form */}
        <div className="pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">오늘 운동 수행 기록하기</h3>
              <p className="text-xs text-gray-500">
                실제로 수행한 세트 수, 횟수, 운동 중 느낀 통증 정도를 기록해 주세요.
              </p>
            </div>
          </div>

          {formValidationMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {formValidationMsg}
            </div>
          )}

          <form onSubmit={handleSaveLog} className="space-y-5">
            {/* Sets and Reps Steppers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Actual Sets */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  실제 수행 세트 수
                </label>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActualSets(Math.max(1, actualSets - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    aria-label="세트 감소"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-extrabold text-gray-900 font-mono tabular-nums">
                      {actualSets}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">세트</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActualSets(actualSets + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    aria-label="세트 증가"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actual Reps */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  세트당 실제 반복 횟수
                </label>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActualReps(Math.max(1, actualReps - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    aria-label="반복 횟수 감소"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-extrabold text-gray-900 font-mono tabular-nums">
                      {actualReps}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">회</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActualReps(actualReps + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    aria-label="반복 횟수 증가"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Pain Scale (0~10) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  운동 중·운동 후 통증 점수 (0~10점)
                </label>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getPainColor(painLevel)}`}>
                  {getPainLabel(painLevel)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">
                * 0점(통증 전혀 없음)부터 10점(참을 수 없이 심한 통증)까지 느낀 정도를 선택해 주세요.
              </p>

              <div className="grid grid-cols-11 gap-1 pt-2">
                {Array.from({ length: 11 }).map((_, i) => {
                  const isSelected = painLevel === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPainLevel(i)}
                      className={`py-2 text-xs font-bold rounded-lg border font-mono transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-105'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 px-0.5">
                <span>0 (통증 없음)</span>
                <span>5 (중간 통증)</span>
                <span>10 (심한 통증)</span>
              </div>
            </div>

            {/* Patient Self Condition Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                운동 소감 및 메모 (선택 입력)
              </label>
              <textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="예: 3세트 할 때 허리가 조금 뻐근했지만 쉬고 나니 괜찮아졌어요."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{existingLog ? '운동 수행 기록 수정하기' : '운동 완료 기록하기'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Patient Exercise Video Submission & Feedback Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <PatientVideoUploadSection
            patientId={patient.id}
            patientName={patient.name}
            exerciseId={exercise.id}
            exerciseName={exercise.name}
          />
        </div>
      </section>
    </div>
  );
};
