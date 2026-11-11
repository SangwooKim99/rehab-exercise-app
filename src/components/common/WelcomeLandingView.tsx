/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Activity, 
  Stethoscope, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  HeartPulse, 
  ClipboardCheck, 
  Sparkles, 
  PlayCircle,
  LogIn,
  CheckCircle2,
  Video,
  Dumbbell
} from 'lucide-react';
import { RehabLogo } from './RehabLogo';

interface WelcomeLandingViewProps {
  onStartAsPatient: () => void;
  onStartAsTherapist: () => void;
  onNavigateToLogin: () => void;
  onDemoPatientLogin: () => void;
  onDemoTherapistLogin: () => void;
  inviteTherapist?: { name: string; clinic?: string; connectionCode: string } | null;
  onAcceptInvite?: () => void;
  onClearInvite?: () => void;
}

export const WelcomeLandingView: React.FC<WelcomeLandingViewProps> = ({
  onStartAsPatient,
  onStartAsTherapist,
  onNavigateToLogin,
  onDemoPatientLogin,
  onDemoTherapistLogin,
  inviteTherapist,
  onAcceptInvite,
  onClearInvite
}) => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      {/* Top Academic Banner */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-900 text-center">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-blue-800">물리치료학과 수업 발표 및 시연용 프로토타입</span>
          <span className="text-blue-300">|</span>
          <span className="text-blue-700">환자-물리치료사 양방향 재활운동 관리 시스템</span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Therapist Invitation Alert Banner */}
        {inviteTherapist && (
          <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-xl border border-blue-400/30 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-in fade-in duration-300">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-gray-900 shadow-xs">
                    담당 치료사 초대 도착
                  </span>
                  <span className="text-xs text-blue-100 font-mono">
                    연결 코드: {inviteTherapist.connectionCode}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">
                  {inviteTherapist.name} 물리치료사({inviteTherapist.clinic || '재활센터'})님의 맞춤 재활 초대
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 mt-1 leading-relaxed">
                  초대를 수락하고 환자 계정으로 가입 또는 로그인하시면, 담당 물리치료사에게 연결 요청이 전달되어 전문 재활운동 처방을 받으실 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={onAcceptInvite}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-white text-blue-700 font-black text-xs sm:text-sm shadow-lg hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>초대 수락하고 시작하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {onClearInvite && (
                <button
                  type="button"
                  onClick={onClearInvite}
                  className="p-2.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  title="초대 배너 닫기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header & Logo */}
        <div className="text-center max-w-3xl mx-auto flex flex-col items-center">
          <RehabLogo size="xl" showText={false} className="mb-4" />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
            Rehab<span className="text-blue-600">Exercise</span>
          </h1>
          <p className="mt-3 text-lg sm:text-xl font-bold text-blue-600">
            재활운동을 더 쉽고 체계적으로
          </p>
          <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
            환자와 물리치료사를 연결하는 전문 재활운동 처방 및 수행 관리 솔루션입니다.<br className="hidden sm:inline" />
            치료사의 정밀 처방, 16종 신체 부위별 가이드 영상, 실시간 통증 및 운동 영상 피드백을 경험하세요.
          </p>
        </div>

        {/* 2. 대표 물리치료 및 재활운동 히어로 비주얼 카드 (피드백 반영) */}
        <div className="mt-8 rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl overflow-hidden relative">
          {/* Subtle medical grid background overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Copy / Value props */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-bold backdrop-blur-xs">
                <HeartPulse className="w-3.5 h-3.5 text-teal-300" />
                <span>임상 물리치료 전문성 기반 재활 파트너</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                병원 치료실의 전문 관리를<br className="hidden sm:inline" />
                <span className="text-teal-300">내 손안의 모바일 앱</span>에서 그대로
              </h2>

              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-xl opacity-90">
                물리치료사가 직접 처방한 7대 신체 부위별 재활운동을 집에서 안전하게 수행하고, 스마트폰으로 촬영한 운동 영상을 공유하여 관절 각도와 자세에 대한 1:1 맞춤 피드백을 받을 수 있습니다.
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-teal-300" />
                  <span>16종 신체 부위별 운동</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-amber-300" />
                  <span>운동 영상 자세 피드백</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-300" />
                  <span>NRS 통증 추이 기록</span>
                </span>
              </div>
            </div>

            {/* Representative Clinical Illustration */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="w-full max-w-sm rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-xs shadow-inner space-y-3">
                <div className="aspect-[4/3] rounded-xl bg-blue-950/60 p-4 flex flex-col justify-between border border-white/10 relative overflow-hidden">
                  {/* Stylized physical therapy rehabilitation session graphics */}
                  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {/* Clinical Room floor & exam table */}
                    <line x1="20" y1="185" x2="300" y2="185" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
                    <rect x="50" y="130" width="120" height="15" rx="3" fill="#334155" />
                    <line x1="60" y1="145" x2="60" y2="185" stroke="#475569" strokeWidth="4" />
                    <line x1="160" y1="145" x2="160" y2="185" stroke="#475569" strokeWidth="4" />

                    {/* Patient on mat doing leg/core rehab */}
                    <circle cx="85" cy="115" r="12" fill="#93C5FD" />
                    <path d="M97 122 L140 125 L165 100 L185 125" stroke="#60A5FA" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Physical Therapist in scrubs guiding the movement */}
                    <circle cx="215" cy="80" r="14" fill="#34D399" />
                    <path d="M215 94 L215 145 L195 185 M215 145 L230 185" stroke="#10B981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M215 105 L175 105" stroke="#10B981" strokeWidth="5" strokeLinecap="round" />
                    
                    {/* Range of Motion angle arc */}
                    <path d="M140 125 C145 110, 155 100, 165 100" stroke="#FDE047" strokeWidth="2.5" strokeDasharray="3 3" />
                    <text x="142" y="90" fill="#FDE047" fontSize="10" fontWeight="bold">각도 45°</text>

                    {/* Target joint indicator */}
                    <circle cx="165" cy="100" r="4" fill="#F87171" />
                    <circle cx="165" cy="100" r="8" stroke="#F87171" strokeWidth="1.5" strokeDasharray="2 2" />
                  </svg>
                  
                  <div className="flex items-center justify-between text-[11px] text-blue-200 border-t border-white/10 pt-2">
                    <span className="font-bold flex items-center gap-1 text-teal-300">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>물리치료사 1:1 자세 교정 지도</span>
                    </span>
                    <span className="text-white font-mono">ROM 각도 가이드</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-blue-100 px-1">
                  <span>하지 및 척추 관절 가동성 훈련</span>
                  <span className="text-teal-300 font-bold">임상 표준 프로토콜</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1. 교수님 발표 및 사용성 평가 빠른 데모 체험 섹션 (최우선 배치) */}
        <div className="mt-10 p-6 sm:p-7 rounded-3xl bg-blue-50/70 border-2 border-blue-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>사용성 평가 원클릭 시연</span>
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 mt-2">
                계정 입력 없이 즉시 체험하기
              </h2>
              <p className="text-xs text-gray-600">
                원하는 역할을 클릭하면 가상 데이터가 세팅된 대시보드로 바로 진입합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Demo 1: Patient */}
            <button
              type="button"
              onClick={onDemoPatientLogin}
              className="p-5 rounded-2xl bg-white border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-[0.99] cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    환자 모드
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors">
                  환자 화면 체험하기 (김민수)
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal">
                  만성 요추부 염좌 재활 대상자 · 오늘의 운동 시작, 동작 가이드 확인, 실제 세트/횟수 및 NRS 통증 점수 기록
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>김민수 환자 홈으로 진입</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Quick Demo 2: Therapist */}
            <button
              type="button"
              onClick={onDemoTherapistLogin}
              className="p-5 rounded-2xl bg-white border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-[0.99] cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    물리치료사 모드
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors">
                  물리치료사 화면 체험하기 (박건우 PT)
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal">
                  대학병원 재활센터 치료사 · 담당 환자 현황 모니터링, 신규 연결 요청 수락, 10종 운동 처방 및 소견 피드백 작성
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>치료실 관리 대시보드로 진입</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* 2. 일반 회원가입 및 로그인 진입 버튼 (3개 메인 액션) */}
        <div className="mt-8">
          <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-3 text-center sm:text-left">
            신규 계정 생성 및 로그인
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Action 1: Sign up as patient */}
            <button
              type="button"
              onClick={onStartAsPatient}
              className="p-4 rounded-2xl border-2 border-gray-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 transition-all text-left flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-medium">재활 대상자</span>
                  <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700">
                    환자로 시작하기
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Action 2: Sign up as therapist */}
            <button
              type="button"
              onClick={onStartAsTherapist}
              className="p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-500 bg-white hover:bg-blue-50/30 transition-all text-left flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-medium">의료진 포털</span>
                  <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700">
                    물리치료사로 시작하기
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Action 3: Existing user login */}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="p-4 rounded-2xl border-2 border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50 transition-all text-left flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-medium">이미 가입하셨나요?</span>
                  <span className="text-sm font-bold text-gray-900 group-hover:text-black">
                    기존 회원 로그인
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* 3. 시스템 핵심 기능 소개 카드 3종 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/70">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">개인 맞춤 운동 처방</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              10종의 임상 재활운동 라이브러리(맥켄지, 브리지, 윌리엄스 굴곡 등)에서 세트·반복수·주의사항을 환자 상태별로 정밀 처방합니다.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/70">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <HeartPulse className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">가이드 수행 & 통증 기록</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              자세 다이어그램과 단계별 운동 가이드, 실제 완료 세트/횟수 및 NRS 0~10 통증 점수를 모바일에서 간편하게 기록합니다.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/70">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
              <PlayCircle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">양방향 연결 & 피드백</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              치료사 고유 코드를 통한 안전한 환자 연결, 운동 완료율 실시간 모니터링 및 임상 소견 피드백 루프를 지원합니다.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 bg-gray-50 text-center text-xs text-gray-500">
        <p className="font-medium text-gray-700">© 2026 Rehab Exercise · 물리치료학과 발표 및 시연용 프로토타입</p>
        <p className="text-[11px] text-gray-400 mt-1">
          본 웹앱은 사용성 평가를 위한 인터랙티브 프로토타입으로 모든 데이터는 브라우저 로컬 저장소에 안전하게 유지됩니다.
        </p>
      </footer>
    </div>
  );
};
