/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthService } from '../../services/authService';
import { AuthUser } from '../../types/rehab';
import { 
  Activity, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  UserPlus,
  KeyRound,
  Stethoscope,
  Sparkles
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { RehabLogo } from './RehabLogo';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onNavigateToSignUp: () => void;
  onNavigateToHome?: () => void;
  initialUsername?: string;
  inviteTherapist?: { name: string; clinic?: string; connectionCode: string } | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToSignUp,
  onNavigateToHome,
  initialUsername = '',
  inviteTherapist
}) => {
  const [username, setUsername] = useState<string>(initialUsername);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        setErrorMessage(result.errorMessage || '아이디(이메일) 또는 비밀번호가 일치하지 않습니다.');
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

  // Only show patient and therapist accounts (filter out any legacy super_admin)
  const allAccounts = AuthService.getAccounts().filter((a) => a.role === 'patient' || a.role === 'therapist');

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      {/* Top Presentation Banner */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-900 text-center">
        <span className="font-semibold text-blue-800">물리치료학과 발표 및 시연용 프로토타입</span>
        <span className="mx-2 text-blue-300">|</span>
        <span className="text-blue-700">로컬 데모 계정 로그인</span>
      </div>

      {/* Main Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Back to Home Button */}
          {onNavigateToHome && (
            <button
              type="button"
              onClick={onNavigateToHome}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>시작 화면으로 돌아가기</span>
            </button>
          )}

          {/* Logo & Brand Header */}
          <div className="text-center flex flex-col items-center">
            <RehabLogo size="lg" showText={false} className="mb-3" />
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Rehab<span className="text-blue-600">Exercise</span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-blue-600 mt-1">
              재활운동을 더 쉽고 체계적으로
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              환자와 물리치료사를 위한 1:1 맞춤형 재활 파트너
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">로그인</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  환자 또는 물리치료사 계정으로 접속하세요.
                </p>
              </div>

              {/* Sign Up Link */}
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>회원가입</span>
              </button>
            </div>

            {/* Therapist Invitation Notice */}
            {inviteTherapist && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {inviteTherapist.name} 물리치료사({inviteTherapist.clinic || '재활센터'})님의 초대 링크를 통해 접속하셨습니다.
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    기존 환자 계정으로 로그인하시면 해당 치료사에게 연결 요청이 자동으로 전송됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-gray-700 mb-1.5"
                >
                  이메일 또는 아이디 (Email / ID)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="예: user@example.com 또는 patient01"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-gray-700 mb-1.5"
                >
                  비밀번호 (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력 (예: demo1234)"
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                <span>{isLoading ? '로그인 확인 중...' : '로그인하기'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Bottom Sign Up Prompt */}
            <div className="pt-3 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-500 mr-2">아직 계정이 없으신가요?</span>
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                새 계정 만들기 (회원가입) →
              </button>
            </div>
          </div>

          {/* Demo Accounts Quick-Fill Box (for Smooth Presentation) */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                시연용 데모 계정 (클릭 시 자동 입력)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allAccounts.map((acc) => {
                const isSelected = username === acc.username;
                const isTherapist = acc.role === 'therapist';

                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickFill(acc.username, acc.passwordHash)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-2xs'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-xs truncate flex items-center gap-1">
                        {isTherapist ? <Stethoscope className="w-3 h-3 text-blue-600" /> : <User className="w-3 h-3 text-emerald-600" />}
                        {acc.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isTherapist
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isTherapist ? '물리치료사' : '환자'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono tabular-nums text-gray-500 mt-1">
                      ID: {acc.username} / PW: {acc.passwordHash}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        <p>© 2026 Rehab Exercise · 물리치료학과 발표 및 시연용 프로토타입</p>
      </footer>
    </div>
  );
};
