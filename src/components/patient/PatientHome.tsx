/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Patient, Exercise, UserAccount, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { AuthService, formatTherapistDisplayName, getFeedbackAuthorDisplayName } from '../../services/authService';
import { FirebaseService } from '../../services/firebaseService';
import { isFirebaseConfigured } from '../../config/firebaseConfig';
import { 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  AlertTriangle,
  Dumbbell,
  Stethoscope,
  KeyRound,
  Send,
  MessageSquare,
  Clock,
  Sparkles,
  UserCheck
} from 'lucide-react';

interface PatientHomeProps {
  patient: Patient;
  onOpenExerciseDetail: (exercise: Exercise, assignmentId: string) => void;
  onNavigateTab: (tab: string) => void;
  onStartGuidedSession: () => void;
  onConnectionUpdated?: () => void;
}

export const PatientHome: React.FC<PatientHomeProps> = ({
  patient,
  onOpenExerciseDetail,
  onNavigateTab,
  onStartGuidedSession,
  onConnectionUpdated
}) => {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [connectMsg, setConnectMsg] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const todayStats = StorageService.getPatientTodayStats(patient.id);
  const library = StorageService.getExerciseLibrary();
  const todayStr = StorageService.getTodayDateString();
  const connectionStatus = patient.connectionStatus || (patient.therapistName ? 'connected' : 'not_connected');

  const isDisconnectedOrUnlinked = connectionStatus === 'not_connected' || connectionStatus === 'disconnected';

  // Look up therapist by code in real-time (Local + Remote Firestore publicTherapists)
  const [matchedTherapist, setMatchedTherapist] = useState<UserAccount | undefined>(undefined);

  useEffect(() => {
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed.length < 3) {
      setMatchedTherapist(undefined);
      return;
    }
    let isMounted = true;
    if (isFirebaseConfigured()) {
      FirebaseService.findTherapistByConnectionCode(trimmed).then((remoteData) => {
        if (!isMounted) return;
        if (remoteData) {
          setMatchedTherapist({
            id: remoteData.therapistId,
            username: remoteData.therapistId,
            name: remoteData.name,
            passwordHash: '',
            role: 'therapist',
            connectionCode: remoteData.connectionCode,
            clinic: remoteData.clinic,
            accountStatus: 'active',
            registeredAt: remoteData.createdAt || new Date().toISOString()
          });
        } else {
          const localMatch = AuthService.findTherapistByConnectionCode(trimmed);
          setMatchedTherapist(localMatch);
        }
      }).catch(() => {
        if (isMounted) {
          const localMatch = AuthService.findTherapistByConnectionCode(trimmed);
          setMatchedTherapist(localMatch);
        }
      });
    } else {
      const localMatch = AuthService.findTherapistByConnectionCode(trimmed);
      setMatchedTherapist(localMatch);
    }
    return () => { isMounted = false; };
  }, [inputCode]);

  // Handle send connection request (await Firestore save with real error feedback)
  const handleSendConnectionRequest = async (therapistAccount: UserAccount) => {
    setIsSendingRequest(true);
    setConnectMsg('');
    try {
      const res = await StorageService.sendConnectionRequest(patient.id, patient.name, therapistAccount);
      setIsSendingRequest(false);
      setConnectMsg(res.message);
      if (res.success) {
        setInputCode('');
        setTimeout(() => {
          setIsConnectModalOpen(false);
          setConnectMsg('');
        }, 1500);
        if (onConnectionUpdated) onConnectionUpdated();
      }
    } catch (err: any) {
      setIsSendingRequest(false);
      setConnectMsg(`오류 발생: ${err?.message || '연결 요청 실패'}`);
    }
  };

  const latestFeedback = patient.feedbacks && patient.feedbacks.length > 0 ? patient.feedbacks[0] : null;

  return (
    <div className="space-y-5 pb-20">
      {/* 1. 최상단: 미연결/연결 해제 시 담당 물리치료사 연결 유도 배너 */}
      {isDisconnectedOrUnlinked && (
        <div className={`rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 border-2 ${
          connectionStatus === 'disconnected'
            ? 'bg-amber-50/90 border-amber-300'
            : 'bg-amber-50 border-amber-200/90'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              connectionStatus === 'disconnected' ? 'bg-amber-200 text-amber-900' : 'bg-amber-100 text-amber-700'
            }`}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-amber-900">
                  {connectionStatus === 'disconnected' ? '담당 물리치료사가 없습니다 (연결 해제됨)' : '아직 연결된 물리치료사가 없습니다'}
                </h2>
                {connectionStatus === 'disconnected' && (
                  <span className="text-[10px] bg-amber-200/90 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                    기록 안전 보존됨
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {connectionStatus === 'disconnected'
                  ? '이전 담당 물리치료사와의 연결이 해제되었습니다. 과거 운동 수행 기록 및 처방 내역은 안전하게 보존되며, 새로운 치료사를 연결하여 맞춤 피드백을 계속 받으실 수 있습니다.'
                  : '담당 물리치료사를 연결하면 진단에 맞는 1:1 맞춤형 재활운동을 처방받고 통증 피드백을 공유할 수 있습니다.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>새로운 치료사 연결하기</span>
          </button>
        </div>
      )}

      {/* 1-B. 치료사 승인 대기 중 배너 */}
      {(connectionStatus === 'requested' || connectionStatus === 'pending') && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>담당 물리치료사({formatTherapistDisplayName(patient.requestedTherapistName)}) 승인 대기 중입니다.</strong>{' '}
              치료사가 수락하면 맞춤 운동 처방이 활성화됩니다.
            </span>
          </div>
          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full shrink-0">
            승인 대기
          </span>
        </div>
      )}

      {/* 2. 새로운 치료사 임상 피드백 알림 배너 */}
      {latestFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-start gap-2.5 min-w-0">
            <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-extrabold text-emerald-800 block text-[11px]">
                {getFeedbackAuthorDisplayName(latestFeedback, patient)}의 새로운 피드백이 도착했습니다 ({latestFeedback.date})
              </span>
              <p className="font-medium text-emerald-900 line-clamp-1 mt-0.5">
                "{latestFeedback.content}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 px-3 py-1.5 rounded-lg transition-colors shrink-0 self-end sm:self-center"
          >
            피드백 확인 →
          </button>
        </div>
      )}

      {/* 3. 최우선 액션: '오늘의 운동 시작' Hero Card */}
      <div className="bg-blue-600 rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
              {todayStr} 오늘의 재활
            </span>
            {connectionStatus === 'connected' ? (
              <span className="text-[10px] bg-blue-500/80 text-white font-semibold px-2 py-0.5 rounded-full">
                {formatTherapistDisplayName(patient.therapistName)} 연동
              </span>
            ) : (
              <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                담당 물리치료사가 없습니다
              </span>
            )}
            {isDisconnectedOrUnlinked && patient.assignedProgram.length > 0 && (
              <span className="text-[10px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full">
                이전 처방 프로그램 (이력 보존)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {patient.assignedProgram.length === 0
              ? '처방된 운동 대기 중'
              : todayStats.completedCount === todayStats.totalAssigned
              ? '오늘의 모든 운동을 완수하셨습니다!'
              : '오늘의 재활운동을 시작하세요'}
          </h1>
          <p className="text-xs text-blue-100">
            {patient.assignedProgram.length === 0
              ? '담당 물리치료사가 운동 프로그램을 등록하면 여기에서 바로 운동할 수 있습니다.'
              : `처방된 ${patient.assignedProgram.length}개 운동 중 ${Math.max(0, todayStats.totalAssigned - todayStats.completedCount)}개 남음`}
          </p>
        </div>

        {patient.assignedProgram.length > 0 ? (
          <button
            onClick={onStartGuidedSession}
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>오늘의 운동 시작</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (connectionStatus !== 'connected') {
                setIsConnectModalOpen(true);
              } else {
                onNavigateTab('profile');
              }
            }}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-blue-500 text-white hover:bg-blue-400 font-bold text-xs transition-colors shrink-0 cursor-pointer"
          >
            {isDisconnectedOrUnlinked ? '새로운 치료사 연결하기' : '처방 대기 중'}
          </button>
        )}
      </div>

      {/* 4. 환자 인사 및 담당 치료사 정보 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            안녕하세요, <span className="text-blue-600">{patient.name}</span> 님
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            진단: <span className="font-semibold text-gray-800">{formatPatientDiagnosis(patient.diagnosis)}</span> · 목표: {patient.targetGoal}
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-emerald-500' : connectionStatus === 'requested' ? 'bg-amber-500' : 'bg-gray-400'
          }`} />
          <div>
            <span className="text-gray-400 block text-[10px] font-medium">담당 물리치료사</span>
            <span className="font-extrabold text-gray-900">
              {connectionStatus === 'connected'
                ? formatTherapistDisplayName(patient.therapistName)
                : connectionStatus === 'requested'
                ? '승인 대기 중'
                : '담당 물리치료사가 없습니다'}
            </span>
          </div>
          {isDisconnectedOrUnlinked && (
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="ml-2 px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              새로운 치료사 연결하기
            </button>
          )}
        </div>
      </div>

      {/* 5. 오늘의 진행률 현황 */}
      {patient.assignedProgram.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">오늘의 운동 달성률</h2>
              <p className="text-xs text-gray-500">처방된 재활 프로그램을 꾸준히 완수해보세요</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums">
                {todayStats.completionRate}%
              </span>
            </div>
          </div>

          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(todayStats.completionRate, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center text-xs">
            <div className="p-2 rounded-xl bg-gray-50">
              <span className="text-gray-500 block text-[11px]">예정</span>
              <span className="font-extrabold text-gray-900 font-mono">{todayStats.totalAssigned}개</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50">
              <span className="text-emerald-700 block text-[11px]">완료</span>
              <span className="font-extrabold text-emerald-700 font-mono">{todayStats.completedCount}개</span>
            </div>
            <div className="p-2 rounded-xl bg-gray-50">
              <span className="text-gray-500 block text-[11px]">남음</span>
              <span className="font-extrabold text-gray-700 font-mono">
                {Math.max(0, todayStats.totalAssigned - todayStats.completedCount)}개
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. 오늘의 운동 프로그램 카드 목록 */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-gray-900">오늘의 처방 운동 프로그램</h2>
            <p className="text-xs text-gray-500">개별 운동을 눌러 자세한 가이드와 시연을 확인할 수 있습니다</p>
          </div>
          {patient.assignedProgram.length > 0 && (
            <button
              onClick={() => onNavigateTab('program')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>전체 목록</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isDisconnectedOrUnlinked && patient.assignedProgram.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-200/90 text-amber-950 font-bold text-[10px] shrink-0">
                이전 처방 프로그램 (이력 보존)
              </span>
              <span className="text-[11px] text-amber-800">
                연결 해제 전 처방받은 운동을 계속 수행하고 기록할 수 있습니다.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline shrink-0 cursor-pointer self-start sm:self-auto"
            >
              새로운 치료사 연결하기 →
            </button>
          </div>
        )}

        {patient.assignedProgram.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">아직 처방된 운동이 없습니다</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                담당 물리치료사가 신규 평가 후 맞춤형 재활 프로그램을 등록하면 이곳에 운동 순서와 세트 수가 표시됩니다.
              </p>
            </div>
            {isDisconnectedOrUnlinked && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>새로운 물리치료사 연결하기</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {patient.assignedProgram.map((assignment, index) => {
              const exercise = library.find((e) => e.id === assignment.exerciseId);
              if (!exercise) return null;
              const isCompleted = todayStats.completedExerciseIds.has(exercise.id);

              return (
                <div
                  key={assignment.assignmentId}
                  onClick={() => onOpenExerciseDetail(exercise, assignment.assignmentId)}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer hover:border-blue-300 hover:shadow-xs flex items-center justify-between gap-4 ${
                    isCompleted ? 'border-emerald-200 bg-emerald-50/15' : 'border-gray-200'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onOpenExerciseDetail(exercise, assignment.assignmentId);
                    }
                  }}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500">
                          {exercise.category}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500 font-mono tabular-nums">
                          {assignment.frequency}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 truncate">
                        {index + 1}. {exercise.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                        <span className="font-semibold text-blue-600 font-mono tabular-nums">
                          {assignment.sets}세트 × {assignment.reps}회
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500 truncate max-w-[200px]">
                          {exercise.targetArea}
                        </span>
                      </div>
                      {assignment.customNotes && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-2 inline-block">
                          주의: {assignment.customNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Status */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 완료됨
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        운동 가이드
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-600 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-gray-900 mb-0.5">안전 재활 수칙</p>
          <p className="leading-relaxed">
            운동 중 관절이나 허리에 날카로운 통증(NRS 5 이상)이 느껴지면 즉시 운동을 중단하고 담당 물리치료사에게 상담하세요.
          </p>
        </div>
      </div>

      {/* 담당 물리치료사 연결 모달 */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">담당 물리치료사 연결</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConnectModalOpen(false);
                  setConnectMsg('');
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              병원 또는 센터의 담당 물리치료사로부터 전달받은 <strong>연결 코드</strong>를 입력해주세요.
              연결 요청 후 치료사가 승인하면 맞춤 운동 프로그램이 동기화됩니다.
            </p>

            {/* Input code */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">치료사 연결 코드</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setConnectMsg('');
                  }}
                  placeholder="예: PT-GW-821"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>

              {/* Real-time matched therapist preview */}
              {matchedTherapist && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-blue-500 font-bold block">조회된 물리치료사</span>
                      <span className="font-extrabold text-blue-950 text-sm">{matchedTherapist.name}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      인증 치료사
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    소속: {matchedTherapist.clinic || '재활센터'} · 코드: <code className="font-mono">{matchedTherapist.connectionCode}</code>
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSendConnectionRequest(matchedTherapist)}
                    disabled={isSendingRequest}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-70"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingRequest ? '전송 중...' : `${matchedTherapist.name} 치료사에게 연결 요청 전송`}</span>
                  </button>
                </div>
              )}

              {/* Quick Fill Recommendation */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                <span className="text-[11px] font-bold text-gray-700 block">시연용 치료사 빠른 선택</span>
                <button
                  type="button"
                  onClick={() => setInputCode('PT-GW-821')}
                  className="w-full py-1.5 px-2.5 bg-white hover:bg-blue-50 text-blue-700 border border-gray-200 hover:border-blue-300 rounded-lg text-xs font-bold text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>박건우 물리치료사 (대학병원 재활센터)</span>
                  <span className="font-mono text-[11px] text-gray-500">PT-GW-821</span>
                </button>
              </div>

              {connectMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold text-center">
                  ✓ {connectMsg}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConnectModalOpen(false);
                  setConnectMsg('');
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
