/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Patient, UserAccount, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { AuthService, getFeedbackAuthorDisplayName } from '../../services/authService';
import { FirebaseService } from '../../services/firebaseService';
import { isFirebaseConfigured } from '../../config/firebaseConfig';
import { 
  User, 
  Stethoscope, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  KeyRound, 
  LogOut, 
  MessageSquare, 
  Send,
  Building,
  Heart,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileEdit
} from 'lucide-react';
import { DisconnectConfirmModal } from '../common/DisconnectConfirmModal';
import { EditDiagnosisModal } from '../common/EditDiagnosisModal';

interface PatientProfileProps {
  patient: Patient;
  onOpenLogoutModal: () => void;
  onConnectionUpdated: () => void;
  onOpenGuide?: () => void;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({
  patient,
  onOpenLogoutModal,
  onConnectionUpdated,
  onOpenGuide
}) => {
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showInquiryModal, setShowInquiryModal] = useState<boolean>(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [inquiryTitle, setInquiryTitle] = useState<string>('');
  const [inquiryContent, setInquiryContent] = useState<string>('');
  const [showEditDiagnosisModal, setShowEditDiagnosisModal] = useState<boolean>(false);

  const connectionStatus = patient.connectionStatus || 'not_connected';
  const therapistName = patient.therapistName || '담당 물리치료사';

  // Real-time lookup of therapist by code (Local + Remote Firestore publicTherapists)
  const [matchedTherapist, setMatchedTherapist] = useState<UserAccount | undefined>(undefined);

  useEffect(() => {
    const trimmed = connectionCode.trim().toUpperCase();
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
  }, [connectionCode]);

  // Connection request submit (await Firestore save with real error feedback)
  const handleRequestConnection = async (therapist: UserAccount) => {
    setIsSubmitting(true);
    setConnectMessage('');
    try {
      const res = await StorageService.sendConnectionRequest(patient.id, patient.name, therapist);
      setIsSubmitting(false);
      setConnectMessage(res.message);
      if (res.success) {
        setConnectionCode('');
        onConnectionUpdated();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setConnectMessage(`오류 발생: ${err?.message || '연결 요청 실패'}`);
    }
  };

  // Disconnect handler
  const handleOpenDisconnect = () => {
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await StorageService.disconnectPatient(patient.id);
      setIsDisconnecting(false);
      setShowDisconnectModal(false);
      setConnectMessage(res.message || '담당 물리치료사와의 연결이 해제되었습니다. 과거 기록은 안전하게 보존됩니다.');
      onConnectionUpdated();
    } catch (err: any) {
      setIsDisconnecting(false);
      setConnectMessage(`연결 해제 실패: ${err?.message || '오류 발생'}`);
    }
  };

  // Cancel pending request
  const handleCancelRequest = async () => {
    try {
      await StorageService.disconnectPatient(patient.id);
      setConnectMessage('연결 요청을 취소했습니다.');
      onConnectionUpdated();
    } catch {
      setConnectMessage('요청 취소에 실패했습니다.');
    }
  };

  // Submit inquiry
  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryTitle.trim() || !inquiryContent.trim()) return;

    StorageService.addSupportInquiry({
      authorName: patient.name,
      authorRole: 'patient',
      authorUsername: patient.id,
      type: '문의',
      title: inquiryTitle.trim(),
      content: inquiryContent.trim()
    });

    setInquiryTitle('');
    setInquiryContent('');
    setShowInquiryModal(false);
    alert('문의가 성공적으로 접수되었습니다. 관리자 및 치료사 검토 후 답변이 등록됩니다.');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{patient.name} 님</h1>
              <span className="text-xs text-gray-500 font-mono">
                ({patient.gender} · {patient.age}세)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">진단명:</span>
              <p className="text-xs text-blue-700 font-bold">
                {formatPatientDiagnosis(patient.diagnosis)}
              </p>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              목표: {patient.targetGoal}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEditDiagnosisModal(true)}
          className="self-start sm:self-center px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>진단명 수정</span>
        </button>
      </div>

      {/* Therapist Connection Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">담당 물리치료사 연결</h2>
          </div>

          {connectionStatus === 'connected' ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> 연결 완료
            </span>
          ) : connectionStatus === 'requested' ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Clock className="w-3.5 h-3.5" /> 치료사 수락 대기 중
            </span>
          ) : connectionStatus === 'disconnected' ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" /> 연결 해제됨
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              미연결 (코드 입력 필요)
            </span>
          )}
        </div>

        {/* 1. Connected State */}
        {connectionStatus === 'connected' && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 font-medium block">담당 치료사</span>
                <span className="font-bold text-gray-900 text-sm">{therapistName}</span>
              </div>
              <button
                type="button"
                onClick={handleOpenDisconnect}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
              >
                연결 해제
              </button>
            </div>
            <p className="text-gray-600 leading-relaxed text-[11px]">
              담당 물리치료사가 처방한 맞춤형 재활 프로그램이 실시간 동기화되며, 수행한 운동 결과 및 통증 기록이 치료사 차트에 안전하게 전달됩니다.
            </p>
          </div>
        )}

        {/* 2. Requested State */}
        {connectionStatus === 'requested' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-3 text-amber-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{patient.requestedTherapistName || '물리치료사'} 님에게 연결 요청 중</span>
              </div>
              <button
                type="button"
                onClick={handleCancelRequest}
                className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
              >
                요청 취소
              </button>
            </div>
            <p className="leading-relaxed text-[11px] text-amber-800">
              치료사가 관리자 화면에서 요청을 수락하면 연결이 완료됩니다. 연결 전까지는 환자분의 개인정보나 운동 기록이 조회되지 않습니다.
            </p>
          </div>
        )}

        {/* 3. Disconnected / Not Connected State */}
        {(connectionStatus === 'not_connected' || connectionStatus === 'disconnected') && (
          <div className="space-y-4">
            {connectionStatus === 'disconnected' ? (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>담당 물리치료사가 없습니다 (연결 해제 상태)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  이전 담당 치료사와의 연결이 해제되었습니다. <strong>기존 운동 기록과 과거 처방 내역은 모두 안전하게 보존</strong>되어 있으며, 새로운 물리치료사의 코드를 입력하여 다시 연동할 수 있습니다.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-600 leading-relaxed">
                병원 또는 센터의 담당 물리치료사로부터 부여받은 <strong>고유 연결 코드</strong>를 입력해주세요.
                치료사 확인 후 요청을 전송하면 치료사의 수락을 통해 안전하게 연결됩니다.
              </p>
            )}

            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={connectionCode}
                  onChange={(e) => {
                    setConnectionCode(e.target.value);
                    setConnectMessage('');
                  }}
                  placeholder="새로운 치료사 연결 코드 입력 (예: PT-GW-821)"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>

              {/* Real-time Therapist Preview Card */}
              {matchedTherapist ? (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-blue-500 font-bold block">조회된 물리치료사</span>
                      <span className="font-bold text-blue-950 text-sm">{matchedTherapist.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      matchedTherapist.therapistVerification === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {matchedTherapist.therapistVerification === 'verified' ? '면허 인증 물리치료사' : '미인증 수련 물리치료사'}
                    </span>
                  </div>

                  <p className="text-[11px] text-blue-800">
                    소속: {matchedTherapist.clinic || '재활센터'} · 코드: <code className="font-mono">{matchedTherapist.connectionCode}</code>
                  </p>

                  <button
                    type="button"
                    onClick={() => handleRequestConnection(matchedTherapist)}
                    disabled={isSubmitting}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? '전송 중...' : `${matchedTherapist.name} 치료사에게 연결 요청 보내기`}</span>
                  </button>
                </div>
              ) : connectionCode.trim().length >= 3 ? (
                <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg">
                  일치하는 물리치료사를 찾을 수 없습니다. 코드를 다시 확인해주세요.
                </p>
              ) : null}

              {connectMessage && (
                <p className="text-[11px] font-medium text-blue-700 bg-blue-50 p-2 rounded-lg">
                  {connectMessage}
                </p>
              )}

              <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500">
                <span>시연용 추천 코드: <code className="font-bold text-blue-700">PT-GW-821</code> (박건우 PT)</span>
                <button
                  type="button"
                  onClick={() => setConnectionCode('PT-GW-821')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  코드 자동 입력
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Feedbacks from Therapist */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">물리치료사 소견 및 피드백</h2>
          </div>
          <span className="text-xs text-gray-400 font-mono tabular-nums">
            {(patient.feedbacks || []).length}건
          </span>
        </div>

        {(!patient.feedbacks || patient.feedbacks.length === 0) ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            아직 등록된 치료사 피드백이 없습니다. 운동을 수행하시면 담당 치료사가 차트를 검토 후 소견을 전달합니다.
          </p>
        ) : (
          <div className="space-y-3">
            {patient.feedbacks.map((fb) => (
              <div key={fb.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{getFeedbackAuthorDisplayName(fb, patient)}</span>
                  <span className="text-[11px] text-gray-400 font-mono tabular-nums">{fb.date}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{fb.content}</p>
                {fb.recommendation && (
                  <p className="text-[11px] text-blue-700 bg-blue-50/80 p-2 rounded border border-blue-100">
                    <strong>권장 사항:</strong> {fb.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support & Inquiry Option */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-gray-800 block">문의 및 이상 증상 신고</span>
          <span className="text-[11px] text-gray-400 block">운동 중 통증이나 앱 이용 불편 사항을 관리자에게 문의할 수 있습니다.</span>
        </div>
        <button
          type="button"
          onClick={() => setShowInquiryModal(true)}
          className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
        >
          문의 접수
        </button>
      </div>

      {/* App Guide Card */}
      {onOpenGuide && (
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-xs flex items-center justify-between bg-gradient-to-r from-blue-50/40 to-teal-50/30">
          <div>
            <span className="text-xs font-bold text-gray-900 block flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>환자용 앱 사용 가이드</span>
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              치료사 연결부터 운동 수행, 통증 및 영상 기록까지 3단계 핵심 가이드를 확인합니다.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenGuide}
            className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            가이드 다시 보기
          </button>
        </div>
      )}

      {/* Session Management & Logout Button */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-gray-800 block">계정 및 세션</span>
          <span className="text-[11px] text-gray-400 block">현재 브라우저 세션에 안전하게 로그인되어 있습니다.</span>
        </div>
        <button
          onClick={onOpenLogoutModal}
          className="py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </button>
      </div>

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">문의 및 증상 신고</h3>
              <button
                type="button"
                onClick={() => setShowInquiryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInquiry} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={inquiryTitle}
                  onChange={(e) => setInquiryTitle(e.target.value)}
                  placeholder="예: 운동 시 관절 통증 문의"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">내용</label>
                <textarea
                  value={inquiryContent}
                  onChange={(e) => setInquiryContent(e.target.value)}
                  placeholder="불편 증상이나 문의 사항을 상세히 작성해주세요."
                  rows={4}
                  className="w-full p-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInquiryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  제출하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <DisconnectConfirmModal
          isOpen={showDisconnectModal}
          patientName={patient.name}
          patientId={patient.id}
          onConfirm={handleConfirmDisconnect}
          onCancel={() => setShowDisconnectModal(false)}
          isDisconnecting={isDisconnecting}
        />
      )}

      {/* Edit Diagnosis Modal */}
      {showEditDiagnosisModal && (
        <EditDiagnosisModal
          isOpen={showEditDiagnosisModal}
          onClose={() => setShowEditDiagnosisModal(false)}
          patientId={patient.id}
          patientName={patient.name}
          currentDiagnosis={patient.diagnosis}
          userRole="patient"
          updaterUid={patient.id}
          onSuccess={() => {
            onConnectionUpdated();
          }}
        />
      )}
    </div>
  );
};
