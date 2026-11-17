/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Patient, AuthUser, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { FirebaseService } from '../../services/firebaseService';
import { getFirebaseAuth } from '../../services/firebase';
import { formatTherapistDisplayName, getFeedbackAuthorDisplayName } from '../../services/authService';
import { AlertTriangle, ArrowLeft, ArrowUpRight, FileEdit, Send, UserX, X } from 'lucide-react';
import { TherapistVideoReviewSection } from './TherapistVideoReviewSection';
import { PatientEvaluationSection } from './PatientEvaluationSection';
import { PatientSoapSection } from './PatientSoapSection';
import { DisconnectConfirmModal } from '../common/DisconnectConfirmModal';
import { EditDiagnosisModal } from '../common/EditDiagnosisModal';

interface TherapistPatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
  onNavigateToProgramEditor: (patientId: string) => void;
  onFeedbackSaved: () => void;
  currentUser?: AuthUser;
  onPatientDisconnected?: (patientName: string) => void;
  onPatientUpdated?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type ChartTab = 'info' | 'evaluation' | 'soap' | 'activity';
type ActivitySubTab = 'logs' | 'videos' | 'feedback';

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
  onDirtyChange
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('info');
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>('logs');
  const [showEditDiagnosisModal, setShowEditDiagnosisModal] = useState<boolean>(false);
  const [hasUnsavedSoapChanges, setHasUnsavedSoapChanges] = useState<boolean>(false);
  const [pendingChartExitAction, setPendingChartExitAction] = useState<
    | { type: 'tab'; tab: ChartTab }
    | { type: 'disconnect' }
    | null
  >(null);

  const handleSoapDirtyChange = useCallback(
    (dirty: boolean) => {
      setHasUnsavedSoapChanges(dirty);
      onDirtyChange?.(dirty);
    },
    [onDirtyChange]
  );

  useEffect(() => {
    setHasUnsavedSoapChanges(false);
    setPendingChartExitAction(null);
    onDirtyChange?.(false);
    return () => {
      onDirtyChange?.(false);
    };
  }, [patient.id, onDirtyChange]);

  const library = StorageService.getExerciseLibrary();
  const logs = StorageService.getWorkoutLogs(patient.id);
  const submittedVideos = StorageService.getVideoSubmissions(patient.id);
  const pendingVideosCount = submittedVideos.filter((v) => v.status === 'pending_review').length;

  // 실제 Firestore connection 상태 우선 반영 (pending, connected, rejected, disconnected)
  const activeConnection = StorageService.getActiveConnection(patient.id, currentUser);
  const connectionStatus = activeConnection?.status || patient.connectionStatus || 'not_connected';
  const isConnected = connectionStatus === 'connected';
  const isDisconnected = connectionStatus === 'disconnected';
  const statusDisplay = getConnectionStatusDisplay(connectionStatus);
  const connectionId = activeConnection?.connectionId || (isDisconnected ? '연결 해제됨' : undefined);

  // 연결 해제 모달 상태
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  // 임상 피드백 작성 상태
  const [newFeedbackContent, setNewFeedbackContent] = useState<string>('');
  const [newRecommendation, setNewRecommendation] = useState<string>('');
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string>('');
  const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState<string>('');

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

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedbackContent.trim() || isDisconnected) return;

    if (!isConnected) {
      setFeedbackErrorMsg('담당 환자와 정상 연결된 상태에서만 피드백을 작성할 수 있습니다.');
      return;
    }

    setIsSavingFeedback(true);
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
          recommendation: newRecommendation
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
    { id: 'evaluation', label: '평가 기록' },
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

        {/* 2. 얇은 밑줄형 4개 탭 */}
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

          {/* Tab 2: 평가 기록 */}
          {activeTab === 'evaluation' && (
            <PatientEvaluationSection patientId={patient.id} />
          )}

          {/* Tab 3: SOAP 노트 */}
          {activeTab === 'soap' && (
            <PatientSoapSection
              patientId={patient.id}
              currentUser={currentUser}
              isConnected={isConnected}
              isDisconnected={isDisconnected}
              onDirtyChange={handleSoapDirtyChange}
            />
          )}

          {/* Tab 4: 운동 기록 */}
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
                <div>
                  {logs.length === 0 ? (
                    <div className="py-16 border-t border-b border-gray-200 text-center">
                      <p className="text-sm text-gray-500">
                        아직 기록된 운동 수행 데이터가 없습니다. 환자가 운동을 완료하면 여기에 표시됩니다.
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

                        return (
                          <div
                            key={log.id}
                            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
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
                                  onClick={() => {
                                    setActivitySubTab('feedback');
                                    setNewFeedbackContent(
                                      `[${log.date} ${log.exerciseName}] 통증 NRS ${painScore}/10 확인했습니다. `
                                    );
                                  }}
                                  className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                                >
                                  피드백 작성
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
                />
              )}

              {/* 하위 메뉴 3: 피드백 */}
              {activitySubTab === 'feedback' && (
                <div className="space-y-10">
                  {/* 새 피드백 작성 폼 */}
                  <section className="space-y-4">
                    <h2 className="text-base font-semibold text-gray-900">
                      임상 피드백 작성
                    </h2>

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

                    <form onSubmit={handleSaveFeedback} className="space-y-4">
                      <div>
                        <label
                          htmlFor="chart-feedback-content"
                          className="text-xs font-medium text-gray-700 block mb-1.5"
                        >
                          운동 소견 및 지도 코멘트 <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          id="chart-feedback-content"
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
                          htmlFor="chart-feedback-recommendation"
                          className="text-xs font-medium text-gray-700 block mb-1.5"
                        >
                          권장 처방 및 일상 수칙 (선택)
                        </label>
                        <input
                          id="chart-feedback-recommendation"
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

                  {/* 전송된 피드백 이력 */}
                  <section className="pt-8 border-t border-gray-200 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900">
                      피드백 이력 ({patient.feedbacks?.length || 0}건)
                    </h2>

                    {!patient.feedbacks || patient.feedbacks.length === 0 ? (
                      <p className="py-10 text-center text-sm text-gray-500 border-t border-b border-gray-100">
                        아직 등록된 피드백이 없습니다.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100 border-t border-b border-gray-200">
                        {patient.feedbacks.map((fb) => (
                          <div key={fb.id} className="py-4 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-semibold text-gray-900">
                                {getFeedbackAuthorDisplayName(fb, patient)}
                              </span>
                              <span className="text-xs text-gray-400 font-mono tabular-nums">
                                {fb.date}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{fb.content}</p>
                            {fb.recommendation && (
                              <p className="text-xs text-blue-700 pt-0.5">
                                권장 사항: {fb.recommendation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
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
