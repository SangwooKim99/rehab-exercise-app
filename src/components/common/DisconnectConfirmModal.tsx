/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserX, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface DisconnectConfirmModalProps {
  isOpen: boolean;
  patientName: string;
  patientId: string;
  connectionId?: string;
  therapistName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  isDisconnecting?: boolean;
}

export const DisconnectConfirmModal: React.FC<DisconnectConfirmModalProps> = ({
  isOpen,
  patientName,
  patientId,
  connectionId,
  therapistName,
  onConfirm,
  onCancel,
  isProcessing = false,
  isDisconnecting = false
}) => {
  if (!isOpen) return null;
  const processing = isProcessing || isDisconnecting;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disconnect-modal-title"
    >
      <div 
        className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                담당 환자 연결 해제
              </span>
              <h2 id="disconnect-modal-title" className="text-base sm:text-lg font-black text-gray-950 mt-0.5">
                이 환자와의 연결을 해제하시겠습니까?
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Target Patient Card */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 block text-[10px]">해제 대상 환자</span>
              <span className="font-extrabold text-gray-900 text-sm">{patientName} 환자</span>
              <span className="text-gray-500 font-mono text-[11px] block mt-0.5">환자 고유 ID: {patientId}</span>
            </div>
            {connectionId && (
              <div className="text-right">
                <span className="text-gray-400 block text-[10px]">연결 고유 ID</span>
                <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                  {connectionId}
                </span>
              </div>
            )}
          </div>

          {/* Core Instruction Notice Box (Requirement 2 exact text) */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-2 text-amber-950">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>연결 해제 시 주의사항</span>
            </div>
            <p className="leading-relaxed text-[12px] text-amber-900 font-medium">
              연결을 해제하면 해당 환자는 담당 환자 목록에서 제외되며, 새로운 운동 처방과 운동 기록 확인이 제한됩니다. 기존 운동 기록은 삭제되지 않습니다.
            </p>
          </div>

          {/* Safety & Data Protection Guarantee (Requirement 6) */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-[11px] text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-normal">
              환자의 기존 운동 수행 기록, 과거 처방 내역, 이전 피드백 및 환자 개인 계정은 안전하게 보존되며 언제든 재연결이 가능합니다.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions (Requirement 2 buttons: 취소, 연결 해제) */}
        <div className="p-6 pt-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <UserX className="w-4 h-4" />
            <span>{processing ? '해제 처리 중...' : '연결 해제'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
