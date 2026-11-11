/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthService } from '../../services/authService';
import { AuthUser } from '../../types/rehab';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  UserPlus,
  KeyRound,
  Stethoscope,
  Video,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { RehabLogo } from './RehabLogo';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onNavigateToSignUp: () => void;
  initialUsername?: string;
  inviteTherapist?: { name: string; clinic?: string; connectionCode: string } | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToSignUp,
  initialUsername = '',
  inviteTherapist
}) => {
  const [username, setUsername] = useState<string>(initialUsername);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await AuthService.loginAsync(username, password);
      setIsLoading(false);

      if (result.success && result.user) {
        if (result.user.role === 'patient' && inviteTherapist) {
          const foundTherapist = AuthService.findTherapistByConnectionCode(inviteTherapist.connectionCode);
          if (foundTherapist) {
            StorageService.sendConnectionRequest(
              result.user.patientId || result.user.id,
              result.user.name,
              foundTherapist,
              'invite'
            );
          }
        }
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.errorMessage || '이메일(아이디) 또는 비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || '로그인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleQuickFill = (accUsername: string, accPasswordHash: string) => {
    setUsername(accUsername);
    setPassword(accPasswordHash);
    setErrorMessage('');
  };

  // Only show patient and therapist accounts for quick testing
  const allAccounts = AuthService.getAccounts().filter((a) => a.role === 'patient' || a.role === 'therapist');

  const coreFeatures = [
    {
      title: '맞춤형 재활운동 관리',
      description: '물리치료사가 환자에게 적합한 운동 프로그램을 배정하고 관리합니다.',
      icon: Stethoscope,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: '운동 영상 확인 및 수행',
      description: '환자는 배정된 운동의 영상을 확인하고 운동을 수행할 수 있습니다.',
      icon: Video,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      title: '운동 기록 및 진행 현황 확인',
      description: '환자의 운동 수행 기록을 저장하고 치료사가 진행 상황을 확인할 수 있습니다.',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        
        {/* Mobile Header (Only visible on mobile screens < lg) */}
        <div className="lg:hidden p-6 pb-2 text-center border-b border-gray-100 bg-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <RehabLogo size="md" showText={false} />
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Rehab<span className="text-blue-600">Exercise</span>
            </span>
          </div>
          <p className="text-xs font-bold text-blue-600">
            재활운동을 더 쉽고 체계적으로
          </p>
        </div>

        {/* 2-Column Responsive Grid: PC 2단 분할 레이아웃 (좌측 소개 + 우측 로그인) */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* ============================================================== */}
          {/* 좌측: 서비스 소개 영역 (PC 화면에서는 좌측, 모바일에서는 하단) */}
          {/* ============================================================== */}
          <div className="order-2 lg:order-1 lg:col-span-7 bg-slate-50/70 p-6 sm:p-10 lg:p-12 border-t lg:border-t-0 lg:border-r border-gray-100 flex flex-col justify-between">
            <div>
              {/* PC Header Brand */}
              <div className="hidden lg:flex items-center gap-2.5 mb-8">
                <RehabLogo size="md" showText={false} />
                <span className="text-2xl font-black text-gray-900 tracking-tight">
                  Rehab<span className="text-blue-600">Exercise</span>
                </span>
              </div>

              {/* Main Slogan & Service Description */}
              <div className="space-y-3 mb-8">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-snug">
                  재활운동을 더 쉽고 체계적으로
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-lg">
                  물리치료사와 환자를 연결하여 맞춤형 재활운동 프로그램을 제공하고, 운동 수행과 회복 과정을 체계적으로 관리하는 서비스입니다.
                </p>
              </div>

              {/* 3 Core Features List */}
              <div className="space-y-3.5">
                <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                  핵심 기능 안내
                </div>
                {coreFeatures.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-start gap-3.5 transition-all hover:border-gray-200"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${feat.iconBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xs sm:text-sm font-bold text-gray-900">
                          {feat.title}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subtle Footer Note */}
            <div className="pt-8 mt-8 border-t border-gray-200/70 text-[11px] text-gray-500 flex items-center justify-between">
              <span>환자와 치료사를 위한 1:1 맞춤형 재활 솔루션</span>
              <span className="font-mono text-gray-500">© 2026 Rehab Exercise</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 우측: 로그인 영역 (PC에서는 우측, 모바일에서는 상단에 먼저 노출) */}
          {/* ============================================================== */}
          <div className="order-1 lg:order-2 lg:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-6">
              
              {/* Login Title & Guide Text */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  로그인
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  계정 정보를 입력하여 시작하세요.
                </p>
              </div>

              {/* Therapist Invitation Alert (if accessed via invite link) */}
              {inviteTherapist && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {inviteTherapist.name} 물리치료사님의 초대 링크로 접속하셨습니다.
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      로그인하시면 해당 치료사와의 연결 요청이 자동으로 진행됩니다.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message Alert */}
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 animate-in fade-in duration-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email / Username Field */}
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs font-bold text-gray-700 mb-1.5"
                  >
                    이메일 또는 아이디
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="예: user@example.com 또는 patient01"
                      className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-gray-700 mb-1.5"
                  >
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer mt-2"
                >
                  <span>{isLoading ? '로그인 확인 중...' : '로그인하기'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="pt-4 border-t border-gray-100 text-center">
                <span className="text-xs text-gray-500 mr-2">
                  아직 계정이 없으신가요?
                </span>
                <button
                  type="button"
                  onClick={onNavigateToSignUp}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>회원가입</span>
                </button>
              </div>

              {/* Presentation Demo Accounts Collapsible */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="w-full py-2 px-3 text-[11px] font-semibold text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-between border border-dashed border-gray-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    시연용 테스트 계정 바로 입력
                  </span>
                  {showDemoAccounts ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>

                {showDemoAccounts && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 animate-in fade-in duration-150">
                    <p className="text-[11px] text-gray-500 leading-normal">
                      클릭 시 해당 계정의 아이디와 비밀번호가 자동으로 입력됩니다.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allAccounts.map((acc) => {
                        const isTherapist = acc.role === 'therapist';
                        return (
                          <button
                            key={acc.username}
                            type="button"
                            onClick={() => handleQuickFill(acc.username, acc.passwordHash)}
                            className="p-2 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 text-[11px] truncate">
                                {acc.name}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  isTherapist
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isTherapist ? '물리치료사' : '환자'}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                              {acc.username}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
