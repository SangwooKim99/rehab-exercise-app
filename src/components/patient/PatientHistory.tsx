/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Patient, WorkoutLog, ClinicalFeedback } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { getFeedbackAuthorDisplayName } from '../../services/authService';
import { 
  Calendar, 
  CheckCircle2, 
  HeartPulse, 
  Filter, 
  ArrowRight,
  MessageSquare,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface PatientHistoryProps {
  patient: Patient;
  remoteWorkoutLogs?: WorkoutLog[];
  remoteFeedbacks?: ClinicalFeedback[];
  targetWorkoutLogId?: string | null;
  targetFeedbackId?: string | null;
  feedbackTargetRequestKey?: number;
  onFeedbackDisplayed?: (feedback: ClinicalFeedback) => void;
  markingFeedbackIds?: Record<string, boolean>;
  feedbackReadSaveErrors?: Record<string, { code: string; message: string }>;
  onRetryMarkRead?: (feedback: ClinicalFeedback) => void;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({
  patient,
  remoteWorkoutLogs,
  remoteFeedbacks,
  targetWorkoutLogId = null,
  targetFeedbackId = null,
  feedbackTargetRequestKey,
  onFeedbackDisplayed,
  markingFeedbackIds,
  feedbackReadSaveErrors,
  onRetryMarkRead
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const feedbackCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrolledRequestKeyRef = useRef<number | null>(null);
  const adjustedFilterRequestKeyRef = useRef<number | null>(null);
  const displayedFeedbackKeyRef = useRef<string | null>(null);

  const localLogs = StorageService.getWorkoutLogs(patient.id);

  // 로컬 및 원격 운동 수행 기록을 고유 ID 기준으로 안전하게 병합 (최신순)
  const allLogs = useMemo<WorkoutLog[]>(() => {
    const mergedMap = new Map<string, WorkoutLog>();
    for (const log of localLogs) {
      if (log && log.id) {
        mergedMap.set(log.id, log);
      }
    }
    for (const remoteLog of remoteWorkoutLogs || []) {
      if (remoteLog && remoteLog.id && (!remoteLog.patientId || remoteLog.patientId === patient.id)) {
        if (!mergedMap.has(remoteLog.id)) {
          mergedMap.set(remoteLog.id, remoteLog);
        }
      }
    }
    return Array.from(mergedMap.values()).sort(
      (a, b) =>
        new Date(b.loggedAt || b.date || 0).getTime() -
        new Date(a.loggedAt || a.date || 0).getTime()
    );
  }, [localLogs, remoteWorkoutLogs, patient.id]);

  // 원격 feedbacks 컬렉션과 patient.feedbacks를 ID 기준으로 병합 후 workoutLogId별 매핑
  const feedbacksByWorkoutLogId = useMemo<Map<string, ClinicalFeedback[]>>(() => {
    const mergedFeedbackMap = new Map<string, ClinicalFeedback>();
    for (const fb of remoteFeedbacks || []) {
      if (fb && fb.id) {
        mergedFeedbackMap.set(fb.id, fb);
      }
    }
    for (const fb of patient.feedbacks || []) {
      if (fb && fb.id && !mergedFeedbackMap.has(fb.id)) {
        mergedFeedbackMap.set(fb.id, fb);
      }
    }

    const sortedFeedbacks = Array.from(mergedFeedbackMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt || b.date || 0).getTime() -
        new Date(a.createdAt || a.date || 0).getTime()
    );

    const grouped = new Map<string, ClinicalFeedback[]>();
    for (const fb of sortedFeedbacks) {
      const linkedId = typeof fb.workoutLogId === 'string' ? fb.workoutLogId.trim() : '';
      if (!linkedId) continue;
      const existing = grouped.get(linkedId) || [];
      existing.push(fb);
      grouped.set(linkedId, existing);
    }
    return grouped;
  }, [remoteFeedbacks, patient.feedbacks]);

  // Unique dates from logs
  const availableDates = Array.from(new Set(allLogs.map((l) => l.date))).sort().reverse();

  // 특정 workoutLogId로 이동 요청 시 날짜 필터 때문에 기록이 숨겨지지 않도록 요청 키당 1회 조정
  useEffect(() => {
    if (!targetWorkoutLogId || !feedbackTargetRequestKey) return;
    if (adjustedFilterRequestKeyRef.current === feedbackTargetRequestKey) return;

    const matchedLog = allLogs.find((l) => l.id === targetWorkoutLogId);
    if (!matchedLog) return;

    adjustedFilterRequestKeyRef.current = feedbackTargetRequestKey;
    if (selectedDate !== 'all' && selectedDate !== matchedLog.date) {
      setSelectedDate('all');
    }
  }, [targetWorkoutLogId, feedbackTargetRequestKey, allLogs, selectedDate]);

  const filteredLogs = selectedDate === 'all'
    ? allLogs
    : allLogs.filter((l) => l.date === selectedDate);

  // 대상 운동 기록 카드가 화면에 노출되면 자동 스크롤 (요청 키당 1회)
  useEffect(() => {
    if (!targetWorkoutLogId || !feedbackTargetRequestKey) return;
    if (scrolledRequestKeyRef.current === feedbackTargetRequestKey) return;

    const isTargetVisible = filteredLogs.some((l) => l.id === targetWorkoutLogId);
    if (!isTargetVisible) return;

    const rafId = window.requestAnimationFrame(() => {
      const targetEl = cardRefs.current[targetWorkoutLogId];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrolledRequestKeyRef.current = feedbackTargetRequestKey;
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [targetWorkoutLogId, feedbackTargetRequestKey, filteredLogs]);

  // 실제 피드백 본문과 DOM 카드가 화면에 렌더링된 것이 확인된 후에만 onFeedbackDisplayed 1회 호출
  useEffect(() => {
    if (!onFeedbackDisplayed || !targetWorkoutLogId || !targetFeedbackId || !feedbackTargetRequestKey) {
      return;
    }

    const displayGuardKey = `${patient.id}:${feedbackTargetRequestKey}:${targetFeedbackId}`;
    if (displayedFeedbackKeyRef.current === displayGuardKey) return;

    const isTargetLogVisible = filteredLogs.some((l) => l.id === targetWorkoutLogId);
    if (!isTargetLogVisible) return;

    const linkedFeedbacks = feedbacksByWorkoutLogId.get(targetWorkoutLogId) || [];
    const targetFeedback = linkedFeedbacks.find((fb) => fb.id === targetFeedbackId);
    if (!targetFeedback || !targetFeedback.content || !targetFeedback.content.trim()) return;

    const ownerId = (targetFeedback as ClinicalFeedback & { patientId?: string }).patientId;
    if (ownerId && ownerId !== patient.id) return;

    const rafId = window.requestAnimationFrame(() => {
      if (displayedFeedbackKeyRef.current === displayGuardKey) return;
      const feedbackEl = feedbackCardRefs.current[targetFeedbackId];
      if (!feedbackEl || !feedbackEl.isConnected) return;

      displayedFeedbackKeyRef.current = displayGuardKey;
      onFeedbackDisplayed(targetFeedback);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [
    onFeedbackDisplayed,
    patient.id,
    targetWorkoutLogId,
    targetFeedbackId,
    feedbackTargetRequestKey,
    filteredLogs,
    feedbacksByWorkoutLogId
  ]);

  // Calculate summary metrics
  const totalCompleted = allLogs.filter((l) => l.completed).length;
  const avgPain = allLogs.length > 0
    ? (allLogs.reduce((acc, curr) => acc + curr.painLevel, 0) / allLogs.length).toFixed(1)
    : '0';

  const getPainBadge = (val: number) => {
    if (val === 0) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: `VAS ${val} (무통)` };
    if (val <= 3) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: `VAS ${val} (경미)` };
    if (val <= 6) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: `VAS ${val} (보통)` };
    return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: `VAS ${val} (심함)` };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & KPI Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {patient.name} 님의 재활 운동 기록
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              날짜별 운동 수행 내역 및 통증 변화 추이를 확인합니다.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 self-start sm:self-auto font-mono tabular-nums">
            누적 기록 {allLogs.length}건
          </span>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block">총 완료한 운동</span>
            <span className="text-2xl font-extrabold text-gray-900 font-mono tabular-nums">
              {totalCompleted}
              <span className="text-xs font-normal text-gray-500 ml-1">건</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block">운동 수행 일수</span>
            <span className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums">
              {availableDates.length}
              <span className="text-xs font-normal text-blue-400 ml-1">일간</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block">평균 통증 점수 (VAS)</span>
            <span className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
              {avgPain}
              <span className="text-xs font-normal text-amber-400 ml-1">/ 10</span>
            </span>
          </div>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-100 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-gray-500 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> 날짜 필터:
          </span>
          <button
            onClick={() => setSelectedDate('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedDate === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체 보기 ({allLogs.length})
          </button>
          {availableDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap font-mono tabular-nums transition-colors ${
                selectedDate === date
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {date}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700">해당 날짜의 운동 기록이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">
            홈 또는 내 운동 프로그램 탭에서 오늘의 운동을 기록해보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const painBadge = getPainBadge(log.painLevel);
            const timeStr = log.loggedAt ? new Date(log.loggedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
            const linkedFeedbacks = feedbacksByWorkoutLogId.get(log.id) || [];
            const isHighlightedLog = Boolean(targetWorkoutLogId && log.id === targetWorkoutLogId);

            return (
              <div
                key={log.id}
                ref={(el) => {
                  cardRefs.current[log.id] = el;
                }}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-colors ${
                  isHighlightedLog
                    ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/15'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span className="font-mono tabular-nums font-semibold text-gray-700">{log.date}</span>
                      {timeStr && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{timeStr}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 완료
                      </span>
                      {isHighlightedLog && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-blue-700">선택한 피드백 연결 기록</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-gray-900">
                      {log.exerciseName}
                    </h3>

                    {/* Prescribed vs Actual */}
                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap pt-1 font-mono tabular-nums">
                      <span>
                        처방 목표: <strong className="text-gray-900">{log.prescribedSets}세트 × {log.prescribedReps}회</strong>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        실제 수행: <strong className="text-blue-600">{log.actualSets}세트 × {log.actualReps}회</strong>
                      </span>
                    </div>

                    {log.patientNotes && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">
                        <span className="font-semibold text-gray-700 mr-1">수행 메모:</span>
                        {log.patientNotes}
                      </p>
                    )}
                  </div>

                  {/* Right: Pain Badge */}
                  <div className="shrink-0 self-start sm:self-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${painBadge.bg}`}>
                      <HeartPulse className="w-3.5 h-3.5" />
                      {painBadge.text}
                    </span>
                  </div>
                </div>

                {/* Linked Clinical Feedbacks for this WorkoutLog */}
                {linkedFeedbacks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span>물리치료사 피드백 ({linkedFeedbacks.length}건)</span>
                    </div>

                    <div className="space-y-2">
                      {linkedFeedbacks.map((fb) => {
                        const isTargetFeedback = Boolean(targetFeedbackId && fb.id === targetFeedbackId);
                        const authorName = getFeedbackAuthorDisplayName(fb, patient);
                        const writtenDate = fb.date || (fb.createdAt ? fb.createdAt.slice(0, 10) : '');
                        const isMarkingRead = Boolean(markingFeedbackIds?.[fb.id]);
                        const readSaveError = feedbackReadSaveErrors?.[fb.id] || null;

                        return (
                          <div
                            key={fb.id}
                            ref={(el) => {
                              feedbackCardRefs.current[fb.id] = el;
                            }}
                            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                              isTargetFeedback
                                ? 'bg-blue-50/60 border-blue-300'
                                : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900">{authorName}</span>
                                {isTargetFeedback && (
                                  <>
                                    <span className="text-gray-400" aria-hidden="true">·</span>
                                    <span className="font-semibold text-blue-700">선택한 피드백</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500 font-mono tabular-nums">
                                {writtenDate}
                              </span>
                            </div>

                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                              {fb.content}
                            </p>

                            {fb.recommendation && fb.recommendation.trim() && (
                              <p className="text-xs text-blue-800 bg-blue-50/80 px-3 py-2 rounded-lg border border-blue-100 leading-relaxed">
                                <strong className="font-semibold">권장 사항:</strong> {fb.recommendation.trim()}
                              </p>
                            )}

                            {isMarkingRead && !readSaveError && (
                              <p className="text-[11px] text-blue-600">
                                읽음 상태를 저장하는 중입니다...
                              </p>
                            )}

                            {readSaveError && (
                              <div className="pt-2 border-t border-rose-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50/80 rounded-lg px-3 py-2.5 border border-rose-200">
                                <div className="flex items-start gap-2 text-rose-800 min-w-0">
                                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-xs font-semibold text-rose-900">
                                      읽음 상태 저장 실패
                                    </p>
                                    <p className="text-[11px] text-rose-700 leading-relaxed break-words">
                                      {readSaveError.message}
                                    </p>
                                  </div>
                                </div>
                                {onRetryMarkRead && (
                                  <button
                                    type="button"
                                    disabled={isMarkingRead}
                                    onClick={() => onRetryMarkRead(fb)}
                                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isMarkingRead ? 'animate-spin' : ''}`} />
                                    <span>{isMarkingRead ? '저장 중...' : '다시 시도'}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
