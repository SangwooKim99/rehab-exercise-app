/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  HeartPulse,
  Plus,
  Minus
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

  const [actualSets, setActualSets] = useState<number>(existingLog ? existingLog.actualSets : defaultSets);
  const [actualReps, setActualReps] = useState<number>(existingLog ? existingLog.actualReps : defaultReps);
  const [painLevel, setPainLevel] = useState<number>(existingLog ? existingLog.painLevel : 1);
  const [patientNotes, setPatientNotes] = useState<string>(existingLog?.patientNotes || '');

  // Video Placeholder Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progressSec, setProgressSec] = useState<number>(0);
  const totalDuration = exercise.videoPlaceholder.durationSeconds;

  // Active posture timer / metronome
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressSec((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, totalDuration]);

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

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();

    if (actualSets <= 0 || actualReps <= 0) {
      alert('세트 수와 반복 횟수는 1 이상이어야 합니다.');
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
    if (val <= 3) return `경미한 뻐근함 (${val}점) - 안전한 범위`;
    if (val <= 6) return `중간 정도의 통증 (${val}점) - 가동 범위 주의`;
    return `극심한 통증 (${val}점) - 즉시 중단 권고`;
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

      {/* Main Exercise Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
              <span className="font-semibold text-blue-600">{exercise.category}</span>
              <span aria-hidden="true">·</span>
              <span>타깃: {exercise.targetArea}</span>
              {assignment && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{assignment.frequency}</span>
                </>
              )}
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
            <span className="text-blue-600 block text-[11px] font-semibold">처방 목표</span>
            <span className="text-base font-extrabold font-mono tabular-nums">
              {defaultSets}세트 × {defaultReps}회
            </span>
          </div>
        </div>

        {/* Video Player / Motion Simulation Area */}
        <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden bg-slate-900 text-white">
          {/* Top Video Header Bar */}
          <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-medium text-slate-200">임상 동작 가이드 (시뮬레이션)</span>
            </div>
            <span className="text-[11px] text-slate-400">자세 다이어그램 및 호흡 메트로놈</span>
          </div>

          {/* SVG Movement Illustration Viewport */}
          <div className="relative p-4 sm:p-6 flex flex-col items-center justify-center bg-white">
            <ExerciseSvgGuide
              type={exercise.videoPlaceholder.illustrationType}
              className="w-full max-w-lg h-56 sm:h-64 object-contain"
            />

            {/* Play/Pause Overlay Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label={isPlaying ? '일시정지' : '동작 가이드 재생'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Player Bottom Control Bar */}
          <div className="p-4 bg-slate-800 border-t border-slate-700/60 space-y-3">
            {/* Progress Bar */}
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-300">
              <span>{Math.floor(progressSec / 60)}:{String(progressSec % 60).padStart(2, '0')}</span>
              <div 
                className="flex-1 bg-slate-700 h-1.5 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPos = (e.clientX - rect.left) / rect.width;
                  setProgressSec(Math.round(clickPos * totalDuration));
                }}
              >
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${(progressSec / totalDuration) * 100}%` }}
                />
              </div>
              <span>{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}</span>
            </div>

            {/* Guide Keypoints & Posture Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">핵심 체크:</span>
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
                <span className="text-xs text-slate-300">자세 유지:</span>
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
                  title="타이머 리셋"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notice on Video Placeholder */}
        <p className="text-[11px] text-gray-600 mt-2 text-right">
          ※ 실제 임상 영상 부재 시 정밀 자세 벡터 다이어그램과 동작 가이드가 표시됩니다.
        </p>
      </div>

      {/* Clinical Exercise Guide Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Purpose & Start Position */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              운동 목적 및 치료 목표
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/40 p-3 rounded-xl border border-blue-100">
              {exercise.purpose}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              시작 자세
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed">
              {exercise.startPosition}
            </p>
          </div>

          {/* Precautions */}
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              임상 주의사항
            </h2>
            <ul className="space-y-1.5 text-xs text-gray-600">
              {exercise.precautions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Execution Steps */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 mb-3">
            단계별 수행 방법
          </h2>
          <div className="space-y-3">
            {exercise.executionSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  {idx + 1}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {assignment?.customNotes && (
            <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <p className="font-bold mb-1">담당 물리치료사 개별 지시사항</p>
              <p className="leading-relaxed">{assignment.customNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actual Workout Performance Logging Form */}
      <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">실제 수행 기록 입력</h2>
            <p className="text-xs text-gray-500">
              오늘 실제 수행한 세트, 횟수 및 통증 강도를 입력하고 기록을 완료하세요.
            </p>
          </div>
          <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg font-semibold font-mono tabular-nums">
            처방: {defaultSets}세트 × {defaultReps}회
          </span>
        </div>

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

          {/* Pain Scale (NRS 0~10) */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                운동 중/직후 통증 수준 (NRS 0~10 척도)
              </label>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getPainColor(painLevel)}`}>
                {getPainLabel(painLevel)}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              * 숫자통증등급(NRS): 0점(통증 전혀 없음)부터 10점(상상할 수 있는 극심한 통증)까지 자가 평가합니다.
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
              <span>5 (보통 통증)</span>
              <span>10 (극심한 통증)</span>
            </div>
          </div>

          {/* Patient Self Condition Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              수행 소감 및 특이사항 메모 (선택 입력)
            </label>
            <textarea
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder="예: 3세트째에 허리에 가벼운 당김이 있었으나 휴식 후 호전됨, 무릎 소리 없음 등"
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
              <span>{existingLog ? '운동 수행 기록 갱신하기' : '운동 완료 기록하기'}</span>
            </button>
          </div>
        </form>

        {/* Patient Exercise Video Submission & Feedback Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <PatientVideoUploadSection
            patientId={patient.id}
            patientName={patient.name}
            exerciseId={exercise.id}
            exerciseName={exercise.name}
          />
        </div>
      </div>
    </div>
  );
};
