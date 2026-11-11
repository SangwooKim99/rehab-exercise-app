/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Stethoscope, AlertTriangle, X, Check, Loader2 } from 'lucide-react';
import { formatPatientDiagnosis } from '../../types/rehab';
import { FirebaseService } from '../../services/firebaseService';

interface EditDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  currentDiagnosis?: string;
  userRole: 'patient' | 'therapist';
  updaterUid?: string;
  isTherapistConnected?: boolean;
  onSuccess: (newDiagnosis: string) => void;
}

export const EditDiagnosisModal: React.FC<EditDiagnosisModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  currentDiagnosis = '',
  userRole,
  updaterUid,
  isTherapistConnected = true,
  onSuccess
}) => {
  const [diagnosisInput, setDiagnosisInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize input value: If currentDiagnosis is empty or a legacy placeholder, treat as empty string ''
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSaving(false);
      const isPlaceholder = formatPatientDiagnosis(currentDiagnosis) === '미입력';
      setDiagnosisInput(isPlaceholder ? '' : currentDiagnosis.trim());
    }
  }, [isOpen, currentDiagnosis]);

  if (!isOpen) return null;

  // Validation: Therapist must be connected to edit
  const canEdit = userRole === 'patient' || (userRole === 'therapist' && isTherapistConnected);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMessage('담당 환자로 연결(connected)된 상태에서만 진단명을 수정할 수 있습니다.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const cleanDiagnosis = diagnosisInput.trim();

    try {
      const result = await FirebaseService.updatePatientDiagnosis(
        patientId,
        cleanDiagnosis,
        updaterUid,
        userRole
      );

      if (!result.success) {
        setErrorMessage(result.errorMessage || '진단명 저장에 실패했습니다. 다시 시도해주세요.');
        setIsSaving(false);
        return;
      }

      setIsSaving(false);
      onSuccess(cleanDiagnosis);
      onClose();
    } catch (err: any) {
      console.error('Save diagnosis error:', err);
      setErrorMessage(err?.message || '예상치 못한 오류로 진단명을 저장하지 못했습니다.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-diagnosis-title"
    >
      <div
        className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                {userRole === 'therapist' ? '임상 진단명 등록 및 수정' : '환자 본인 진단명 수정'}
              </span>
              <h2 id="edit-diagnosis-title" className="text-base sm:text-lg font-black text-gray-950 mt-0.5">
                {patientName} 님의 진단명 관리
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {!canEdit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                현재 환자와 연결 완료(connected) 상태가 아니므로 진단명을 수정할 수 없습니다.
              </span>
            </div>
          )}

          <div>
            <label htmlFor="patient-diagnosis-input" className="block text-xs font-bold text-gray-700 mb-1.5">
              의학적 진단명 <span className="text-gray-400 font-normal">(선택 사항)</span>
            </label>
            <input
              id="patient-diagnosis-input"
              type="text"
              value={diagnosisInput}
              onChange={(e) => setDiagnosisInput(e.target.value)}
              disabled={isSaving || !canEdit}
              placeholder="예: 회전근개 파열, 요추 염좌, 십자인대 재건술 후 등"
              maxLength={80}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
              autoFocus
            />
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              * 병원에서 진단받은 정확한 의학적 진단명을 입력해주세요.
              <br />
              * 비워둘 경우 화면에 <strong>'미입력'</strong>으로 표시되며, 임의의 가짜 진단명은 입력하지 마세요.
            </p>
          </div>

          {/* Current Stored Status Indicator */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs flex items-center justify-between">
            <span className="text-gray-500 font-medium">현재 등록된 상태:</span>
            <span className="font-bold text-blue-900 font-mono">
              {formatPatientDiagnosis(currentDiagnosis)}
            </span>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">진단명 저장 실패</span>
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !canEdit}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>진단명 저장</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
