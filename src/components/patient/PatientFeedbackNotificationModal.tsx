/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import { ClinicalFeedback, Patient } from '../../types/rehab';
import { getFeedbackAuthorDisplayName } from '../../services/authService';

export interface PatientFeedbackNotificationModalProps {
  isOpen: boolean;
  feedbacks: ClinicalFeedback[];
  patient?: Patient | null;
  onClose: () => void;
  /**
   * 3-B-3 단계에서 실제 화면 이동과 연결되는 콜백 인터페이스.
   * 미전달 시 버튼은 비활성화되며 이동을 수행하지 않습니다.
   */
  onSelectFeedback?: (feedback: ClinicalFeedback) => void;
  /** 이동 처리 진행 중 여부 (버튼 연타에 따른 중복 이동 방지) */
  isNavigating?: boolean;
  /** 현재 이동 처리 중인 피드백 ID */
  navigatingFeedbackId?: string | null;
}

function formatFeedbackDate(feedback: ClinicalFeedback): string {
  if (typeof feedback.date === 'string' && feedback.date.trim()) {
    return feedback.date.trim();
  }
  if (typeof feedback.createdAt === 'string' && feedback.createdAt.trim()) {
    const parsed = new Date(feedback.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return '작성일 정보 없음';
}

export const PatientFeedbackNotificationModal: React.FC<PatientFeedbackNotificationModalProps> = ({
  isOpen,
  feedbacks,
  patient,
  onClose,
  onSelectFeedback,
  isNavigating = false,
  navigatingFeedbackId = null
}) => {
  // ESC 키로 팝업 닫기 (읽음 처리 없이 단순 닫기만 수행)
  useEffect(() => {
    if (!isOpen || feedbacks.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, feedbacks.length, onClose]);

  if (!isOpen || feedbacks.length === 0) return null;

  const isNavigationReady = typeof onSelectFeedback === 'function';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-feedback-notification-title"
      aria-describedby="patient-feedback-notification-desc"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6 sm:pt-6 border-b border-gray-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="patient-feedback-notification-title"
                className="text-base sm:text-lg font-bold text-gray-900 leading-snug"
              >
                새로운 물리치료사 피드백
              </h2>
              <p
                id="patient-feedback-notification-desc"
                className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap"
              >
                <span>
                  미읽음 피드백{' '}
                  <strong className="font-semibold text-blue-600 font-mono tabular-nums">
                    {feedbacks.length}건
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>아직 확인하지 않은 소견이 도착했습니다.</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="알림 팝업 닫기"
            title="닫기"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Unread Feedback List */}
        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-gray-100 px-5 sm:px-6">
          {feedbacks.map((feedback) => {
            const authorName = getFeedbackAuthorDisplayName(feedback, patient);
            const writtenDate = formatFeedbackDate(feedback);
            const hasLinkedWorkoutLog = Boolean(
              typeof feedback.workoutLogId === 'string' && feedback.workoutLogId.trim()
            );

            return (
              <article key={feedback.id} className="py-4 sm:py-5 space-y-3">
                {/* Metadata row (unboxed text with typographic separators) */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">{authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{writtenDate}</span>
                  <span aria-hidden="true">·</span>
                  <span className={hasLinkedWorkoutLog ? 'text-blue-700 font-medium' : 'text-gray-500'}>
                    {hasLinkedWorkoutLog ? '연결된 운동 기록 있음' : '일반 피드백'}
                  </span>
                </div>

                {/* Feedback content preview */}
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
                    {feedback.content}
                  </p>
                  {feedback.recommendation && feedback.recommendation.trim() && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-1">
                      권장 사항: {feedback.recommendation.trim()}
                    </p>
                  )}
                </div>

                {/* Action row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {!isNavigationReady && (
                    <span className="text-[11px] text-gray-400">
                      다음 단계에서 연결 예정
                    </span>
                  )}

                  {(() => {
                    const isThisItemNavigating = isNavigating && navigatingFeedbackId === feedback.id;
                    const isButtonDisabled = !isNavigationReady || isNavigating;

                    return (
                      <button
                        type="button"
                        disabled={isButtonDisabled}
                        aria-disabled={isButtonDisabled}
                        onClick={() => {
                          if (!isButtonDisabled && onSelectFeedback) {
                            onSelectFeedback(feedback);
                          }
                        }}
                        className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                          !isNavigationReady
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed ml-auto'
                            : isNavigating
                              ? 'bg-blue-400 text-white cursor-wait ml-auto'
                              : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer ml-auto'
                        }`}
                      >
                        <span>{isThisItemNavigating ? '이동 중...' : '피드백 바로보기'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    );
                  })()}
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 sm:px-6 border-t border-gray-100 bg-gray-50/70 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500 leading-relaxed text-center sm:text-left">
            닫아도 읽음 처리되지 않으며, 다음에 다시 확인할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            나중에 보기
          </button>
        </div>
      </div>
    </div>
  );
};
