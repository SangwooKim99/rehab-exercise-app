/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole, Patient, formatPatientDiagnosis } from '../../types/rehab';
import { User, Stethoscope, Check, X, ShieldAlert, ChevronRight } from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  currentPatientId: string;
  patients: Patient[];
  onSelectRole: (role: UserRole, patientId?: string) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  currentPatientId,
  patients,
  onSelectRole
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-switcher-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
              RE
            </div>
            <div>
              <h2 id="role-switcher-title" className="text-base font-bold text-gray-900 leading-tight">
                시연 역할 선택 (데모 계정 전환)
              </h2>
              <p className="text-xs text-gray-500">발표 및 기능 테스트를 위한 역할 전환</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Callout */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              본 역할 선택은 <strong>물리치료학과 발표 및 시연 목적</strong>의 데모 기능이며 실제 보안 인증 절차를 거치지 않습니다.
              동일 브라우저의 로컬 저장소(localStorage)를 통해 처방과 수행 기록이 상호 동기화됩니다.
            </p>
          </div>
        </div>

        {/* Role Options */}
        <div className="p-6 space-y-5">
          {/* Option 1: Physical Therapist */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              관리자 모드
            </h3>
            <button
              onClick={() => {
                onSelectRole('therapist');
                onClose();
              }}
              className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                currentRole === 'therapist'
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/80'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">물리치료사로 시작하기</span>
                  {currentRole === 'therapist' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                      <Check className="w-3.5 h-3.5" /> 현재 사용 중
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  담당 물리치료사 (박건우 PT) · 대학병원 권역재활의학센터
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  대상자 관리, 운동 처방 및 설정, 수행 현황 대시보드, 세트/횟수 모니터링
                </p>
              </div>
            </button>
          </div>

          {/* Option 2: Patient */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              대상자(환자) 모드 · 데모 대상자 선택
            </h3>
            <div className="space-y-2">
              {patients.map((patient) => {
                const isSelected = currentRole === 'patient' && currentPatientId === patient.id;
                return (
                  <button
                    key={patient.id}
                    onClick={() => {
                      onSelectRole('patient', patient.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-semibold text-xs shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{patient.name}</span>
                          <span className="text-xs text-gray-500">
                            {patient.gender} · {patient.age}세
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">{formatPatientDiagnosis(patient.diagnosis)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                          <Check className="w-3.5 h-3.5" /> 사용 중
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
