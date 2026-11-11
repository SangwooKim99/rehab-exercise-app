/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Patient, 
  Exercise, 
  AssignedExercise, 
  WorkoutExecutionStatus, 
  WorkoutDifficulty 
} from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { ExerciseSvgGuide } from '../common/ExerciseSvgGuide';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  HeartPulse,
  Plus,
  Minus,
  Sparkles,
  Info,
  AlertTriangle,
  X,
  Trophy,
  Activity
} from 'lucide-react';

interface GuidedWorkoutSessionProps {
  patient: Patient;
  onClose: () => void;
  onFinishSession: () => void;
}

interface ExerciseDraft {
  status: WorkoutExecutionStatus;
  actualSets: number;
  actualReps: number;
  prePainLevel: number;
  postPainLevel: number;
  difficulty: WorkoutDifficulty;
  notes: string;
}

export const GuidedWorkoutSession: React.FC<GuidedWorkoutSessionProps> = ({
  patient,
  onClose,
  onFinishSession
}) => {
  const library = StorageService.getExerciseLibrary();
  const assigned = patient.assignedProgram;
  const todayStr = StorageService.getTodayDateString();

  // Find first uncompleted exercise or start at 0
  const todayStats = StorageService.getPatientTodayStats(patient.id);
  const initialIndex = Math.max(
    0,
    assigned.findIndex((a) => !todayStats.completedExerciseIds.has(a.exerciseId))
  );

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex >= 0 ? initialIndex : 0);
  const [isCompletedAll, setIsCompletedAll] = useState<boolean>(false);

  // Drafts for each exercise so switching back/next does NOT lose user input!
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>(() => {
    const initialDrafts: Record<string, ExerciseDraft> = {};
    assigned.forEach((assignment) => {
      const exercise = library.find((e) => e.id === assignment.exerciseId);
      const existingLogs = StorageService.getWorkoutLogs(patient.id, todayStr);
      const log = existingLogs.find((l) => l.exerciseId === assignment.exerciseId);

      initialDrafts[assignment.assignmentId] = {
        status: (log?.status as WorkoutExecutionStatus) || (log ? 'completed' : 'completed'),
        actualSets: log ? log.actualSets : assignment.sets,
        actualReps: log ? log.actualReps : assignment.reps,
        prePainLevel: log?.prePainLevel ?? log?.painLevel ?? 1,
        postPainLevel: log?.postPainLevel ?? log?.painLevel ?? 1,
        difficulty: log?.difficulty || '보통',
        notes: log?.patientNotes || ''
      };
    });
    return initialDrafts;
  });

  // Current item
  const currentAssignment = assigned[currentIndex];
  const currentExercise = currentAssignment ? library.find((e) => e.id === currentAssignment.exerciseId) : null;
  const currentDraft = currentAssignment ? drafts[currentAssignment.assignmentId] : null;

  // Posture Hold Metronome State
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [holdTimer, setHoldTimer] = useState<number>(0);

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

  // Reset timer on exercise switch
  useEffect(() => {
    setIsHolding(false);
    setHoldTimer(0);
  }, [currentIndex]);

  const updateCurrentDraft = (field: keyof ExerciseDraft, value: any) => {
    if (!currentAssignment) return;
    setDrafts((prev) => ({
      ...prev,
      [currentAssignment.assignmentId]: {
        ...prev[currentAssignment.assignmentId],
        [field]: value
      }
    }));
  };

  const saveCurrentExerciseLog = () => {
    if (!currentExercise || !currentDraft) return;

    StorageService.addWorkoutLog({
      patientId: patient.id,
      exerciseId: currentExercise.id,
      exerciseName: currentExercise.name,
      date: todayStr,
      completed: currentDraft.status !== 'skipped',
      status: currentDraft.status,
      prescribedSets: currentAssignment.sets,
      prescribedReps: currentAssignment.reps,
      actualSets: currentDraft.status === 'skipped' ? 0 : currentDraft.actualSets,
      actualReps: currentDraft.status === 'skipped' ? 0 : currentDraft.actualReps,
      painLevel: currentDraft.postPainLevel,
      prePainLevel: currentDraft.prePainLevel,
      postPainLevel: currentDraft.postPainLevel,
      difficulty: currentDraft.difficulty,
      patientNotes: currentDraft.notes.trim()
    });
  };

  const handleNext = () => {
    saveCurrentExerciseLog();
    if (currentIndex < assigned.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsCompletedAll(true);
    }
  };

  const handlePrev = () => {
    saveCurrentExerciseLog();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (assigned.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-gray-900">배정된 운동이 없습니다</h3>
        <p className="text-xs text-gray-500">담당 물리치료사가 운동을 처방한 후 시작할 수 있습니다.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          돌아가기
        </button>
      </div>
    );
  }

  // All completed celebration screen
  if (isCompletedAll) {
    const todaySummary = StorageService.getPatientTodayStats(patient.id);
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center space-y-6 shadow-sm animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
          <Trophy className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            오늘의 재활운동 완료!
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-3">
            {patient.name} 님, 수고하셨습니다
          </h2>
          <p className="text-xs text-gray-600 mt-1.5 max-w-md mx-auto leading-relaxed">
            처방된 {assigned.length}개 운동의 수행 기록이 물리치료사 관리자 차트에 안전하게 기록되었습니다.
          </p>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500 block">오늘 완료율</span>
            <span className="text-xl font-extrabold text-blue-600 font-mono tabular-nums">
              {todaySummary.completionRate}%
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500 block">수행한 운동</span>
            <span className="text-xl font-extrabold text-emerald-600 font-mono tabular-nums">
              {todaySummary.completedCount} / {assigned.length}개
            </span>
          </div>
        </div>

        <button
          onClick={onFinishSession}
          className="w-full max-w-xs mx-auto py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (!currentExercise || !currentDraft) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Step Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              if (confirm('운동 세션을 일시 중단하고 나가시겠습니까? (현재까지의 입력은 보존됩니다)')) {
                saveCurrentExerciseLog();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            <X className="w-4 h-4" />
            <span>세션 닫기</span>
          </button>

          <span className="text-xs font-bold font-mono tabular-nums text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            운동 {currentIndex + 1} / {assigned.length}
          </span>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / assigned.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise Visual Guide Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold text-blue-600">{currentExercise.category}</span>
              <span>·</span>
              <span>{currentExercise.targetArea}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">
              {currentIndex + 1}. {currentExercise.name}
            </h1>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2 text-xs text-blue-950 shrink-0 self-start sm:self-auto">
            <span className="text-blue-600 block text-[10px] font-semibold">처방 목표</span>
            <span className="text-sm font-extrabold font-mono tabular-nums">
              {currentAssignment.sets}세트 × {currentAssignment.reps}회
            </span>
          </div>
        </div>

        {/* Anatomical Motion Guide Diagram */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-slate-900">
          <div className="p-4 bg-white flex justify-center">
            <ExerciseSvgGuide
              type={currentExercise.videoPlaceholder.illustrationType}
              className="w-full max-w-md h-52 sm:h-60 object-contain"
            />
          </div>

          {/* Guide Bar & Hold Timer */}
          <div className="p-3.5 bg-slate-800 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px]">핵심:</span>
              {currentExercise.videoPlaceholder.guidePoints.map((point, idx) => (
                <span key={idx} className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-[11px]">
                  {point}
                </span>
              ))}
            </div>

            {/* Posture Hold Metronome */}
            <div className="flex items-center gap-2 bg-slate-700/80 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">자세 유지:</span>
              <span className="font-mono tabular-nums font-bold text-white text-xs">
                {holdTimer}초
              </span>
              <button
                type="button"
                onClick={() => setIsHolding(!isHolding)}
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 ml-1 underline"
              >
                {isHolding ? '정지' : '측정'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsHolding(false);
                  setHoldTimer(0);
                }}
                className="text-slate-400 hover:text-white"
                title="리셋"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-2 pt-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            단계별 수행 방법
          </h2>
          <div className="space-y-1.5">
            {currentExercise.executionSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Precautions */}
        {currentAssignment.customNotes && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>치료사 지시사항:</strong> {currentAssignment.customNotes}
          </div>
        )}
      </div>

      {/* Result Input Form Card (실제 수행 결과 입력) */}
      <div className="bg-white rounded-2xl border border-blue-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">수행 결과 입력</h2>
            <p className="text-xs text-gray-500">실제 수행한 세트와 통증 점수를 기록하세요</p>
          </div>
          <span className="text-xs text-blue-600 font-semibold font-mono tabular-nums">
            처방: {currentAssignment.sets}세트 × {currentAssignment.reps}회
          </span>
        </div>

        {/* 1. Execution Status: 완료 / 부분 수행 / 미수행 */}
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-2">
            운동 수행 상태
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateCurrentDraft('status', 'completed')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                currentDraft.status === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              ✓ 완료 (정상 완료)
            </button>

            <button
              type="button"
              onClick={() => updateCurrentDraft('status', 'partial')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                currentDraft.status === 'partial'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              △ 부분 수행 (세트 축소)
            </button>

            <button
              type="button"
              onClick={() => updateCurrentDraft('status', 'skipped')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                currentDraft.status === 'skipped'
                  ? 'bg-gray-700 text-white border-gray-700 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              ✕ 미수행 (건너뛰기)
            </button>
          </div>
        </div>

        {/* 2. Actual Sets & Reps Steppers (if not skipped) */}
        {currentDraft.status !== 'skipped' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sets */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70">
              <span className="text-xs font-semibold text-gray-700 block mb-2">
                실제 수행 세트 수
              </span>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => updateCurrentDraft('actualSets', Math.max(1, currentDraft.actualSets - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-center font-mono">
                  <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
                    {currentDraft.actualSets}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">세트</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCurrentDraft('actualSets', currentDraft.actualSets + 1)}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reps */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70">
              <span className="text-xs font-semibold text-gray-700 block mb-2">
                세트당 반복 횟수
              </span>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => updateCurrentDraft('actualReps', Math.max(1, currentDraft.actualReps - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-center font-mono">
                  <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
                    {currentDraft.actualReps}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">회</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCurrentDraft('actualReps', currentDraft.actualReps + 1)}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Pain NRS (Pre & Post, 0~10 scale) */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              통증 척도 (NRS 0~10)
            </span>
            <span className="text-[11px] text-gray-500">선택 사항</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Pre Pain */}
            <div>
              <div className="flex justify-between text-gray-600 mb-1.5">
                <span>운동 <strong>전</strong> 통증:</span>
                <span className="font-bold font-mono text-blue-600">NRS {currentDraft.prePainLevel}점</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={currentDraft.prePainLevel}
                onChange={(e) => updateCurrentDraft('prePainLevel', parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0 (통증 없음)</span>
                <span>5 (중등도)</span>
                <span>10 (극심)</span>
              </div>
            </div>

            {/* Post Pain */}
            <div>
              <div className="flex justify-between text-gray-600 mb-1.5">
                <span>운동 <strong>후</strong> 통증:</span>
                <span className="font-bold font-mono text-rose-600">NRS {currentDraft.postPainLevel}점</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={currentDraft.postPainLevel}
                onChange={(e) => updateCurrentDraft('postPainLevel', parseInt(e.target.value))}
                className="w-full accent-rose-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0 (통증 없음)</span>
                <span>5 (중등도)</span>
                <span>10 (극심)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Workout Difficulty */}
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-2">
            체감 난이도
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['쉬움', '보통', '어려움'] as WorkoutDifficulty[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => updateCurrentDraft('difficulty', level)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  currentDraft.difficulty === level
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Special Notes / Memo */}
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">
            특이사항 및 메모 (선택)
          </label>
          <textarea
            value={currentDraft.notes}
            onChange={(e) => updateCurrentDraft('notes', e.target.value)}
            placeholder="동작 시 느낀 점, 관절 소리나 뻐근함 등을 적어주시면 치료사가 점검합니다."
            rows={2}
            className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bottom Flow Stepping Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="py-3 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>이전 운동</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <span>{currentIndex === assigned.length - 1 ? '운동 완료 및 세션 종료' : '기록하고 다음 운동'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
