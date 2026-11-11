/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Video, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  Play, 
  ShieldCheck, 
  Info,
  Sparkles
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { PatientVideoSubmission } from '../../types/rehab';

interface PatientVideoUploadSectionProps {
  patientId: string;
  patientName: string;
  exerciseId: string;
  exerciseName: string;
  onSubmissionSuccess?: () => void;
}

export const PatientVideoUploadSection: React.FC<PatientVideoUploadSectionProps> = ({
  patientId,
  patientName,
  exerciseId,
  exerciseName,
  onSubmissionSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [consentAgreed, setConsentAgreed] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Fetch existing submissions for this patient and this exercise
  const allSubmissions = StorageService.getVideoSubmissions(patientId);
  const currentExerciseSubmissions = allSubmissions.filter((s) => s.exerciseId === exerciseId);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video MIME type
    if (!file.type.startsWith('video/')) {
      setErrorMessage('동영상 파일(.mp4, .mov, .webm 등)만 선택할 수 있습니다.');
      return;
    }

    // Validate size (max 100MB)
    const maxSizeBytes = 100 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('영상 용량은 최대 100MB 이하만 가능합니다. 촬영 길이를 15~60초 내외로 조절해 주세요.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
  };

  // Remove selected preview video
  const handleClearSelected = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedFile(null);
    setVideoPreviewUrl('');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle submit to therapist
  const handleSubmitVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !videoPreviewUrl) {
      setErrorMessage('제출할 동영상을 먼저 선택해 주세요.');
      return;
    }
    if (!consentAgreed) {
      setErrorMessage('담당 물리치료사와의 비공개 영상 공유에 동의해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    setTimeout(() => {
      StorageService.submitPatientVideo({
        patientId,
        patientName,
        exerciseId,
        exerciseName,
        videoUrl: videoPreviewUrl,
        fileName: selectedFile?.name || 'rehab_exercise_video.mp4',
        fileSizeBytes: selectedFile?.size || 15000000,
        patientNotes: patientNotes.trim()
      });

      setIsSubmitting(false);
      setSuccessMessage('운동 영상이 담당 물리치료사에게 성공적으로 제출되었습니다.');
      handleClearSelected();
      setPatientNotes('');

      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);

      if (onSubmissionSuccess) {
        onSubmissionSuccess();
      }
    }, 300);
  };

  // Handle delete previously submitted video
  const handleDeleteSubmission = (submissionId: string) => {
    if (confirm('제출한 운동 영상을 삭제하시겠습니까? (치료사 화면에서도 제외됩니다)')) {
      StorageService.deleteVideoSubmission(submissionId, patientId);
      if (onSubmissionSuccess) onSubmissionSuccess();
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
                내 운동 영상 제출하기
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                선택 기능
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              집에서 직접 운동하는 모습을 촬영하여 제출하면, 담당 치료사가 자세와 가동 범위를 점검해 드립니다.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Architecture Notice Box */}
      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-gray-800">개인정보 및 영상 보안:</strong> 영상은 담당 물리치료사와 환자 본인만 접근 가능한 비공개 자료로 관리됩니다. (영상 미제출 시에도 일반 운동 완료 기록은 정상 등록됩니다)
        </div>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload & Form Section */}
      <form onSubmit={handleSubmitVideo} className="space-y-4">
        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
          id={`video-upload-${exerciseId}`}
        />

        {/* Video Preview or Upload Dropzone */}
        {!videoPreviewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl p-6 text-center bg-blue-50/40 hover:bg-blue-50/70 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-extrabold text-blue-900 block">
                스마트폰 카메라로 촬영하거나 영상 파일 선택
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                MP4, MOV, WebM 지원 (최대 100MB, 권장 길이 15~45초)
              </span>
            </div>
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-blue-600" />
                <span>선택된 영상 미리보기</span>
              </span>
              <button
                type="button"
                onClick={handleClearSelected}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>영상 삭제 후 다시 선택</span>
              </button>
            </div>

            {/* Video Player */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-64 flex items-center justify-center">
              <video
                src={videoPreviewUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {selectedFile && (
              <div className="text-[11px] text-gray-500 flex items-center justify-between">
                <span>파일명: {selectedFile.name}</span>
                <span>용량: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            )}
          </div>
        )}

        {/* Patient Notes for this video */}
        {videoPreviewUrl && (
          <div className="space-y-3 animate-in fade-in">
            <div>
              <label htmlFor={`patient-notes-${exerciseId}`} className="block text-xs font-bold text-gray-700 mb-1">
                치료사에게 전달할 질문이나 수행 시 느낌 (선택)
              </label>
              <textarea
                id={`patient-notes-${exerciseId}`}
                rows={2}
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="예: 3세트 할 때 무릎 안쪽에 뻐근함이 있습니다. 자세가 적절한지 봐주세요."
                className="w-full p-3 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Privacy Consent Checkbox */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentAgreed}
                onChange={(e) => setConsentAgreed(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
              />
              <span className="text-[11px] text-gray-600 leading-tight">
                (필수) 담당 물리치료사와의 비공개 임상 피드백을 위해 본 운동 영상을 안전하게 공유하는 것에 동의합니다.
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !consentAgreed}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? '영상 전송 중...' : '담당 물리치료사에게 영상 제출하기'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Previously Submitted Videos & Feedback History for this exercise */}
      {currentExerciseSubmissions.length > 0 && (
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>제출한 영상 및 치료사 피드백 내역 ({currentExerciseSubmissions.length}건)</span>
          </h4>

          <div className="space-y-3">
            {currentExerciseSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{sub.fileName}</span>
                    <span className="text-[11px] text-gray-400">
                      ({new Date(sub.submittedAt).toLocaleDateString()})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {sub.status === 'feedback_completed' ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>피드백 완료</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>치료사 확인 대기 중</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteSubmission(sub.id)}
                      className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="제출 영상 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Patient notes if any */}
                {sub.patientNotes && (
                  <p className="text-[11px] text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100">
                    <strong>환자 메모:</strong> {sub.patientNotes}
                  </p>
                )}

                {/* Therapist feedback if completed */}
                {sub.status === 'feedback_completed' && sub.therapistFeedback ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{sub.therapistName || '담당 물리치료사'}의 영상 피드백</span>
                      </span>
                      {sub.feedbackAt && (
                        <span className="text-[10px] text-emerald-600 font-mono">
                          {new Date(sub.feedbackAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed font-medium">
                      "{sub.therapistFeedback}"
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    담당 치료사가 영상을 확인한 후 자세 교정 피드백을 남길 예정입니다.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
