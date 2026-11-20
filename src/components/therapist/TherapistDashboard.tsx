/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthUser, ConnectionRequest, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { AddPatientModal } from './AddPatientModal';
import { 
  Users, 
  CalendarCheck2, 
  Activity, 
  TrendingUp, 
  ChevronRight, 
  HeartPulse, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Stethoscope,
  KeyRound,
  Copy,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  MessageSquare,
  Sparkles,
  ClipboardList,
  UserPlus,
  Share2,
  Calendar
} from 'lucide-react';

interface TherapistDashboardProps {
  onSelectPatientForProgram: (patientId: string) => void;
  onNavigateTab: (tab: string, patientId?: string) => void;
  onOpenPatientDetail?: (
    patientId: string,
    options?: {
      initialTab?: 'info' | 'soap' | 'activity';
      initialActivitySubTab?: 'logs' | 'videos' | 'feedback';
      targetWorkoutLogId?: string | null;
    }
  ) => void;
  currentUser?: AuthUser;
}

export const TherapistDashboard: React.FC<TherapistDashboardProps> = ({
  onSelectPatientForProgram,
  onNavigateTab,
  onOpenPatientDetail,
  currentUser
}) => {
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'invite' | 'code' | 'requests'>('invite');
  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<'success' | 'error' | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const stats = StorageService.getTherapistOverviewStats(currentUser);
  const defaultTherapist = StorageService.getTherapist();
  const therapistName = currentUser?.name || defaultTherapist.name;
  const clinicName = currentUser?.clinic || defaultTherapist.clinic;
  const connectionCode = currentUser?.connectionCode || '코드 미발급';
  const todayStr = StorageService.getTodayDateString();

  // Pending connection requests for this therapist
  const allRequests = StorageService.getRequestsForTherapist(currentUser);
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');

  const handleCopyCode = () => {
    if (!currentUser?.connectionCode) return;
    navigator.clipboard?.writeText(currentUser.connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestResponse = async (requestId: string, accept: boolean) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    try {
      const res = await StorageService.respondConnectionRequest(requestId, accept, currentUser);
      setActionStatus(res.success ? 'success' : 'error');
      setActionMsg(res.message);
      setTimeout(() => {
        setActionMsg('');
        setActionStatus(null);
      }, 4000);
    } catch (err: any) {
      setActionStatus('error');
      setActionMsg(`응답 처리 실패: ${err?.message || '오류 발생'}`);
      setTimeout(() => {
        setActionMsg('');
        setActionStatus(null);
      }, 4000);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleOpenAddModal = (tab: 'invite' | 'code' | 'requests' = 'invite') => {
    setModalDefaultTab(tab);
    setIsAddPatientModalOpen(true);
  };

  // Patients who need exercise prescription
  const patientsNeedingPrescription = stats.patientSummaries.filter(
    (s) => s.patient.assignedProgram.length === 0
  );

  const patientsNeedingFeedback = stats.patientSummaries.filter(
    (s) => s.needsFeedback
  );

  const patientsWithRecentLogs = stats.recentLogs.slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Action Notification Banner */}
      {actionMsg && (
        <div className={`p-3.5 border rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
          actionStatus === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {actionStatus === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{actionMsg}</span>
        </div>
      )}

      {/* 1. 최우선 알림: 새로운 환자 연결 요청 */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-amber-950">
                  새로운 환자 연결 요청 ({pendingRequests.length}건)
                </h2>
                <p className="text-xs text-amber-800">
                  환자가 초대 링크 또는 연결 코드를 통해 연결을 요청했습니다. 수락하면 담당 환자 목록에 자동 추가됩니다.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-950 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              승인 대기
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900 text-sm">{req.patientName} 환자</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-500 font-mono">
                      요청일시: {new Date(req.requestedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 mt-0.5">
                    1:1 맞춤형 재활운동 처방 및 관리를 위해 연결을 요청했습니다.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={processingRequestId === req.id}
                    onClick={() => handleRequestResponse(req.id, false)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {processingRequestId === req.id ? '처리 중...' : '거절'}
                  </button>
                  <button
                    type="button"
                    disabled={processingRequestId === req.id}
                    onClick={() => handleRequestResponse(req.id, true)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {processingRequestId === req.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>처리 중...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>연결 수락</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Welcome & Actions Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="font-bold text-blue-600">{clinicName}</span>
            <span>·</span>
            <span className="font-mono tabular-nums">{todayStr}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            {therapistName}의 재활 치료실
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            담당 환자의 운동 처방, 일일 수행도 및 통증 기록을 실시간 모니터링하고 피드백을 전달합니다.
          </p>
        </div>

        {/* Action Buttons: 환자 추가하기 & 연결 코드 */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAddModal('invite')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>환자 추가하기</span>
          </button>

          <div className="p-2.5 px-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold text-blue-800 block uppercase tracking-wider">
                내 연결 코드
              </span>
              <span className="font-mono font-black text-sm text-blue-950">
                {connectionCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              title="연결 코드 복사"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. 신규 치료사 최초 로그인 시: 담당 환자가 0명일 때 친절한 안내 카드 (요구사항 1) */}
      {stats.totalPatients === 0 && (
        <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-dashed border-blue-200 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg font-black text-gray-900">
              아직 등록된 환자가 없습니다
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              환자를 초대하거나 연결 코드를 공유하여 담당 환자를 추가해 보세요.
              환자가 연결 요청을 전송하고 치료사가 수락하면 자동으로 환자 목록에 표시됩니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal('invite')}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>환자 추가하기 (초대 링크)</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('code')}
              className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-2xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>연결 코드 확인하기</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">담당 대상자</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-mono tabular-nums mt-3">
            {stats.totalPatients}
            <span className="text-xs font-normal text-gray-500 ml-1">명</span>
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {stats.totalPatients === 0 ? '환자 추가 필요' : '모두 활성 관리 중'}
          </span>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">처방 필요 환자</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tabular-nums mt-3">
            {patientsNeedingPrescription.length}
            <span className="text-xs font-normal text-gray-500 ml-1">명</span>
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {patientsNeedingPrescription.length > 0 ? '운동 처방 대기' : '모두 처방 완료'}
          </span>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">오늘 전체 완료율</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tabular-nums mt-3">
            {stats.overallRate}%
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block font-mono tabular-nums">
            총 {stats.totalScheduledExercises}건 중 {stats.totalCompletedExercises}건 완료
          </span>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">피드백 필요 환자</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 font-mono tabular-nums mt-3">
            {patientsNeedingFeedback.length}
            <span className="text-xs font-normal text-purple-400 ml-1">명</span>
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {patientsNeedingFeedback.length > 0 ? '소견 작성 권장' : '최신 피드백 완료'}
          </span>
        </div>
      </div>

      {/* Main Grid: Patient Overview Table + Recent Activity Stream */}
      {stats.totalPatients > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Patient Overview Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">담당 환자 현황 요약</h2>
                  <p className="text-xs text-gray-500">환자별 처방 상태, 최근 수행일, 완료 여부 및 피드백 현황</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal('invite')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>환자 추가</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('patients')}
                    className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>상세 목록</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {stats.patientSummaries.map(({ patient, totalAssigned, completedCount, completionRate, prescriptionStatus, lastWorkoutDate, todayStatusText, needsFeedback }) => {
                  const hasNoProgram = patient.assignedProgram.length === 0;

                  return (
                    <div key={patient.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenPatientDetail) {
                                onOpenPatientDetail(patient.id);
                              } else {
                                onNavigateTab('patients', patient.id);
                              }
                            }}
                            className="font-extrabold text-gray-900 text-sm hover:text-blue-600 hover:underline text-left cursor-pointer"
                          >
                            {patient.name}
                          </button>
                          <span className="text-xs text-gray-500">
                            ({patient.gender} · {patient.age}세)
                          </span>

                          {/* 처방 상태 배지 */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            hasNoProgram ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {prescriptionStatus}
                          </span>

                          {/* 오늘 운동 완료 여부 배지 */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            todayStatusText === '오늘 완료'
                              ? 'bg-emerald-100 text-emerald-800'
                              : todayStatusText === '부분 수행'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {todayStatusText}
                          </span>

                          {/* 피드백 필요 여부 배지 */}
                          {needsFeedback && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                              <MessageSquare className="w-2.5 h-2.5" /> 피드백 필요
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mt-1 truncate max-w-md">
                          {formatPatientDiagnosis(patient.diagnosis)}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 font-mono">
                          <span>최근 운동일: <strong>{lastWorkoutDate}</strong></span>
                          <span>·</span>
                          <span>오늘 달성률: <strong>{completionRate}%</strong></span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenPatientDetail) {
                              onOpenPatientDetail(patient.id);
                            } else {
                              onNavigateTab('patients', patient.id);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                        >
                          상세 차트
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectPatientForProgram(patient.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                            hasNoProgram
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {hasNoProgram ? '운동 처방하기' : '프로그램 수정'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>※ 처방된 프로그램은 해당 환자 화면에 즉시 동기화됩니다.</span>
              <button
                type="button"
                onClick={() => onNavigateTab('prescriptions')}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                10종 운동 라이브러리 보기 →
              </button>
            </div>
          </div>

          {/* Right 1 Col: Recent Exercise Logs Activity Stream */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">최근 운동 수행 기록</h2>
                  <p className="text-xs text-gray-500">환자들이 방금 완료한 내역 및 피드백 대기</p>
                </div>
              </div>

              <div className="space-y-3">
                {patientsWithRecentLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center">아직 등록된 수행 기록이 없습니다.</p>
                ) : (
                  patientsWithRecentLogs.map((log) => {
                    const patient = StorageService.getPatientById(log.patientId);
                    const timeStr = log.loggedAt
                      ? new Date(log.loggedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const handleOpenRecentLog = () => {
                      if (!onOpenPatientDetail) return;
                      onOpenPatientDetail(log.patientId, {
                        initialTab: 'activity',
                        initialActivitySubTab: 'logs',
                        targetWorkoutLogId: log.id
                      });
                    };

                    return (
                      <button
                        key={log.id}
                        type="button"
                        onClick={handleOpenRecentLog}
                        className="group w-full text-left p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`${patient?.name || '환자'}의 ${log.date} ${log.exerciseName} 수행 기록 및 피드백 보기`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-gray-900 group-hover:text-blue-700 group-hover:underline">
                            {patient?.name || '환자'}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                            {log.date} {timeStr}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-blue-700 font-bold">{log.exerciseName}</span>
                          <span className="font-mono tabular-nums text-gray-700 font-bold">
                            {log.actualSets}세트 × {log.actualReps}회
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="flex items-center gap-1 font-bold text-rose-600">
                            <HeartPulse className="w-3.5 h-3.5" />
                            통증 NRS: {log.postPainLevel ?? log.painLevel}/10
                          </span>
                          <span className="text-[11px] font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>기록 확인 · 피드백 작성</span>
                          </span>
                        </div>

                        {log.patientNotes && (
                          <p className="text-[11px] text-gray-600 bg-white p-2 rounded-xl border border-gray-100 line-clamp-2 mt-1">
                            "{log.patientNotes}"
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal (Method A & B) */}
      {currentUser && (
        <AddPatientModal
          isOpen={isAddPatientModalOpen}
          onClose={() => setIsAddPatientModalOpen(false)}
          currentUser={currentUser}
          onPatientAdded={() => {
            setIsAddPatientModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
