/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, Exercise, AssignedExercise, AuthUser, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { FirebaseService } from '../../services/firebaseService';
import { getFirebaseAuth } from '../../services/firebase';
import { formatTherapistDisplayName, getFeedbackAuthorDisplayName } from '../../services/authService';
import {
  ArrowLeft,
  User,
  Activity,
  ClipboardList,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Trash2,
  Settings,
  HeartPulse,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  X,
  UserX,
  Video,
  AlertTriangle,
  FileEdit
} from 'lucide-react';
import { TherapistVideoReviewSection } from './TherapistVideoReviewSection';
import { DisconnectConfirmModal } from '../common/DisconnectConfirmModal';
import { EditDiagnosisModal } from '../common/EditDiagnosisModal';

interface TherapistPatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
  onNavigateToProgramEditor: (patientId: string) => void;
  onSwitchToPatientView: (patientId: string) => void;
  onFeedbackSaved: () => void;
  currentUser?: AuthUser;
  onPatientDisconnected?: (patientName: string) => void;
  onPatientUpdated?: () => void;
}

export const TherapistPatientDetailView: React.FC<TherapistPatientDetailViewProps> = ({
  patient,
  onBack,
  onNavigateToProgramEditor,
  onSwitchToPatientView,
  onFeedbackSaved,
  currentUser,
  onPatientDisconnected,
  onPatientUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'program' | 'logs' | 'videos' | 'feedback'>('program');
  const [showEditDiagnosisModal, setShowEditDiagnosisModal] = useState<boolean>(false);
  const library = StorageService.getExerciseLibrary();
  const logs = StorageService.getWorkoutLogs(patient.id);

  // Connection and Active Record
  const isDisconnected = patient.connectionStatus === 'disconnected';
  const isConnected = patient.connectionStatus === 'connected';
  const activeConnection = StorageService.getActiveConnection(patient.id, currentUser);
  const connectionId = activeConnection?.connectionId || (isDisconnected ? '연결 해제됨' : undefined);

  // Disconnect Confirmation Modal State
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  // New feedback state
  const [newFeedbackContent, setNewFeedbackContent] = useState<string>('');
  const [newRecommendation, setNewRecommendation] = useState<string>('');
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string>('');

  // Add Exercise Modal State
  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState<boolean>(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(library[0]?.id || '');
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<number>(10);
  const [frequency, setFrequency] = useState<string>('주 3회 (매일 권장)');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Patient Connection State
  const connectionStatus = patient.connectionStatus || 'connected';

  const handleApproveConnection = () => {
    StorageService.updatePatientConnection(patient.id, 'connected', currentUser?.name || '담당 물리치료사');
    onFeedbackSaved();
  };

  const handleOpenDisconnectModal = () => {
    setIsDisconnectModalOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await StorageService.disconnectPatient(patient.id, currentUser, activeConnection?.connectionId);
      setIsDisconnecting(false);
      setIsDisconnectModalOpen(false);
      if (res.success) {
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

  const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState<string>('');

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedbackContent.trim() || isDisconnected) return;

    // 현재 환자와 연결된 물리치료사인지 검증 (Requirement 5)
    if (patient.connectionStatus !== 'connected' && activeConnection?.status !== 'connected') {
      setFeedbackErrorMsg('담당 환자와 정상 연결된 상태에서만 피드백을 작성할 수 있습니다.');
      return;
    }

    setIsSavingFeedback(true);
    setFeedbackErrorMsg('');

    try {
      // 1. Firebase Auth 로그인 UID 식별 (Requirement 1)
      const auth = getFirebaseAuth();
      let therapistUid = auth?.currentUser?.uid || currentUser?.id || '';
      let therapistRawName = currentUser?.name || '';

      // 2. users/{uid}에서 실제 물리치료사 등록 이름 조회 (Requirement 2)
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

      // 3. 피드백 저장 (올바른 therapistId 및 therapistName 기록)
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

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExerciseId) return;

    StorageService.addExerciseToPatient(patient.id, {
      exerciseId: selectedExerciseId,
      reps,
      sets,
      frequency,
      customNotes
    });

    setIsPrescribeModalOpen(false);
    setCustomNotes('');
    onFeedbackSaved();
  };

  const handleRemoveExercise = (assignmentId: string, exerciseName: string) => {
    if (confirm(`'${exerciseName}' 운동을 처방 목록에서 제외하시겠습니까?`)) {
      StorageService.removeExerciseFromPatient(patient.id, assignmentId);
      onFeedbackSaved();
    }
  };

  const submittedVideos = StorageService.getVideoSubmissions(patient.id);
  const pendingVideosCount = submittedVideos.filter((v) => v.status === 'pending_review').length;

  const subTabs = [
    { id: 'program', label: '운동 프로그램' },
    { id: 'logs', label: '수행 기록' },
    { 
      id: 'videos', 
      label: '운동 영상 확인', 
      badge: pendingVideosCount > 0 ? `${pendingVideosCount}건 대기` : undefined 
    },
    { id: 'feedback', label: '피드백 작성' },
    { id: 'info', label: '환자 정보' }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            title="담당 환자 목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900">{patient.name} 환자 차트</h1>
              <span className="text-xs text-gray-500 font-mono">
                ({patient.gender} · {patient.age}세)
              </span>
              {connectionStatus === 'connected' ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  연결 완료
                </span>
              ) : connectionStatus === 'requested' ? (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  승인 대기 중
                </span>
              ) : (
                <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  미연결
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-gray-500">
                진단: <strong className="text-gray-800">{formatPatientDiagnosis(patient.diagnosis)}</strong> · 목표: {patient.targetGoal}
              </p>
              {isConnected && (
                <button
                  type="button"
                  onClick={() => setShowEditDiagnosisModal(true)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="환자 진단명 수정"
                >
                  <FileEdit className="w-2.5 h-2.5" />
                  <span>진단명 수정</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {!isDisconnected && (
            <button
              type="button"
              onClick={() => setIsPrescribeModalOpen(true)}
              className="px-3.5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>새 운동 처방하기</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onSwitchToPatientView(patient.id)}
            className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
            title="이 환자의 시연 모드로 바로 전환"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{patient.name} 화면 보기</span>
          </button>
          {isDisconnected ? (
            <span className="px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded-xl flex items-center gap-1">
              <UserX className="w-3.5 h-3.5" />
              <span>연결 해제됨</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleOpenDisconnectModal}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              title="환자 연결 해제 (운동 기록 보존)"
            >
              <UserX className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">연결 해제</span>
            </button>
          )}
        </div>
      </div>

      {/* Disconnected Warning Banner */}
      {isDisconnected && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>현재 물리치료사와의 연결이 해제된 환자입니다.</strong> 새로운 운동 처방 및 피드백 작성 권한이 차단되었으며, 기존 운동 수행 기록 및 과거 처방 이력만 안전하게 열람할 수 있습니다.
            </span>
          </div>
          <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full shrink-0">
            연결 해제됨
          </span>
        </div>
      )}

      {/* 4 Detail Tabs Navigation */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs">
        {subTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-4 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.id === 'program' && ` (${patient.assignedProgram.length})`}
              {tab.id === 'logs' && ` (${logs.length})`}
              {tab.id === 'videos' && ` (${submittedVideos.length})`}
              {tab.badge && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-gray-950">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: 운동 프로그램 (Assigned Exercise Program) */}
      {activeTab === 'program' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                현재 처방된 재활운동 ({patient.assignedProgram.length}종)
              </h2>
              <p className="text-xs text-gray-500">환자의 모바일 화면에 동기화되는 맞춤형 운동 프로그램</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrescribeModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 운동 추가 처방</span>
            </button>
          </div>

          {patient.assignedProgram.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 space-y-3">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-600">아직 처방된 운동이 없습니다.</p>
              <button
                type="button"
                onClick={() => setIsPrescribeModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                10종 라이브러리에서 운동 처방하기
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {patient.assignedProgram.map((assignment, index) => {
                const exercise = library.find((e) => e.id === assignment.exerciseId);
                if (!exercise) return null;

                return (
                  <div key={assignment.assignmentId} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400 font-bold">{index + 1}.</span>
                        <h3 className="font-extrabold text-gray-900 text-base">{exercise.name}</h3>
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg font-bold">
                          {exercise.category}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{exercise.targetArea}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-700 mt-1.5 font-mono tabular-nums">
                        <span>처방량: <strong className="text-blue-600 font-bold">{assignment.sets}세트 × {assignment.reps}회</strong></span>
                        <span>빈도: <strong>{assignment.frequency}</strong></span>
                      </div>

                      {assignment.customNotes && (
                        <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2 max-w-xl">
                          <strong>치료사 지시사항:</strong> {assignment.customNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 font-mono tabular-nums hidden sm:inline">
                        처방일: {assignment.assignedDate}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(assignment.assignmentId, exercise.name)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="처방 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 수행 기록 (Workout Logs) */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                환자 운동 수행 기록 ({logs.length}건)
              </h2>
              <p className="text-xs text-gray-500">실제 수행 세트/횟수, NRS 통증 척도 및 환자 특이사항</p>
            </div>
          </div>

          {logs.length === 0 ? (
            <p className="py-12 text-center text-xs text-gray-400">
              아직 기록된 운동 수행 데이터가 없습니다. 환자가 운동을 완료하면 여기에 실시간 표시됩니다.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const time = log.loggedAt ? new Date(log.loggedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={log.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-500">{log.date} {time}</span>
                        <span className="text-blue-700 font-bold text-sm">{log.exerciseName}</span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          log.status === 'skipped'
                            ? 'bg-gray-100 text-gray-600'
                            : log.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.status === 'skipped' ? '미수행' : log.status === 'partial' ? '부분수행' : '정상완료'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-gray-600 mt-1.5 font-mono tabular-nums">
                        <span>처방: {log.prescribedSets}세트 {log.prescribedReps}회</span>
                        <span>실제: <strong className="text-blue-600 font-bold">{log.actualSets}세트 {log.actualReps}회</strong></span>
                        {log.difficulty && <span>체감: {log.difficulty}</span>}
                      </div>

                      {log.patientNotes && (
                        <p className="text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100 mt-1.5">
                          환자 메모: "{log.patientNotes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="px-3 py-1.5 rounded-xl border bg-rose-50 text-rose-700 border-rose-200 text-xs font-extrabold flex items-center gap-1 font-mono">
                        <HeartPulse className="w-3.5 h-3.5" />
                        통증 NRS {log.postPainLevel ?? log.painLevel}/10
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('feedback');
                          setNewFeedbackContent(`[${log.date} ${log.exerciseName}] 통증 NRS ${log.postPainLevel ?? log.painLevel}/10 확인했습니다. `);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg"
                      >
                        피드백 작성
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: 운동 영상 확인 (Submitted Videos & Feedback) */}
      {activeTab === 'videos' && (
        <TherapistVideoReviewSection
          patientId={patient.id}
          patientName={patient.name}
          therapistName={currentUser?.name}
          onFeedbackSaved={onFeedbackSaved}
        />
      )}

      {/* Tab 3: 피드백 작성 (Clinical Feedback) */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Write New Feedback Form */}
          <div className="bg-white rounded-3xl border border-blue-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>새 임상 피드백 작성 및 전송</span>
            </h2>

            {feedbackSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
                ✓ {feedbackSuccessMsg}
              </div>
            )}

            {feedbackErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-bold">
                ⚠️ {feedbackErrorMsg}
              </div>
            )}

            <form onSubmit={handleSaveFeedback} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  치료사 운동 소견 및 지도 코멘트 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={newFeedbackContent}
                  onChange={(e) => setNewFeedbackContent(e.target.value)}
                  placeholder="예: 수행 기록상 브리지 시 통증(NRS 1)이 양호합니다. 허리 과신전에 계속 주의하며 호흡을 유지하세요."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  권장 처방 및 일상 수칙 (선택)
                </label>
                <input
                  type="text"
                  value={newRecommendation}
                  onChange={(e) => setNewRecommendation(e.target.value)}
                  placeholder="예: 내일도 동일 세트 수로 진행하시고 1시간 좌식 후 기립 스트레칭을 병행하세요."
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingFeedback}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSavingFeedback ? '피드백 전송 중...' : '피드백 전송 및 차트 저장'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Feedbacks History */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
              전송된 피드백 이력 ({patient.feedbacks?.length || 0}건)
            </h2>

            {(!patient.feedbacks || patient.feedbacks.length === 0) ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                아직 등록된 피드백이 없습니다. 위 폼에서 피드백을 작성하여 전송하세요.
              </p>
            ) : (
              <div className="space-y-3">
                {patient.feedbacks.map((fb) => (
                  <div key={fb.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{getFeedbackAuthorDisplayName(fb, patient)}</span>
                      <span className="text-[11px] text-gray-400 font-mono tabular-nums">{fb.date}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed font-medium">{fb.content}</p>
                    {fb.recommendation && (
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-[11px]">
                        <strong>권장 사항:</strong> {fb.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: 환자 정보 (Basic Info & Connection Status) */}
      {activeTab === 'info' && (
        <div className="space-y-5">
          {/* Connection Status Banner */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-gray-500 block mb-1">
                물리치료사-환자 연결 상태
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-base font-extrabold ${connectionStatus === 'connected' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {connectionStatus === 'connected' ? `✓ ${currentUser?.name || patient.therapistName || '담당 물리치료사'}와 정상 연동 중` : connectionStatus === 'requested' || connectionStatus === 'pending' ? '⏳ 환자의 연결 요청 승인 대기 중' : '미연결 상태'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                연결 코드를 통해 연동된 환자는 치료사의 처방 프로그램과 피드백을 실시간으로 수신합니다.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(connectionStatus === 'requested' || connectionStatus === 'pending') && (
                <button
                  type="button"
                  onClick={handleApproveConnection}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  연결 요청 승인하기
                </button>
              )}
              {connectionStatus === 'connected' && (
                <button
                  type="button"
                  onClick={handleOpenDisconnectModal}
                  className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>환자 연결 해제</span>
                </button>
              )}
            </div>
          </div>

          {/* Clinical Profile Info */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
              임상 프로필 및 진단 정보
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 block text-[11px] font-semibold">진단명</span>
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => setShowEditDiagnosisModal(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <FileEdit className="w-3 h-3" />
                      <span>수정</span>
                    </button>
                  )}
                </div>
                <span className="font-extrabold text-gray-900 text-sm">{formatPatientDiagnosis(patient.diagnosis)}</span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block text-[11px] font-semibold mb-1">재활 치료 목표</span>
                <span className="font-bold text-gray-900">{patient.targetGoal}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs">
              <span className="font-bold text-blue-900 block mb-1">물리치료사 임상 소견</span>
              <p className="text-gray-700 leading-relaxed">{patient.therapistNotes || '특이 소견 없음'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 새 운동 처방 모달 */}
      {isPrescribeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900">
                  {patient.name} 님에게 운동 처방 추가
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrescribeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExerciseSubmit} className="space-y-4 text-xs">
              {/* Exercise Selector */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  처방할 운동 선택 (10종 임상 라이브러리) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  required
                >
                  {library.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      [{ex.category}] {ex.name} ({ex.targetArea})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sets and Reps */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    처방 세트 수 (Sets) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={sets}
                    onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    세트당 반복 수 (Reps) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={reps}
                    onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  수행 빈도 (Frequency)
                </label>
                <input
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="예: 주 3회 (매일 권장)"
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Custom Precautions */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  환자 맞춤 주의사항 및 임상 지시
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="예: 허리 과신전 금지, 통증 발생 시 즉시 중단"
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPrescribeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  처방 저장 및 환자 화면 동기화
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal (Requirement 2) */}
      <DisconnectConfirmModal
        isOpen={isDisconnectModalOpen}
        patientName={patient.name}
        patientId={patient.id}
        connectionId={connectionId}
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setIsDisconnectModalOpen(false)}
        isProcessing={isDisconnecting}
      />

      {/* Edit Diagnosis Modal */}
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
    </div>
  );
};
