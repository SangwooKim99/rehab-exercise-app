/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Video, 
  Play, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FileText, 
  Sparkles,
  ShieldCheck,
  User
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { PatientVideoSubmission } from '../../types/rehab';
import { formatTherapistDisplayName } from '../../services/authService';

interface TherapistVideoReviewSectionProps {
  patientId: string;
  patientName: string;
  therapistName?: string;
  onFeedbackSaved?: () => void;
}

export const TherapistVideoReviewSection: React.FC<TherapistVideoReviewSectionProps> = ({
  patientId,
  patientName,
  therapistName,
  onFeedbackSaved
}) => {
  const submissions = StorageService.getVideoSubmissions(patientId);
  const [selectedSubId, setSelectedSubId] = useState<string>(submissions[0]?.id || '');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');

  const activeSubmission = submissions.find((s) => s.id === selectedSubId) || submissions[0];

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission || !feedbackInput.trim()) return;

    setIsSaving(true);

    setTimeout(() => {
      const displayName = formatTherapistDisplayName(therapistName);
      StorageService.addVideoFeedback(activeSubmission.id, feedbackInput.trim(), displayName);
      setIsSaving(false);
      setFeedbackInput('');
      setSavedSuccessMsg('영상 피드백이 저장되어 대상자의 화면에 실시간으로 전달되었습니다.');
      setTimeout(() => setSavedSuccessMsg(''), 4000);

      if (onFeedbackSaved) {
        onFeedbackSaved();
      }
    }, 250);
  };

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-200 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Video className="w-7 h-7" />
        </div>
        <h3 className="text-base font-extrabold text-gray-900">
          제출된 재활운동 영상이 없습니다
        </h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          {patientName} 님이 가정에서 운동 수행 영상을 촬영하여 제출하면, 이곳에서 자세를 확인하고 구간별 맞춤 피드백을 전달할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 rounded-3xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-gray-900">
                {patientName} 님의 운동 영상 분석 및 피드백
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                총 {submissions.length}건
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              영상을 재생하며 관절 정렬, 보상 작용 유무를 확인하고 임상 피드백을 작성하세요.
            </p>
          </div>
        </div>
      </div>

      {savedSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Main 2-Column: Video Player on Left, List & Feedback on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Player & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeSubmission ? (
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600">
                    {activeSubmission.exerciseName}
                  </span>
                  <h4 className="text-base font-black text-gray-900">
                    {activeSubmission.fileName}
                  </h4>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activeSubmission.submittedAt).toLocaleString()}
                </span>
              </div>

              {/* Player Area */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-900">
                {activeSubmission.videoUrl ? (
                  <video
                    src={activeSubmission.videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-white">
                    <Play className="w-12 h-12 text-blue-400 mx-auto opacity-80" />
                    <p className="text-xs font-bold text-gray-300">
                      [시연용 샘플 영상: {activeSubmission.exerciseName}]
                    </p>
                    <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                      실제 환경에서는 환자가 업로드한 고화질 MP4 파일이 재생되며, 재생 중 정지하여 각도를 관찰할 수 있습니다.
                    </p>
                  </div>
                )}
              </div>

              {/* Patient Notes */}
              {activeSubmission.patientNotes && (
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-900">
                  <span className="font-extrabold block text-blue-950 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>환자 메모 및 질문:</span>
                  </span>
                  <p className="leading-relaxed">"{activeSubmission.patientNotes}"</p>
                </div>
              )}

              {/* Existing Feedback if completed */}
              {activeSubmission.status === 'feedback_completed' && activeSubmission.therapistFeedback && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-800 font-extrabold text-[11px]">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>작성된 피드백 ({activeSubmission.therapistName || therapistName})</span>
                    </span>
                    {activeSubmission.feedbackAt && (
                      <span className="text-[10px] text-emerald-600">
                        {new Date(activeSubmission.feedbackAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="leading-relaxed font-medium">
                    "{activeSubmission.therapistFeedback}"
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Column: Submission Selector & Feedback Writer (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Submission List Selector */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3">
            <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
              제출 영상 목록 ({submissions.length})
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {submissions.map((sub) => {
                const isSelected = sub.id === (activeSubmission?.id || '');
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubId(sub.id);
                      setFeedbackInput(sub.therapistFeedback || '');
                    }}
                    className={`w-full p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate max-w-[170px]">
                        {sub.exerciseName}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          sub.status === 'feedback_completed'
                            ? isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                            : isSelected
                            ? 'bg-amber-400 text-gray-900'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sub.status === 'feedback_completed' ? '피드백 완료' : '대기 중'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] opacity-80">
                      <span>{sub.fileName}</span>
                      <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Form */}
          {activeSubmission && (
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
              <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>
                  {activeSubmission.status === 'feedback_completed' ? '피드백 수정하기' : '영상 피드백 작성하기'}
                </span>
              </h4>

              <form onSubmit={handleSaveFeedback} className="space-y-3">
                <textarea
                  rows={4}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="예: 2세트 중반부터 골반이 왼쪽으로 2도 정도 기울어집니다. 거울을 보며 양쪽 골반 높이를 수평으로 맞추고 턱을 1cm 더 당겨주세요."
                  className="w-full p-3 text-xs rounded-2xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />

                <button
                  type="submit"
                  disabled={isSaving || !feedbackInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSaving ? '저장 중...' : '피드백 저장 및 환자 전송'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
