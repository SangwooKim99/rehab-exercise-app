/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Patient, AuthUser, WorkoutLog, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { FirebaseService } from '../../services/firebaseService';
import { getFirebaseAuth } from '../../services/firebase';
import { formatTherapistDisplayName, getFeedbackAuthorDisplayName } from '../../services/authService';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  FileEdit,
  Loader2,
  MessageSquare,
  Send,
  UserX,
  Video,
  X
} from 'lucide-react';
import { TherapistVideoReviewSection } from './TherapistVideoReviewSection';
import { PatientSoapSection } from './PatientSoapSection';
import { DisconnectConfirmModal } from '../common/DisconnectConfirmModal';
import { EditDiagnosisModal } from '../common/EditDiagnosisModal';

type ChartTab = 'info' | 'soap' | 'activity';
type ActivitySubTab = 'logs' | 'videos' | 'feedback';

interface TherapistPatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
  onNavigateToProgramEditor: (patientId: string) => void;
  onFeedbackSaved: () => void;
  currentUser?: AuthUser;
  onPatientDisconnected?: (patientName: string) => void;
  onPatientUpdated?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  initialTab?: ChartTab;
  initialActivitySubTab?: ActivitySubTab;
  targetWorkoutLogId?: string | null;
  navigationRequestKey?: number;
}

function getConnectionStatusDisplay(status: string): { label: string; textClass: string } {
  switch (status) {
    case 'connected':
      return { label: '연결 완료', textClass: 'text-emerald-700' };
    case 'pending':
      return { label: '승인 대기', textClass: 'text-amber-700' };
    case 'rejected':
      return { label: '요청 거절', textClass: 'text-rose-600' };
    case 'disconnected':
      return { label: '연결 해제됨', textClass: 'text-gray-500' };
    default:
      return { label: '미연결', textClass: 'text-gray-500' };
  }
}

export const TherapistPatientDetailView: React.FC<TherapistPatientDetailViewProps> = ({
  patient,
  onBack,
  onNavigateToProgramEditor,
  onFeedbackSaved,
  currentUser,
  onPatientDisconnected,
  onPatientUpdated,
  onDirtyChange,
  initialTab,
  initialActivitySubTab,
  targetWorkoutLogId,
  navigationRequestKey
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>(initialTab || 'info');
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>(
    initialActivitySubTab || 'logs'
  );
  const [selectedWorkoutLogId, setSelectedWorkoutLogId] = useState<string | null>(
    targetWorkoutLogId || null
  );
  const [requestedTargetLogId, setRequestedTargetLogId] = useState<string | null>(
    targetWorkoutLogId || null
  );
  const [selectedVideoSubmissionId, setSelectedVideoSubmissionId] = useState<string | null>(null);
  const [remoteLogs, setRemoteLogs] = useState<WorkoutLog[]>([]);
  const [isLoadingRemoteLogs, setIsLoadingRemoteLogs] = useState<boolean>(false);
  const [showEditDiagnosisModal, setShowEditDiagnosisModal] = useState<boolean>(false);
  const [hasUnsavedSoapChanges, setHasUnsavedSoapChanges] = useState<boolean>(false);
  const [pendingChartExitAction, setPendingChartExitAction] = useState<
    | { type: 'tab'; tab: ChartTab }
    | { type: 'disconnect' }
    | null
  >(null);

  const lastPrefilledLogIdRef = useRef<string | null>(null);
  const selectedLogDetailRef = useRef<HTMLDivElement | null>(null);

  // 연결 해제 모달 상태
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  // 임상 피드백 작성 상태
  const [newFeedbackContent, setNewFeedbackContent] = useState<string>('');
  const [newRecommendation, setNewRecommendation] = useState<string>('');
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string>('');
  const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState<string>('');

  const handleSoapDirtyChange = useCallback(
    (dirty: boolean) => {
      setHasUnsavedSoapChanges(dirty);
      onDirtyChange?.(dirty);
    },
    [onDirtyChange]
  );

  // 환자 전환 시 이전 환자의 초안/선택/원격 로그 상태 초기화
  useEffect(() => {
    setHasUnsavedSoapChanges(false);
    setPendingChartExitAction(null);
    setNewFeedbackContent('');
    setNewRecommendation('');
    setFeedbackSuccessMsg('');
    setFeedbackErrorMsg('');
    setSelectedVideoSubmissionId(null);
    lastPrefilledLogIdRef.current = null;
    onDirtyChange?.(false);
    return () => {
      onDirtyChange?.(false);
    };
  }, [patient.id, onDirtyChange]);

  // 외부 네비게이션 요청(예: 대시보드 최근 운동 수행 기록 클릭)에 따른 탭·대상 기록 동기화
  useEffect(() => {
    setActiveTab(initialTab || 'info');
    setActivitySubTab(initialActivitySubTab || 'logs');
    setSelectedWorkoutLogId(targetWorkoutLogId || null);
    setRequestedTargetLogId(targetWorkoutLogId || null);
    setSelectedVideoSubmissionId(null);
    lastPrefilledLogIdRef.current = null;
  }, [patient.id, initialTab, initialActivitySubTab, targetWorkoutLogId, navigationRequestKey]);

  const library = StorageService.getExerciseLibrary();
  const localLogs = StorageService.getWorkoutLogs(patient.id);
  const submittedVideos = StorageService.getVideoSubmissions(patient.id);
  const pendingVideosCount = submittedVideos.filter((v) => v.status === 'pending_review').length;

  // 실제 Firestore connection 상태 우선 반영 (pending, connected, rejected, disconnected)
  const activeConnection = StorageService.getActiveConnection(patient.id, currentUser);
  const connectionStatus = activeConnection?.status || patient.connectionStatus || 'not_connected';
  const isConnected = connectionStatus === 'connected';
  const isDisconnected = connectionStatus === 'disconnected';
  const statusDisplay = getConnectionStatusDisplay(connectionStatus);
  const connectionId = activeConnection?.connectionId || (isDisconnected ? '연결 해제됨' : undefined);

  // 비동기 Firestore 수행 기록 조회(읽기 전용)로 로컬 캐시에 아직 없는 기록도 안전하게 매칭
  useEffect(() => {
    let isCancelled = false;
    setRemoteLogs([]);

    if (!isConnected || !patient.id) {
      setIsLoadingRemoteLogs(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      setIsLoadingRemoteLogs(false);
      return;
    }

    setIsLoadingRemoteLogs(true);
    FirebaseService.getWorkoutLogs(patient.id)
      .then((fetched) => {
        if (isCancelled) return;
        const validPatientLogs = (fetched || []).filter(
          (item) => item && typeof item.id === 'string' && item.patientId === patient.id
        );
        setRemoteLogs(validPatientLogs);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('Async workout logs lookup deferred:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingRemoteLogs(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [patient.id, isConnected]);

  // 현재 환자(patient.id)의 로컬·원격 수행 기록을 고유 ID(log.id) 기준으로 병합
  const logs = useMemo(() => {
    const byId = new Map<string, WorkoutLog>();
    for (const item of remoteLogs) {
      if (item && item.id && item.patientId === patient.id) {
        byId.set(item.id, item);
      }
    }
    for (const item of localLogs) {
      if (item && item.id && item.patientId === patient.id) {
        byId.set(item.id, item);
      }
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    );
  }, [localLogs, remoteLogs, patient.id]);

  // 클릭/전달된 고유 log.id로 정확한 단일 회차 기록 식별 (다른 환자 기록 절대 차단)
  const selectedLog = useMemo(() => {
    if (!selectedWorkoutLogId) return null;
    return logs.find((item) => item.id === selectedWorkoutLogId && item.patientId === patient.id) || null;
  }, [logs, selectedWorkoutLogId, patient.id]);

  const isWaitingForTargetLog =
    Boolean(requestedTargetLogId) && !selectedLog && isLoadingRemoteLogs;
  const isTargetLogNotFound =
    Boolean(requestedTargetLogId) && !selectedLog && !isLoadingRemoteLogs;

  // 선택된 운동 기록이 확정되면 기존 피드백 작성 컨텍스트 1회 자동 채움
  useEffect(() => {
    if (!selectedLog) return;
    if (lastPrefilledLogIdRef.current === selectedLog.id) return;
    lastPrefilledLogIdRef.current = selectedLog.id;
    const painScore = selectedLog.postPainLevel ?? selectedLog.painLevel;
    setNewFeedbackContent(
      `[${selectedLog.date} ${selectedLog.exerciseName}] 통증 NRS ${painScore}/10 확인했습니다. `
    );
    setFeedbackErrorMsg('');
  }, [selectedLog?.id, navigationRequestKey]);

  // 선택된 운동 기록 상세 영역으로 자연스럽게 스크롤
  useEffect(() => {
    if (activeTab === 'activity' && activitySubTab === 'logs' && selectedLog?.id) {
      selectedLogDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTab, activitySubTab, selectedLog?.id]);

  const handleSelectWorkoutLog = (log: WorkoutLog) => {
    if (log.patientId !== patient.id) return;
    setSelectedWorkoutLogId(log.id);
    setRequestedTargetLogId(null);
    setFeedbackSuccessMsg('');
    setFeedbackErrorMsg('');
    if (lastPrefilledLogIdRef.current === log.id && !newFeedbackContent.trim()) {
      const painScore = log.postPainLevel ?? log.painLevel;
      setNewFeedbackContent(
        `[${log.date} ${log.exerciseName}] 통증 NRS ${painScore}/10 확인했습니다. `
      );
    }
  };

  const handleClearSelectedWorkoutLog = () => {
    setSelectedWorkoutLogId(null);
    setRequestedTargetLogId(null);
    lastPrefilledLogIdRef.current = null;
  };

  const handleRequestTabSwitch = (nextTab: ChartTab) => {
    if (nextTab === activeTab) return;
    if (activeTab === 'soap' && hasUnsavedSoapChanges) {
      setPendingChartExitAction({ type: 'tab', tab: nextTab });
      return;
    }
    setActiveTab(nextTab);
  };

  const handleRequestBack = () => {
    onBack();
  };

  const handleRequestDisconnect = () => {
    if (activeTab === 'soap' && hasUnsavedSoapChanges) {
      setPendingChartExitAction({ type: 'disconnect' });
      return;
    }
    setIsDisconnectModalOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await StorageService.disconnectPatient(patient.id, currentUser, activeConnection?.connectionId);
      setIsDisconnecting(false);
      setIsDisconnectModalOpen(false);
      if (res.success) {
        handleSoapDirtyChange(false);
        if (onPatientDisconnected) {
          onPatientDisconnected(patient.name);
        }
        onBack();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      setIsDisconnecting(false);
      alert(`연결 해제 실패: ${err?.message || '오류 발생'}`);
    }
  };

  const handleSaveFeedback = async (
    e: React.FormEvent,
    contextLog?: WorkoutLog | null
  ) => {
    e.preventDefault();
    if (!newFeedbackContent.trim() || isDisconnected) return;

    if (!isConnected) {
      setFeedbackErrorMsg('담당 환자와 정상 연결된 상태에서만 피드백을 작성할 수 있습니다.');
      return;
    }

    let linkedWorkoutLogId: string | undefined;
    if (contextLog) {
      if (!contextLog.id || contextLog.patientId !== patient.id) {
        setFeedbackErrorMsg(
          '선택한 운동 수행 기록이 현재 환자의 기록과 일치하지 않아 피드백을 저장할 수 없습니다.'
        );
        return;
      }
      linkedWorkoutLogId = contextLog.id;
    }

    setIsSavingFeedback(true);
    setFeedbackSuccessMsg('');
    setFeedbackErrorMsg('');

    try {
      const auth = getFirebaseAuth();
      const therapistUid = auth?.currentUser?.uid || currentUser?.id || '';
      let therapistRawName = currentUser?.name || '';

      if (therapistUid) {
        try {
          const remoteName = await FirebaseService.getTherapistRealName(therapistUid);
          if (remoteName) {
            therapistRawName = remoteName;
          }
        } catch (fetchErr) {
          console.warn('Therapist name lookup deferred:', fetchErr);
        }
      }

      if (!therapistRawName) {
        therapistRawName = currentUser?.name || patient.therapistName || '물리치료사';
      }

      const formattedName = formatTherapistDisplayName(therapistRawName);

      await StorageService.addClinicalFeedback(
        patient.id,
        {
          content: newFeedbackContent,
          recommendation: newRecommendation,
          ...(linkedWorkoutLogId ? { workoutLogId: linkedWorkoutLogId } : {})
        },
        formattedName,
        therapistUid
      );

      setNewFeedbackContent('');
      setNewRecommendation('');
      setFeedbackSuccessMsg(`'${formattedName}' 명의로 임상 피드백이 저장되어 대상자의 화면에 즉시 전달되었습니다.`);
      setTimeout(() => setFeedbackSuccessMsg(''), 4000);
      onFeedbackSaved();
    } catch (err: any) {
      setFeedbackErrorMsg(`피드백 저장 실패: ${err?.message || '권한 또는 네트워크 오류'}`);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const mainTabs: { id: ChartTab; label: string }[] = [
    { id: 'info', label: '기본 정보' },
    { id: 'soap', label: 'SOAP 노트' },
    { id: 'activity', label: '운동 기록' }
  ];

  const activityTabs: { id: ActivitySubTab; label: string }[] = [
    { id: 'logs', label: `수행 기록 (${logs.length})` },
    {
      id: 'videos',
      label:
        pendingVideosCount > 0
          ? `제출 영상 (${submittedVideos.length} · ${pendingVideosCount}건 대기)`
          : `제출 영상 (${submittedVideos.length})`
    },
    { id: 'feedback', label: `피드백 (${patient.feedbacks?.length || 0})` }
  ];

  // 기존 임상 피드백 작성 폼 재사용 렌더러 (기존 StorageService.addClinicalFeedback -> FirebaseService.saveFeedback 경로 유지)
  const renderClinicalFeedbackForm = (
    idPrefix: string,
    headingText: string = '임상 피드백 작성',
    contextLog?: WorkoutLog | null
  ) => (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">{headingText}</h2>

      {feedbackSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
          {feedbackSuccessMsg}
        </div>
      )}

      {feedbackErrorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 font-medium">
          {feedbackErrorMsg}
        </div>
      )}

      <form onSubmit={(e) => handleSaveFeedback(e, contextLog)} className="space-y-4">
        <div>
          <label
            htmlFor={`${idPrefix}-feedback-content`}
            className="text-xs font-medium text-gray-700 block mb-1.5"
          >
            운동 소견 및 지도 코멘트 <span className="text-rose-500">*</span>
          </label>
          <textarea
            id={`${idPrefix}-feedback-content`}
            value={newFeedbackContent}
            onChange={(e) => setNewFeedbackContent(e.target.value)}
            disabled={isDisconnected || isSavingFeedback}
            placeholder="예: 수행 기록상 브리지 시 통증(NRS 1)이 양호합니다. 허리 과신전에 계속 주의하며 호흡을 유지하세요."
            rows={3}
            className="w-full text-sm p-3 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-gray-50 disabled:text-gray-400"
            required
          />
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-feedback-recommendation`}
            className="text-xs font-medium text-gray-700 block mb-1.5"
          >
            권장 처방 및 일상 수칙 (선택)
          </label>
          <input
            id={`${idPrefix}-feedback-recommendation`}
            type="text"
            value={newRecommendation}
            onChange={(e) => setNewRecommendation(e.target.value)}
            disabled={isDisconnected || isSavingFeedback}
            placeholder="예: 내일도 동일 세트 수로 진행하시고 1시간 좌식 후 기립 스트레칭을 병행하세요."
            className="w-full text-sm p-2.5 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSavingFeedback || isDisconnected}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSavingFeedback ? '피드백 전송 중...' : '피드백 전송 및 차트 저장'}
            </span>
          </button>
        </div>
      </form>
    </section>
  );

  // 기존 임상 피드백 이력 재사용 렌더러
  const renderFeedbackHistory = (contextLog?: WorkoutLog | null) => {
    const feedbacks = patient.feedbacks || [];
    const contextTag = contextLog ? `[${contextLog.date} ${contextLog.exerciseName}]` : '';
    const isFeedbackMatchedToContext = (fb: (typeof feedbacks)[number]): boolean => {
      if (!contextLog) return false;
      if (fb.workoutLogId) {
        return fb.workoutLogId === contextLog.id;
      }
      return Boolean(contextTag && fb.content.includes(contextTag));
    };
    const matchingCount = contextLog
      ? feedbacks.filter((fb) => isFeedbackMatchedToContext(fb)).length
      : 0;

    return (
      <section className="pt-6 border-t border-gray-200 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900">
            피드백 이력 ({feedbacks.length}건)
          </h2>
          {contextLog && matchingCount > 0 && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              이 기록 관련 피드백 {matchingCount}건 작성됨
            </span>
          )}
        </div>

        {feedbacks.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 border-t border-b border-gray-100">
            아직 등록된 피드백이 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 border-t border-b border-gray-200">
            {feedbacks.map((fb) => {
              const isExactLinked = Boolean(contextLog && fb.workoutLogId === contextLog.id);
              const isRelatedToSelectedLog = isFeedbackMatchedToContext(fb);
              return (
                <div
                  key={fb.id}
                  className={`py-4 space-y-1.5 text-sm ${
                    isRelatedToSelectedLog ? 'bg-blue-50/40 -mx-3 px-3 rounded-lg' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {getFeedbackAuthorDisplayName(fb, patient)}
                      </span>
                      {isExactLinked ? (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          이 기록 연결됨
                        </span>
                      ) : isRelatedToSelectedLog ? (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          이 기록 관련
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-gray-400 font-mono tabular-nums">
                      {fb.date}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{fb.content}</p>
                  {fb.recommendation && (
                    <p className="text-xs text-blue-700 pt-0.5">
                      권장 사항: {fb.recommendation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <div className="bg-white border border-gray-200 rounded-2xl px-6 py-6 sm:px-8 sm:py-7">
        {/* 1. 간결한 평면 상단 헤더 */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={handleRequestBack}
              className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-blue-50/80 border border-gray-200 hover:border-blue-200 transition-colors cursor-pointer shrink-0"
              title="이전 화면으로 이동"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-[25px] h-[25px] shrink-0" strokeWidth={2.5} />
            </button>

            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {patient.name}
                </h1>
                <span className="text-sm text-gray-500">
                  {patient.gender} · 만 {patient.age}세
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap text-sm">
                <span className="text-gray-500">진단명</span>
                <span className="font-medium text-gray-900">
                  {formatPatientDiagnosis(patient.diagnosis)}
                </span>
                <span className="text-gray-300" aria-hidden="true">·</span>
                <span className={`font-medium ${statusDisplay.textClass}`}>
                  {statusDisplay.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {isConnected && (
              <button
                type="button"
                onClick={() => setShowEditDiagnosisModal(true)}
                className="px-3 py-2 text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/60 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>진단명 수정</span>
              </button>
            )}

            {isConnected && (
              <button
                type="button"
                onClick={handleRequestDisconnect}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="환자 연결 해제 (운동 기록 보존)"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>연결 해제</span>
              </button>
            )}
          </div>
        </header>

        {/* 연결 해제 안내 문구 */}
        {isDisconnected && (
          <div className="py-3 border-b border-gray-200 text-xs text-amber-800">
            현재 연결이 해제된 환자입니다. 새로운 운동 처방 및 피드백 작성은 제한되며, 기존 수행 기록과 처방 이력만 열람할 수 있습니다.
          </div>
        )}

        {/* 2. 얇은 밑줄형 3개 탭 */}
        <nav className="flex items-center gap-8 border-b border-gray-200" aria-label="환자 차트 섹션">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleRequestTabSwitch(tab.id)}
                className={`py-3.5 text-sm transition-colors cursor-pointer border-b-2 -mb-px ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* 3. 선택된 탭 본문 */}
        <div className="pt-8">
          {/* Tab 1: 기본 정보 */}
          {activeTab === 'info' && (
            <div className="space-y-10">
              {/* 임상 기본 정보 */}
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  임상 기본 정보
                </h2>
                <dl className="divide-y divide-gray-100 border-t border-b border-gray-200 text-sm">
                  <div className="py-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <dt className="text-gray-500 font-medium">환자 성명 / 인적</dt>
                    <dd className="sm:col-span-3 text-gray-900">
                      {patient.name} ({patient.gender} · 만 {patient.age}세)
                    </dd>
                  </div>

                  <div className="py-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <dt className="text-gray-500 font-medium">진단명</dt>
                    <dd className="sm:col-span-3 flex items-center justify-between gap-4">
                      <span className="text-gray-900 font-medium">
                        {formatPatientDiagnosis(patient.diagnosis)}
                      </span>
                      {isConnected && (
                        <button
                          type="button"
                          onClick={() => setShowEditDiagnosisModal(true)}
                          className="text-xs font-medium text-blue-600 hover:underline cursor-pointer shrink-0"
                        >
                          수정
                        </button>
                      )}
                    </dd>
                  </div>

                  <div className="py-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <dt className="text-gray-500 font-medium">재활 목표</dt>
                    <dd className="sm:col-span-3 text-gray-900">
                      {patient.targetGoal || '미설정'}
                    </dd>
                  </div>

                  <div className="py-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <dt className="text-gray-500 font-medium">연결 상태</dt>
                    <dd className="sm:col-span-3 flex items-center justify-between gap-4">
                      <span className={`font-medium ${statusDisplay.textClass}`}>
                        {statusDisplay.label}
                        {isConnected && (currentUser?.name || patient.therapistName)
                          ? ` (${currentUser?.name || patient.therapistName} 담당)`
                          : ''}
                      </span>
                    </dd>
                  </div>

                  <div className="py-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <dt className="text-gray-500 font-medium">치료사 메모</dt>
                    <dd className="sm:col-span-3 text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {patient.therapistNotes?.trim() || '등록된 치료사 메모가 없습니다.'}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* 현재 운동 처방 요약 */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    현재 처방 프로그램 ({patient.assignedProgram.length}종)
                  </h2>
                  {!isDisconnected && (
                    <button
                      type="button"
                      onClick={() => onNavigateToProgramEditor(patient.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>운동 처방 화면에서 편집</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {patient.assignedProgram.length === 0 ? (
                  <div className="py-10 border-t border-b border-gray-200 text-center space-y-2">
                    <p className="text-sm text-gray-500">아직 배정된 운동 처방이 없습니다.</p>
                    {!isDisconnected && (
                      <button
                        type="button"
                        onClick={() => onNavigateToProgramEditor(patient.id)}
                        className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        운동 처방 화면으로 이동
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border-t border-b border-gray-200">
                    {patient.assignedProgram.map((assignment, index) => {
                      const exercise = library.find((e) => e.id === assignment.exerciseId);
                      if (!exercise) return null;

                      return (
                        <div
                          key={assignment.assignmentId}
                          className="py-3.5 flex items-start justify-between gap-4 text-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-mono text-xs text-gray-400 tabular-nums">
                                {index + 1}.
                              </span>
                              <span className="font-semibold text-gray-900">{exercise.name}</span>
                              <span className="text-xs text-gray-500">
                                {exercise.category} · {exercise.targetArea}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600 font-mono tabular-nums">
                              <span>{assignment.sets}세트 × {assignment.reps}회</span>
                              <span className="font-sans">{assignment.frequency}</span>
                            </div>
                            {assignment.customNotes && (
                              <p className="text-xs text-gray-600 pt-0.5">
                                지시사항: {assignment.customNotes}
                              </p>
                            )}
                          </div>

                          <span className="text-xs text-gray-400 font-mono tabular-nums shrink-0">
                            {assignment.assignedDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Tab 2: SOAP 노트 */}
          {activeTab === 'soap' && (
            <PatientSoapSection
              patientId={patient.id}
              currentUser={currentUser}
              isConnected={isConnected}
              isDisconnected={isDisconnected}
              onDirtyChange={handleSoapDirtyChange}
            />
          )}

          {/* Tab 3: 운동 기록 */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* 3개 하위 메뉴 */}
              <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                {activityTabs.map((sub) => {
                  const isSubActive = activitySubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActivitySubTab(sub.id)}
                      className={`px-3.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                        isSubActive
                          ? 'bg-white text-gray-900 font-semibold'
                          : 'text-gray-600 hover:text-gray-900 font-medium'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>

              {/* 하위 메뉴 1: 수행 기록 */}
              {activitySubTab === 'logs' && (
                <div className="space-y-6">
                  {/* 비동기 로딩 중 선택 대상 대기 안내 */}
                  {isWaitingForTargetLog && (
                    <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center gap-3 text-xs text-blue-900">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      <span>선택한 운동 수행 기록을 불러오는 중입니다...</span>
                    </div>
                  )}

                  {/* 대상 기록 미조회/삭제 예외 안내 */}
                  {isTargetLogNotFound && (
                    <div
                      role="alert"
                      className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-semibold">선택한 운동 수행 기록을 찾을 수 없습니다.</p>
                          <p className="text-amber-800">
                            해당 기록이 삭제되었거나 현재 환자의 기록으로 조회되지 않습니다. 아래 수행 기록 목록에서 다른 회차를 선택해 주세요.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedWorkoutLog}
                        className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 cursor-pointer shrink-0 self-end sm:self-center"
                      >
                        안내 닫기
                      </button>
                    </div>
                  )}

                  {/* 선택된 단일 운동 수행 기록 상세 + 기존 임상 피드백 작성 UI */}
                  {selectedLog && (() => {
                    const selectedTime = selectedLog.loggedAt
                      ? new Date(selectedLog.loggedAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '';
                    const selectedPainScore = selectedLog.postPainLevel ?? selectedLog.painLevel;
                    const selectedStatusText =
                      selectedLog.status === 'skipped'
                        ? '미수행'
                        : selectedLog.status === 'partial'
                          ? '부분 수행'
                          : '정상 완료';
                    const selectedStatusBadge =
                      selectedLog.status === 'skipped'
                        ? 'bg-gray-100 text-gray-700'
                        : selectedLog.status === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800';
                    const matchingVideos = submittedVideos.filter(
                      (v) => v.exerciseId === selectedLog.exerciseId
                    );
                    const primaryVideo =
                      matchingVideos.find((v) => v.submittedAt?.startsWith(selectedLog.date)) ||
                      matchingVideos[0];

                    return (
                      <div
                        ref={selectedLogDetailRef}
                        className="rounded-2xl border-2 border-blue-200 bg-white p-5 sm:p-6 space-y-6 shadow-xs"
                      >
                        {/* 상세 헤더 */}
                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                선택된 운동 기록
                              </span>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${selectedStatusBadge}`}>
                                {selectedStatusText}
                              </span>
                              <span className="font-mono text-xs text-gray-500 tabular-nums">
                                {selectedLog.date} {selectedTime}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {selectedLog.exerciseName}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={handleClearSelectedWorkoutLog}
                            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                            title="선택된 기록 상세 닫기"
                            aria-label="선택된 기록 상세 닫기"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 운동 수행 결과 요약 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <span className="text-[11px] text-gray-500 block">처방 목표</span>
                            <span className="font-mono font-bold text-gray-900 text-sm mt-0.5 block tabular-nums">
                              {selectedLog.prescribedSets}세트 × {selectedLog.prescribedReps}회
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <span className="text-[11px] text-gray-500 block">실제 수행</span>
                            <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block tabular-nums">
                              {selectedLog.actualSets}세트 × {selectedLog.actualReps}회
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <span className="text-[11px] text-gray-500 block">통증 척도 (NRS)</span>
                            <span
                              className={`font-mono font-bold text-sm mt-0.5 block tabular-nums ${
                                selectedPainScore >= 5 ? 'text-rose-600' : 'text-gray-900'
                              }`}
                            >
                              {selectedLog.prePainLevel !== undefined &&
                              selectedLog.postPainLevel !== undefined
                                ? `전 ${selectedLog.prePainLevel} → 후 ${selectedLog.postPainLevel}/10`
                                : `${selectedPainScore}/10`}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <span className="text-[11px] text-gray-500 block">체감 난이도</span>
                            <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                              {selectedLog.difficulty || '미입력'}
                            </span>
                          </div>
                        </div>

                        {/* 환자 질문 및 메모 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>환자 메모 및 질문</span>
                          </div>
                          {selectedLog.patientNotes?.trim() ? (
                            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                              {selectedLog.patientNotes}
                            </div>
                          ) : (
                            <p className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
                              이 운동 회차에 작성된 환자 메모나 질문이 없습니다.
                            </p>
                          )}
                        </div>

                        {/* 연관 제출 영상 (존재 시 표시 및 영상 리뷰 탭 연결) */}
                        {primaryVideo && (
                          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                                <Video className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>
                                  제출된 운동 영상 ({matchingVideos.length}건) · {primaryVideo.fileName}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVideoSubmissionId(primaryVideo.id);
                                  setActivitySubTab('videos');
                                }}
                                className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>제출 영상 탭에서 보기</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {primaryVideo.videoUrl && (
                              <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-64">
                                <video
                                  src={primaryVideo.videoUrl}
                                  controls
                                  playsInline
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            {primaryVideo.patientNotes?.trim() && (
                              <p className="text-xs text-gray-600">
                                영상 메모: "{primaryVideo.patientNotes}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* 기존 임상 피드백 작성 UI 및 이력 재사용 */}
                        <div className="pt-5 border-t border-gray-200 space-y-6">
                          {renderClinicalFeedbackForm(
                            'selected-log',
                            '이 운동 기록에 대한 임상 피드백 작성',
                            selectedLog
                          )}
                          {renderFeedbackHistory(selectedLog)}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 전체 수행 기록 목록 */}
                  {logs.length === 0 ? (
                    <div className="py-16 border-t border-b border-gray-200 text-center">
                      <p className="text-sm text-gray-500">
                        {isLoadingRemoteLogs
                          ? '운동 수행 기록을 불러오는 중입니다...'
                          : '아직 기록된 운동 수행 데이터가 없습니다. 환자가 운동을 완료하면 여기에 표시됩니다.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border-t border-b border-gray-200">
                      {logs.map((log) => {
                        const time = log.loggedAt
                          ? new Date(log.loggedAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '';
                        const painScore = log.postPainLevel ?? log.painLevel;
                        const statusText =
                          log.status === 'skipped'
                            ? '미수행'
                            : log.status === 'partial'
                              ? '부분 수행'
                              : '정상 완료';
                        const statusColor =
                          log.status === 'skipped'
                            ? 'text-gray-500'
                            : log.status === 'partial'
                              ? 'text-amber-700'
                              : 'text-emerald-700';
                        const isSelected = selectedWorkoutLogId === log.id;

                        return (
                          <div
                            key={log.id}
                            onClick={() => handleSelectWorkoutLog(log)}
                            className={`py-4 px-3 -mx-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/70 ring-1 ring-blue-300'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-baseline gap-2.5 flex-wrap">
                                <span className="font-mono text-xs text-gray-500 tabular-nums">
                                  {log.date} {time}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {log.exerciseName}
                                </span>
                                <span className={`text-xs font-medium ${statusColor}`}>
                                  {statusText}
                                </span>
                                {isSelected && (
                                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                    선택됨
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-xs text-gray-600 font-mono tabular-nums flex-wrap">
                                <span>처방 {log.prescribedSets}×{log.prescribedReps}</span>
                                <span className="text-gray-900 font-medium">
                                  실제 {log.actualSets}세트 {log.actualReps}회
                                </span>
                                {log.difficulty && (
                                  <span className="font-sans">체감: {log.difficulty}</span>
                                )}
                              </div>

                              {log.patientNotes && (
                                <p className="text-xs text-gray-600 pt-0.5">
                                  환자 메모: "{log.patientNotes}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-4 shrink-0 self-start sm:self-center">
                              <span
                                className={`text-xs font-mono tabular-nums font-medium ${
                                  painScore >= 5 ? 'text-rose-600' : 'text-gray-700'
                                }`}
                              >
                                통증 NRS {painScore}/10
                              </span>

                              {!isDisconnected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectWorkoutLog(log);
                                  }}
                                  className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                                >
                                  {isSelected ? '상세 열림' : '상세 · 피드백'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 하위 메뉴 2: 제출 영상 */}
              {activitySubTab === 'videos' && (
                <TherapistVideoReviewSection
                  patientId={patient.id}
                  patientName={patient.name}
                  therapistName={currentUser?.name}
                  onFeedbackSaved={onFeedbackSaved}
                  initialSubmissionId={selectedVideoSubmissionId}
                />
              )}

              {/* 하위 메뉴 3: 피드백 */}
              {activitySubTab === 'feedback' && (
                <div className="space-y-10">
                  {renderClinicalFeedbackForm('chart', '임상 피드백 작성', null)}
                  {renderFeedbackHistory()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 연결 해제 확인 모달 */}
      <DisconnectConfirmModal
        isOpen={isDisconnectModalOpen}
        patientName={patient.name}
        patientId={patient.id}
        connectionId={connectionId}
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setIsDisconnectModalOpen(false)}
        isProcessing={isDisconnecting}
      />

      {/* 진단명 수정 모달 */}
      {showEditDiagnosisModal && (
        <EditDiagnosisModal
          isOpen={showEditDiagnosisModal}
          onClose={() => setShowEditDiagnosisModal(false)}
          patientId={patient.id}
          patientName={patient.name}
          currentDiagnosis={patient.diagnosis}
          userRole="therapist"
          updaterUid={currentUser?.id}
          isTherapistConnected={isConnected}
          onSuccess={() => {
            onFeedbackSaved?.();
            onPatientUpdated?.();
          }}
        />
      )}

      {/* SOAP 미저장 변경 확인 모달 */}
      {pendingChartExitAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chart-soap-dirty-title"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <h4 id="chart-soap-dirty-title" className="text-sm font-bold text-gray-900">
                  저장하지 않은 SOAP 내용이 있습니다
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPendingChartExitAction(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 text-xs text-gray-600 leading-relaxed">
              {pendingChartExitAction.type === 'disconnect'
                ? '작성 또는 수정 중인 SOAP 노트가 저장되지 않았습니다. 환자와의 연결을 해제하면 작성 중인 SOAP 초안이 사라지며 더 이상 저장할 수 없습니다. 작성 중인 내용을 포기하고 연결 해제를 진행하시겠습니까?'
                : '작성 또는 수정 중인 SOAP 노트를 저장하지 않고 이동하면 입력한 내용이 사라집니다. 계속 이동하시겠습니까?'}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingChartExitAction(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                {pendingChartExitAction.type === 'disconnect' ? '취소 (계속 작성)' : '계속 작성'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingChartExitAction;
                  setPendingChartExitAction(null);
                  if (action.type === 'disconnect') {
                    setIsDisconnectModalOpen(true);
                    return;
                  }
                  handleSoapDirtyChange(false);
                  setActiveTab(action.tab);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                {pendingChartExitAction.type === 'disconnect' ? '초안 포기 후 연결 해제 진행' : '저장 안 하고 이동'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
