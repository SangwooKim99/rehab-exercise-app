/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Dumbbell, 
  ClipboardCheck, 
  Users, 
  FileEdit, 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Sparkles,
  Video
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { RehabLogo } from './RehabLogo';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'patient' | 'therapist';
  userId: string;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  isOpen,
  onClose,
  role,
  userId
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    return StorageService.getOnboardingGuideDismissed(userId);
  });

  // Re-sync dismissed state and reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setDontShowAgain(StorageService.getOnboardingGuideDismissed(userId));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const patientSteps = [
    {
      stepNumber: 1,
      title: '담당 물리치료사 연결하기',
      subtitle: '전문 치료사의 1:1 맞춤 재활',
      description: '담당 물리치료사에게 전달받은 연결 코드(예: PT-GW-821) 또는 초대 링크를 통해 연결을 요청하세요. 치료사가 승인하면 맞춤 재활 프로그램이 활성화됩니다.',
      icon: KeyRound,
      color: 'blue',
      tip: '홈 화면 상단의 [담당 치료사 연결하기] 버튼을 누르면 언제든지 코드를 입력할 수 있습니다.'
    },
    {
      stepNumber: 2,
      title: '처방받은 운동 확인하기',
      subtitle: '신체 부위별 가이드 영상과 설명',
      description: '물리치료사가 처방한 오늘의 운동을 확인하고, 올바른 관절 각도와 분절 움직임을 보여주는 시범 영상과 주의사항을 꼼꼼히 살펴보세요.',
      icon: Dumbbell,
      color: 'teal',
      tip: '목, 어깨, 허리, 무릎 등 신체 부위별 카테고리 필터로 원하는 운동을 빠르게 찾을 수 있습니다.'
    },
    {
      stepNumber: 3,
      title: '운동 수행 후 기록 및 피드백 받기',
      subtitle: '통증 척도 기록과 자세 영상 제출',
      description: '운동을 마친 후 실제 수행 횟수와 통증 수준(NRS 0~10)을 기록하세요. 필요시 집에서 수행한 짧은 영상을 첨부하면 치료사에게 정밀한 자세 피드백을 받을 수 있습니다.',
      icon: Video,
      color: 'indigo',
      tip: '영상 제출은 선택 사항이며, 영상 없이도 기존 운동 완료 기록은 정상 저장됩니다.'
    }
  ];

  const therapistSteps = [
    {
      stepNumber: 1,
      title: '담당 환자 등록 및 연결하기',
      subtitle: '초대 링크 또는 연결 코드 공유',
      description: '신규 환자에게 고유 연결 코드(예: PT-GW-821)를 알려주거나 초대 링크를 공유하여 담당 환자 목록에 안전하게 추가하세요.',
      icon: Users,
      color: 'blue',
      tip: '환자가 코드를 입력하고 요청을 보내면 [연결 요청] 탭에서 원클릭으로 수락할 수 있습니다.'
    },
    {
      stepNumber: 2,
      title: '환자 맞춤 재활운동 처방하기',
      subtitle: '16종 신체 부위별 임상 라이브러리',
      description: '목, 어깨, 허리, 무릎, 발목 등 7대 신체 부위별 검증된 재활운동 라이브러리에서 환자의 진단명에 맞는 운동과 세트/반복 수를 지정하세요.',
      icon: FileEdit,
      color: 'teal',
      tip: '환자별 상세 차트에서 언제든지 운동을 추가하거나 횟수와 주의사항을 맞춤 수정할 수 있습니다.'
    },
    {
      stepNumber: 3,
      title: '수행 기록 확인 및 영상 피드백 작성',
      subtitle: '실시간 통증 추이와 영상 자세 분석',
      description: '환자가 기록한 일일 수행률과 통증 점수(NRS)를 확인하고, 환자가 제출한 수행 영상을 재생하며 구체적인 교정 코멘트를 전송하세요.',
      icon: MessageSquare,
      color: 'indigo',
      tip: '피드백을 저장하면 환자 홈과 마이페이지 화면에 실시간 알림으로 즉시 전달됩니다.'
    }
  ];

  const steps = role === 'patient' ? patientSteps : therapistSteps;
  const step = steps[currentStep];

  const handleToggleDontShowAgain = (checked: boolean) => {
    setDontShowAgain(checked);
    StorageService.setOnboardingGuideDismissed(userId, checked);
  };

  const handleFinish = () => {
    if (dontShowAgain) {
      StorageService.setOnboardingGuideDismissed(userId, true);
    }
    onClose();
  };

  const handleNext = () => {
    // 요구사항: '다시 보지 않기'를 선택한 후 다음 버튼을 누르면 해당 계정의 가이드 숨김 설정이 즉시 저장되도록 처리
    if (dontShowAgain) {
      StorageService.setOnboardingGuideDismissed(userId, true);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 flex flex-col justify-between relative animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RehabLogo size="sm" showText={false} />
            <div>
              <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider block">
                {role === 'patient' ? '환자 시작 가이드' : '물리치료사 시작 가이드'}
              </span>
              <h2 className="text-base font-black text-gray-900 -mt-0.5">
                3단계로 쉽게 시작하기
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            title="가이드 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-2 my-5">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'bg-blue-600'
                  : idx < currentStep
                  ? 'bg-blue-200'
                  : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        {/* Card Content Area */}
        <div className="py-2 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                  Step {step.stepNumber}
                </span>
                <span className="text-xs font-bold text-gray-500">{step.subtitle}</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">
                {step.title}
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
            {step.description}
          </p>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/80 flex items-start gap-2 text-xs text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{step.tip}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-5 mt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleToggleDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="text-xs text-gray-500 font-medium">다시 보지 않기</span>
          </label>

          <div className="flex items-center gap-2 justify-end">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinish}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            >
              건너뛰기
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? '시작하기' : '다음'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
