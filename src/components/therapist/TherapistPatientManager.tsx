/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, Exercise, AuthUser, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { AddPatientModal } from './AddPatientModal';
import { DisconnectConfirmModal } from '../common/DisconnectConfirmModal';
import { 
  Search, 
  User, 
  Calendar, 
  ChevronRight, 
  Settings, 
  FileText, 
  ArrowRight,
  Plus,
  UserPlus,
  MessageSquare,
  KeyRound,
  Users,
  CheckCircle2,
  Clock,
  HeartPulse,
  UserX,
  Dumbbell
} from 'lucide-react';

interface TherapistPatientManagerProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  onNavigateToProgramEditor: (patientId: string) => void;
  onNavigateToLogs: (patientId: string) => void;
  onOpenPatientDetail: (patientId: string) => void;
  currentUser?: AuthUser;
  onNavigateToSettings?: () => void;
  onPatientListUpdated?: () => void;
}

export const TherapistPatientManager: React.FC<TherapistPatientManagerProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onNavigateToProgramEditor,
  onNavigateToLogs,
  onOpenPatientDetail,
  currentUser,
  onNavigateToSettings,
  onPatientListUpdated
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'invite' | 'code' | 'requests'>('invite');
  const [disconnectMsg, setDisconnectMsg] = useState<string>('');

  const library = StorageService.getExerciseLibrary();
  const pendingRequests = currentUser
    ? StorageService.getRequestsForTherapist(currentUser).filter((r) => r.status === 'pending')
    : [];

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    formatPatientDiagnosis(p.diagnosis).toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const todayStats = selectedPatient ? StorageService.getPatientTodayStats(selectedPatient.id) : null;
  const patientLogs = selectedPatient ? StorageService.getWorkoutLogs(selectedPatient.id) : [];
  const recentLog = patientLogs.length > 0 ? patientLogs[0] : undefined;

  // Disconnect Confirmation Modal State
  const [patientToDisconnect, setPatientToDisconnect] = useState<Patient | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  const handleOpenDisconnectModal = (patient: Patient) => {
    setPatientToDisconnect(patient);
  };

  const handleConfirmDisconnect = async () => {
    if (!patientToDisconnect) return;
    setIsDisconnecting(true);
    try {
      const conn = StorageService.getActiveConnection(patientToDisconnect.id, currentUser);
      const res = await StorageService.disconnectPatient(patientToDisconnect.id, currentUser, conn?.connectionId);
      setIsDisconnecting(false);
      setPatientToDisconnect(null);
      if (res.success) {
        setDisconnectMsg(res.message);
        setTimeout(() => setDisconnectMsg(''), 4000);
        const remaining = patients.filter((p) => p.id !== patientToDisconnect.id);
        if (selectedPatientId === patientToDisconnect.id && remaining.length > 0) {
          onSelectPatient(remaining[0].id);
        }
        if (onPatientListUpdated) {
          onPatientListUpdated();
        }
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      setIsDisconnecting(false);
      alert(`연결 해제 실패: ${err?.message || '오류 발생'}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Disconnect notification */}
      {disconnectMsg && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{disconnectMsg}</span>
        </div>
      )}

      {/* Pending Connection Requests Alert */}
      {pendingRequests.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              새로운 환자 <strong>{pendingRequests[0].patientName}</strong> 님 외 <strong>{pendingRequests.length}건</strong>의 연결 요청이 대기 중입니다.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalDefaultTab('requests');
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            요청 확인 및 수락 →
          </button>
        </div>
      )}

      {/* Top Header & Search Bar & 환자 추가 버튼 */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">담당 환자 관리</h1>
            <p className="text-xs text-gray-500 mt-1">
              연결된 재활 환자 목록을 조회하고 맞춤형 운동 처방 및 수행 현황을 확인합니다.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="환자 이름 또는 진단명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 환자 추가 버튼 */}
            <button
              type="button"
              onClick={() => {
                setModalDefaultTab('invite');
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-98 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>환자 추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 0명 환자일 때 친절한 안내 카드 (요구사항 1) */}
      {patients.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-blue-200 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg font-black text-gray-900">
              아직 등록된 환자가 없습니다
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              환자를 초대하거나 연결 코드를 공유하여 담당 환자를 추가해 보세요.
              환자가 연결 요청을 제출하고 수락하면 자동으로 환자 목록에 표시됩니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalDefaultTab('invite');
                setIsAddModalOpen(true);
              }}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>환자 추가하기 (초대 링크)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModalDefaultTab('code');
                setIsAddModalOpen(true);
              }}
              className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-2xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>연결 코드 확인하기</span>
            </button>
          </div>
        </div>
      ) : (
        /* Two-Column Master-Detail Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Patient List (요구사항 3 명시 항목 충족) */}
          <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                담당 환자 목록 ({filteredPatients.length}명)
              </h2>
              <button
                type="button"
                onClick={() => {
                  setModalDefaultTab('invite');
                  setIsAddModalOpen(true);
                }}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>추가</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {filteredPatients.map((patient) => {
                const isSelected = patient.id === selectedPatient?.id;
                const stats = StorageService.getPatientTodayStats(patient.id);
                const logs = StorageService.getWorkoutLogs(patient.id);
                const pRecentLog = logs.length > 0 ? logs[0] : undefined;
                const lastDate = pRecentLog ? pRecentLog.date : '수행 기록 없음';
                const hasNoPrescription = patient.assignedProgram.length === 0;

                // Needs feedback check
                let needsFeedback = false;
                if (pRecentLog) {
                  const latestFeedback = patient.feedbacks && patient.feedbacks.length > 0 ? patient.feedbacks[0] : undefined;
                  const feedbackDate = latestFeedback ? new Date(latestFeedback.date).getTime() : 0;
                  const logDate = new Date(pRecentLog.loggedAt).getTime();
                  if (!latestFeedback || logDate > feedbackDate || pRecentLog.painLevel >= 3) {
                    needsFeedback = true;
                  }
                }

                return (
                  <div
                    key={patient.id}
                    onClick={() => onSelectPatient(patient.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50/70'
                    }`}
                  >
                    {/* 1. 환자 이름 & 상세보기 버튼 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm">{patient.name}</span>
                        <span className="text-xs text-gray-400 font-mono">
                          ({patient.gender} · {patient.age}세)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPatientDetail(patient.id);
                        }}
                        className="px-2 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        상세보기
                      </button>
                    </div>

                    {/* 진단명 */}
                    <p className="text-xs text-gray-600 line-clamp-1 mt-1">
                      {formatPatientDiagnosis(patient.diagnosis)}
                    </p>

                    {/* 2. 운동 처방 상태 & 운동 완료 여부 배지 */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        hasNoPrescription ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {hasNoPrescription ? '처방 필요' : `처방 완료 (${patient.assignedProgram.length}개)`}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stats.totalAssigned > 0 && stats.completedCount === stats.totalAssigned
                          ? 'bg-emerald-100 text-emerald-800'
                          : stats.completedCount > 0
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stats.totalAssigned > 0 && stats.completedCount === stats.totalAssigned
                          ? '오늘 완료'
                          : stats.completedCount > 0
                          ? `부분 수행 (${stats.completedCount}/${stats.totalAssigned})`
                          : '오늘 미수행'}
                      </span>

                      {/* 3. 피드백 필요 여부 배지 */}
                      {needsFeedback && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 flex items-center gap-0.5">
                          <MessageSquare className="w-2.5 h-2.5" /> 피드백 필요
                        </span>
                      )}
                    </div>

                    {/* 4. 최근 운동 수행 날짜 */}
                    <div className="text-[11px] text-gray-400 font-mono mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>최근 운동: {lastDate}</span>
                    </div>
                  </div>
                );
              })}

              {filteredPatients.length === 0 && (
                <p className="text-xs text-gray-400 p-6 text-center">
                  검색 결과와 일치하는 대상자가 없습니다.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Selected Patient Comprehensive Inspection Panel */}
          {selectedPatient && (
            <div className="lg:col-span-2 space-y-5">
              {/* Patient Header Card */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-gray-900">{selectedPatient.name} 환자</h2>
                      <span className="text-xs text-gray-500 font-mono">
                        ({selectedPatient.gender} · 만 {selectedPatient.age}세)
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        연결 완료
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 font-bold mt-1">
                      진단명: {formatPatientDiagnosis(selectedPatient.diagnosis)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      재활 목표: {selectedPatient.targetGoal}
                    </p>
                  </div>

                  {/* Primary Direct Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenPatientDetail(selectedPatient.id)}
                      className="px-3.5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>상세 차트 열기</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDisconnectModal(selectedPatient)}
                      className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                      title="환자 연결 해제 (운동 기록은 보존됨)"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">연결 해제</span>
                    </button>
                  </div>
                </div>

                {/* Quick 3-Tile Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block text-[11px] font-semibold">처방 운동</span>
                    <span className="font-extrabold text-gray-900 text-sm mt-0.5 block font-mono">
                      {selectedPatient.assignedProgram.length}개 운동
                    </span>
                    <span className="text-[11px] text-blue-600 font-bold mt-1 inline-block cursor-pointer hover:underline" onClick={() => onNavigateToProgramEditor(selectedPatient.id)}>
                      처방 관리하기 →
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block text-[11px] font-semibold">오늘의 완료율</span>
                    <span className="font-extrabold text-blue-600 text-sm mt-0.5 block font-mono">
                      {todayStats?.completionRate || 0}% ({todayStats?.completedCount || 0}/{todayStats?.totalAssigned || 0})
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      {todayStats?.totalAssigned === 0 ? '처방 대기' : todayStats?.completedCount === todayStats?.totalAssigned ? '오늘 완수' : '진행 중'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block text-[11px] font-semibold">최근 운동 & 통증</span>
                    <span className="font-extrabold text-gray-900 text-sm mt-0.5 block font-mono">
                      {recentLog ? `${recentLog.date} (NRS ${recentLog.postPainLevel ?? recentLog.painLevel})` : '기록 없음'}
                    </span>
                    <span className="text-[11px] text-blue-600 font-bold mt-1 inline-block cursor-pointer hover:underline" onClick={() => onOpenPatientDetail(selectedPatient.id)}>
                      기록 및 피드백 작성 →
                    </span>
                  </div>
                </div>
              </div>

              {/* Prescribed Program Preview Box */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      현재 처방된 운동 프로그램 ({selectedPatient.assignedProgram.length}개)
                    </h3>
                    <p className="text-xs text-gray-500">환자 모바일 앱에 동기화되어 매일 수행되는 운동 목록</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToProgramEditor(selectedPatient.id)}
                    className="px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>운동 추가/처방</span>
                  </button>
                </div>

                {selectedPatient.assignedProgram.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                    <Dumbbell className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="font-medium text-gray-600">아직 배정된 재활운동이 없습니다.</p>
                    <button
                      type="button"
                      onClick={() => onNavigateToProgramEditor(selectedPatient.id)}
                      className="text-xs font-bold text-blue-600 underline cursor-pointer"
                    >
                      지금 10종 라이브러리에서 처방하기
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedPatient.assignedProgram.map((item, idx) => {
                      const exercise = library.find((e) => e.id === item.exerciseId);
                      if (!exercise) return null;

                      return (
                        <div key={item.assignmentId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-400 font-bold">{idx + 1}.</span>
                              <span className="font-bold text-gray-900 text-sm">{exercise.name}</span>
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                                {exercise.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 mt-1 font-mono">
                              <span>처방: <strong>{item.sets}세트 × {item.reps}회</strong></span>
                              <span>빈도: {item.frequency}</span>
                              {item.customNotes && (
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                  주의: {item.customNotes}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-gray-400 font-mono text-[11px] shrink-0">
                            {item.assignedDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Patient Modal */}
      {currentUser && (
        <AddPatientModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          currentUser={currentUser}
          onPatientAdded={() => {
            setIsAddModalOpen(false);
            if (onPatientListUpdated) {
              onPatientListUpdated();
            }
          }}
        />
      )}

      {/* Disconnect Confirmation Modal (Requirement 2) */}
      {patientToDisconnect && (
        <DisconnectConfirmModal
          isOpen={!!patientToDisconnect}
          patientName={patientToDisconnect.name}
          patientId={patientToDisconnect.id}
          connectionId={StorageService.getActiveConnection(patientToDisconnect.id, currentUser)?.connectionId}
          onConfirm={handleConfirmDisconnect}
          onCancel={() => setPatientToDisconnect(null)}
          isProcessing={isDisconnecting}
        />
      )}
    </div>
  );
};
