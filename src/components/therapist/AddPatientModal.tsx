/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthUser, ConnectionRequest } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import {
  X,
  Link,
  KeyRound,
  Copy,
  CheckCircle2,
  Users,
  Send,
  UserCheck,
  UserX,
  Share2,
  MessageSquare,
  Sparkles,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onPatientAdded?: () => void;
  onSimulatePatientInvite?: (inviteCode: string) => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPatientAdded,
  onSimulatePatientInvite
}) => {
  const [activeTab, setActiveTab] = useState<'invite' | 'code' | 'requests'>('invite');
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  if (!isOpen) return null;

  const connectionCode = currentUser.connectionCode || 'PT-GW-821';
  const therapistName = currentUser.name || '담당 물리치료사';
  const clinicName = currentUser.clinic || '재활센터';

  // Construct invite link based on current window location
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://rehab-exercise.app';
  const inviteUrl = `${baseUrl}?invite=${connectionCode}`;

  const pendingRequests = StorageService.getRequestsForTherapist(currentUser).filter(
    (r) => r.status === 'pending'
  );

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setLinkCopied(true);
    setToastMsg('초대 링크가 클립보드에 복사되었습니다.');
    setTimeout(() => {
      setLinkCopied(false);
      setToastMsg('');
    }, 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(connectionCode);
    setCodeCopied(true);
    setToastMsg('연결 코드가 클립보드에 복사되었습니다.');
    setTimeout(() => {
      setCodeCopied(false);
      setToastMsg('');
    }, 2500);
  };

  const handleCopyMessageTemplate = () => {
    const messageTemplate = `[Rehab Exercise 재활운동 관리 초대]
안녕하세요, ${clinicName} ${therapistName}입니다.
환자 맞춤형 재활운동 처방 및 관리를 위해 아래 초대 링크를 보내드립니다.
링크를 열어 가입/로그인 후 담당 치료사 연결에 동의해 주세요:
${inviteUrl}

(또는 앱에서 연결 코드 입력: ${connectionCode})`;

    navigator.clipboard?.writeText(messageTemplate);
    setTemplateCopied(true);
    setToastMsg('카카오톡/문자 안내 메시지가 복사되었습니다.');
    setTimeout(() => {
      setTemplateCopied(false);
      setToastMsg('');
    }, 2500);
  };

  // Accept or Reject Request
  const handleRequestResponse = async (requestId: string, accept: boolean) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    try {
      const res = await StorageService.respondConnectionRequest(requestId, accept, currentUser);
      setToastType(res.success ? 'success' : 'error');
      setToastMsg(res.message);
      setTimeout(() => setToastMsg(''), 3500);
      if (res.success && onPatientAdded) {
        onPatientAdded();
      }
    } catch (err: any) {
      setToastType('error');
      setToastMsg(`처리 실패: ${err?.message || '오류 발생'}`);
      setTimeout(() => setToastMsg(''), 3500);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // One-click Presentation Demo simulation: Generate a test patient request from "이영희 (58세)"
  const handleSimulateIncomingRequest = () => {
    const demoPatientId = `patient-demo-${Date.now()}`;
    const demoPatientName = '이영희';

    // 1. Add patient if not exists
    StorageService.addPatient({
      id: demoPatientId,
      name: demoPatientName,
      age: 58,
      gender: '여성',
      diagnosis: '유착성 관절낭염(오십견) 및 어깨 가동범위 제한',
      targetGoal: '어깨 굴곡 160도 회복 및 일상 통증 완화',
      therapistNotes: '신규 초대 링크를 통해 가입한 환자입니다. 운동 처방이 필요합니다.',
      assignedProgram: [],
      connectionStatus: 'pending',
      requestedTherapistId: currentUser.id,
      requestedTherapistName: currentUser.name
    });

    // 2. Add connection request
    StorageService.sendConnectionRequest(
      demoPatientId,
      demoPatientName,
      {
        id: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        passwordHash: '',
        role: 'therapist',
        connectionCode,
        accountStatus: 'active',
        registeredAt: new Date().toISOString()
      },
      'invite'
    );

    setActiveTab('requests');
    setToastMsg('시연용 가상 환자 [이영희] 님의 연결 요청이 도착했습니다!');
    setTimeout(() => setToastMsg(''), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-200 max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-gray-900">환자 추가 및 연결</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {therapistName} ({clinicName}) · 고유 코드: <strong className="font-mono text-blue-600">{connectionCode}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast alert inside modal */}
        {toastMsg && (
          <div className={`px-5 py-2.5 text-xs font-bold flex items-center gap-2 border-b animate-in fade-in ${
            toastType === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            {toastType === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="px-5 sm:px-6 pt-4 border-b border-gray-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invite'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>방법 A. 초대 링크 생성</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>방법 B. 연결 코드 공유</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'requests'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>연결 요청</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white font-mono">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* TAB 1: 방법 A. 환자 초대하기 */}
          {activeTab === 'invite' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                <span className="font-extrabold text-blue-950 text-sm block">
                  방법 A. 환자 전용 초대 링크
                </span>
                <p className="text-gray-600 leading-relaxed">
                  환자에게 링크를 카카오톡 또는 문자로 전달하세요. 환자가 링크를 열어 회원가입 또는 로그인하면 담당 치료사 연결 동의 화면이 자동으로 열립니다.
                </p>
              </div>

              {/* Generated Link Box */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  생성된 환자 초대 링크
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 p-2.5 rounded-xl border border-gray-300 bg-gray-50 font-mono text-[11px] text-gray-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{linkCopied ? '복사됨!' : '링크 복사'}</span>
                  </button>
                </div>
              </div>

              {/* Message Template Copy Box */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  안내 메시지 템플릿 (카카오톡/문자용)
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                  <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line font-mono">
                    {`[Rehab Exercise 재활운동 관리 초대]
안녕하세요, ${clinicName} ${therapistName}입니다.
환자 맞춤형 재활운동 처방 및 관리를 위해 아래 초대 링크를 보내드립니다:
${inviteUrl}`}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyMessageTemplate}
                    className="w-full py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{templateCopied ? '메시지 복사 완료!' : '안내 메시지 전체 복사'}</span>
                  </button>
                </div>
              </div>

              {/* Step By Step Guide */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
                <span className="font-bold text-gray-800 block text-[11px]">
                  초대 링크를 통한 연결 단계
                </span>
                <ol className="list-decimal list-inside space-y-1 text-gray-500 leading-relaxed">
                  <li>환자가 초대 링크를 클릭하여 접속합니다.</li>
                  <li>환자가 회원가입 또는 기존 계정으로 로그인합니다.</li>
                  <li>{therapistName} 치료사 연결 동의를 누르고 요청을 전송합니다.</li>
                  <li>치료사 대시보드에서 요청을 <strong>[수락]</strong>하면 담당 환자로 최종 등록됩니다.</li>
                </ol>
              </div>

              {/* Presentation Demo simulation */}
              {onSimulatePatientInvite && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSimulatePatientInvite(connectionCode);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>[시연용] 이 초대 링크로 환자 가입 화면 열기 (테스트)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 방법 B. 연결 코드 공유 */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                <span className="font-extrabold text-blue-950 text-sm block">
                  방법 B. 치료사 고유 연결 코드 공유
                </span>
                <p className="text-gray-600 leading-relaxed">
                  환자가 이미 Rehab Exercise 앱을 사용 중인 경우, 치료사의 고유 코드를 환자 앱의 <strong>'담당 치료사 연결'</strong> 화면에 입력하도록 안내하세요.
                </p>
              </div>

              {/* Big Code Card */}
              <div className="p-6 rounded-2xl bg-gray-50 border-2 border-blue-200 text-center space-y-3">
                <span className="text-xs text-gray-500 font-bold block">
                  {therapistName}의 고유 연결 코드
                </span>
                <div className="font-mono text-3xl font-black text-blue-950 tracking-widest">
                  {connectionCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>{codeCopied ? '코드 복사 완료!' : '연결 코드 복사하기'}</span>
                </button>
              </div>

              {/* Patient App Guide */}
              <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                <span className="font-bold text-gray-800 block">
                  환자 앱에서 코드 입력하는 방법
                </span>
                <div className="space-y-1.5 text-gray-600 leading-relaxed">
                  <p>1. 환자가 Rehab Exercise 앱에 로그인합니다.</p>
                  <p>2. 환자 홈 화면의 <strong className="text-blue-600">[담당 치료사 연결하기]</strong> 또는 마이페이지를 누릅니다.</p>
                  <p>3. 치료사 연결 코드란에 <strong className="font-mono text-gray-900">{connectionCode}</strong>를 입력합니다.</p>
                  <p>4. <strong className="text-gray-900">[연결 요청 보내기]</strong>를 누르면 치료사 화면에 승인 요청이 도착합니다.</p>
                </div>
              </div>

              {/* Quick simulation for evaluator */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleSimulateIncomingRequest}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>[시연용] 가상 환자 '이영희'의 연결 요청 즉시 생성하기</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 대기 중인 연결 요청 */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-800 text-sm">
                  도착한 환자 연결 요청 ({pendingRequests.length}건)
                </span>
                <span className="text-[11px] text-gray-500">
                  수락 시 담당 환자 목록에 자동 등록
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-700">현재 대기 중인 연결 요청이 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      환자가 초대 링크를 열거나 연결 코드를 입력하여 요청을 전송하면 이곳에 실시간으로 표시됩니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulateIncomingRequest}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>시연용 가상 환자 요청 테스트 생성</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900 text-sm">
                            {req.patientName} 환자
                          </span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                            승인 대기
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px] font-mono mt-0.5">
                          요청 시간: {new Date(req.requestedAt).toLocaleString('ko-KR')}
                        </p>
                        <p className="text-amber-800 text-xs mt-1">
                          1:1 맞춤 재활운동 처방 및 관리를 위해 연결을 요청했습니다.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          disabled={processingRequestId === req.id}
                          onClick={() => handleRequestResponse(req.id, false)}
                          className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {processingRequestId === req.id ? '처리 중...' : '거절'}
                        </button>
                        <button
                          type="button"
                          disabled={processingRequestId === req.id}
                          onClick={() => handleRequestResponse(req.id, true)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
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
              )}
            </div>
          )}

          {/* Privacy & Safety Note */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>의료 정보 보호 수칙:</strong> 환자의 자발적 연결 동의 및 치료사의 수락 완료 전에는 환자의 개인정보나 운동 기록을 조회할 수 없습니다.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-[11px] text-gray-400">
            Firebase Cloud Firestore 호환 연결 스키마 적용됨
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
