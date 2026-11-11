/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole, Patient, formatPatientDiagnosis } from '../../types/rehab';
import { Activity, Stethoscope, User, ArrowRight, ShieldCheck, HeartPulse, ClipboardCheck, Sparkles } from 'lucide-react';

interface LandingViewProps {
  patients: Patient[];
  onSelectRole: (role: UserRole, patientId?: string) => void;
  onContinue: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  patients,
  onSelectRole,
  onContinue
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
        {/* Brand Icon & Title */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-6 shadow-xs">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Rehab Exercise
        </h1>
        <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          물리치료사와 대상자가 함께 호흡하는 전문 재활운동 처방 및 수행 관리 플랫폼
        </p>

        {/* Presentation Badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>물리치료학과 수업 발표 및 시연용 프로토타입</span>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-gray-900 text-sm">개인 맞춤 재활 처방</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-normal">
              10종의 임상 재활운동 라이브러리에서 세트·반복수·주의사항을 대상자별로 정밀 설정
            </p>
          </div>

          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <HeartPulse className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-gray-900 text-sm">직관적인 모바일 수행</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-normal">
              동작 가이드 다이어그램, 타이머, 실제 수행 횟수 및 통증 점수(VAS) 즉시 기록
            </p>
          </div>

          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-gray-900 text-sm">실시간 양방향 연동</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-normal">
              대상자가 운동을 기록하면 물리치료사 관리자 대시보드에 완료율이 즉시 반영
            </p>
          </div>
        </div>

        {/* Role Selector Cards */}
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            시연 모드 시작하기 (역할 선택)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Card 1: Patient Mode */}
            <div className="p-6 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all text-left flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">1. 대상자로 시작하기</h3>
                <p className="text-xs text-gray-500 mt-1">
                  모바일 최적화 화면에서 오늘의 재활운동 확인, 가이드 영상 시청, 수행 기록 입력
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                  <p className="text-[11px] font-semibold text-gray-500">데모 환자 선택:</p>
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectRole('patient', p.id)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium">{p.name} ({p.age}세)</span>
                      <span className="text-[11px] text-gray-500 truncate max-w-[120px]">{formatPatientDiagnosis(p.diagnosis).split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onSelectRole('patient', patients[0]?.id || 'patient-1')}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>김민수 환자로 시작</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: Physical Therapist Mode */}
            <div className="p-6 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all text-left flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">2. 물리치료사로 시작하기</h3>
                <p className="text-xs text-gray-500 mt-1">
                  PC/태블릿 최적화 대시보드에서 등록 대상자 관리, 맞춤 운동 프로그램 처방, 수행 통계 분석
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
                  <p className="font-semibold text-gray-700">담당 치료사 정보:</p>
                  <p className="text-xs text-gray-500">박건우 물리치료사 (면허 제34821호)</p>
                  <p className="text-xs text-gray-500">대학병원 권역재활의학센터 물리치료실</p>
                </div>
              </div>
              <button
                onClick={() => onSelectRole('therapist')}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>물리치료사 관리자 접속</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Demo Security Disclaimer Notice */}
        <p className="mt-8 text-xs text-gray-600 max-w-lg mx-auto">
          ※ 본 시스템의 역할 선택은 로그인 보안 인증이 아닌 수업 시연용 계정 전환 기능입니다.
          임상적으로 검증되지 않은 의학적 판단을 내리지 않으며, 모든 데이터는 브라우저 로컬 저장소에 보관됩니다.
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        <p>© 2026 Rehab Exercise · 물리치료학과 발표 및 시연용 프로토타입</p>
      </footer>
    </div>
  );
};
