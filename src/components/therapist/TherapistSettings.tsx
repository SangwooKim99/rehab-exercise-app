/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthUser, Patient, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { 
  Stethoscope, 
  KeyRound, 
  Users, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  Copy,
  HelpCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { DisconnectConfirmModal } from '../common/DisconnectConfirmModal';

interface TherapistSettingsProps {
  currentUser: AuthUser;
  onRefreshData: () => void;
  onOpenGuide?: () => void;
}

export const TherapistSettings: React.FC<TherapistSettingsProps> = ({
  currentUser,
  onRefreshData,
  onOpenGuide
}) => {
  const connectionCode = currentUser.connectionCode || '코드 미발급';
  const isVerified = currentUser.therapistVerification === 'verified';
  const myPatients = StorageService.getPatientsForTherapist(currentUser);
  const requests = StorageService.getRequestsForTherapist(currentUser);
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const [copied, setCopied] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Disconnect Confirmation Modal State
  const [patientToDisconnect, setPatientToDisconnect] = useState<Patient | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  const handleCopyCode = () => {
    if (!currentUser.connectionCode) return;
    navigator.clipboard?.writeText(currentUser.connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    try {
      const res = await StorageService.respondConnectionRequest(requestId, accept, currentUser);
      setFeedbackType(res.success ? 'success' : 'error');
      setFeedbackMsg(res.message);
      setTimeout(() => {
        setFeedbackMsg('');
        setFeedbackType(null);
      }, 4000);
      onRefreshData();
    } catch (err: any) {
      setFeedbackType('error');
      setFeedbackMsg(`응답 처리 실패: ${err?.message || '오류 발생'}`);
      setTimeout(() => {
        setFeedbackMsg('');
        setFeedbackType(null);
      }, 4000);
    } finally {
      setProcessingRequestId(null);
    }
  };

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
      setFeedbackMsg(res.message);
      setTimeout(() => setFeedbackMsg(''), 4000);
      onRefreshData();
    } catch (err: any) {
      setIsDisconnecting(false);
      setFeedbackMsg(`연결 해제 실패: ${err?.message || '오류 발생'}`);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">치료실 & 대상자 연결 관리</h1>
          <p className="text-xs text-gray-500 mt-1">
            담당 물리치료사 자격 정보, 고유 연결 코드, 환자 연결 요청 및 연동 목록을 관리합니다.
          </p>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
          isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {isVerified ? '면허 인증 완료' : '면허 검증 대기 / 수련 모드'}
        </span>
      </div>

      {feedbackMsg && (
        <div className={`p-3.5 border rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
          feedbackType === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {feedbackType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 1. Clinical Profile & Verification Box */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <span>담당 물리치료사 프로필 및 자격 상태</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-400 block text-[11px] mb-0.5">성명 및 아이디</span>
            <span className="font-bold text-gray-900 text-sm">{currentUser.name}</span>
            <span className="text-gray-500 font-mono block text-[11px] mt-0.5">@{currentUser.username}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-400 block text-[11px] mb-0.5">등록 면허 번호</span>
            <span className="font-bold text-gray-900 font-mono">{currentUser.licenseCode || '미등록'}</span>
            <span className="text-emerald-700 block text-[10px] font-semibold mt-0.5">
              {isVerified ? '보건복지부 검증 완료' : '관리자 승인 대기 중'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-400 block text-[11px] mb-0.5">소속 기관</span>
            <span className="font-bold text-gray-900">{currentUser.clinic || '재활치료센터'}</span>
            <span className="text-gray-500 block text-[11px] mt-0.5">임상 물리치료실</span>
          </div>
        </div>

        {!isVerified && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
            <span className="font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              전문가 자격 인증 안내
            </span>
            <p className="text-[11px] leading-relaxed text-amber-800">
              현재 계정은 신규 등록된 물리치료사 계정입니다. 최고 관리자가 면허 번호를 확인한 후 정식 전문가 인증 배지를 활성화합니다.
            </p>
          </div>
        )}
      </div>

      {/* 2. Connection Code & Incoming Requests */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>내 고유 환자 연결 코드</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              환자가 이 코드를 [내 정보] 화면에 입력하면 치료실에 연결 요청이 접수됩니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-700 font-mono font-extrabold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 tracking-wider">
              {connectionCode}
            </span>
            {currentUser.connectionCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? '복사됨!' : '복사'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Pending Requests List */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>연결 요청 대기 환자 ({pendingRequests.length}명)</span>
            </h3>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 bg-gray-50 rounded-xl text-center">
              현재 대기 중인 신규 환자의 연결 요청이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{req.patientName} 대상자</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        요청: {req.requestedAt?.split('T')[0]}
                      </span>
                    </div>
                    <span className="text-amber-800 block text-[11px] mt-0.5">
                      환자가 연결 코드를 입력하고 치료사 수락을 기다리고 있습니다.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={processingRequestId === req.id}
                      onClick={() => handleRespondRequest(req.id, false)}
                      className="py-1.5 px-3 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      {processingRequestId === req.id ? '처리 중...' : '거절'}
                    </button>
                    <button
                      type="button"
                      disabled={processingRequestId === req.id}
                      onClick={() => handleRespondRequest(req.id, true)}
                      className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {processingRequestId === req.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>처리 중...</span>
                        </>
                      ) : (
                        <span>연결 수락 (승인)</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connected Patients Management */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>현재 연결된 담당 대상자 ({myPatients.length}명)</span>
            </h3>
          </div>

          {myPatients.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 bg-gray-50 rounded-xl text-center">
              아직 연결된 대상자가 없습니다. 환자에게 연결 코드를 안내해주세요.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {myPatients.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{p.name}</span>
                    <span className="text-gray-500 ml-2 font-mono">({p.gender} · {p.age}세)</span>
                    <span className="text-gray-600 block text-[11px] mt-0.5 truncate max-w-sm">{formatPatientDiagnosis(p.diagnosis)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDisconnectModal(p)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors shrink-0"
                  >
                    연결 해제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {patientToDisconnect && (
        <DisconnectConfirmModal
          isOpen={!!patientToDisconnect}
          patientName={patientToDisconnect.name}
          patientId={patientToDisconnect.id}
          connectionId={StorageService.getActiveConnection(patientToDisconnect.id, currentUser)?.connectionId}
          onConfirm={handleConfirmDisconnect}
          onCancel={() => setPatientToDisconnect(null)}
          isDisconnecting={isDisconnecting}
        />
      )}

      {/* App Guide Card */}
      {onOpenGuide && (
        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/40 to-teal-50/30">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>물리치료사용 앱 사용 가이드</span>
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              환자 등록, 7개 부위별 운동 처방, 수행 기록 및 환자 영상 피드백 3단계 가이드를 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenGuide}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            가이드 다시 보기
          </button>
        </div>
      )}

      {/* Clinical Notice */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-[11px] text-gray-500 leading-relaxed flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <span>
          운동 처방 및 임상 피드백은 담당 물리치료사와 연결된 환자에게만 제공되며, Firebase Cloud Firestore 보안 규칙을 통해 보호됩니다.
        </span>
      </div>
    </div>
  );
};
