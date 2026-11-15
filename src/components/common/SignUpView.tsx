/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storageService';
import { AuthUser } from '../../types/rehab';
import {
  Activity,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { RehabLogo } from './RehabLogo';

interface SignUpViewProps {
  onSignUpSuccess: (user: AuthUser) => void;
  onNavigateToLogin: () => void;
  onNavigateToHome?: () => void;
  initialRole?: 'patient' | 'therapist';
  initialInviteCode?: string;
  inviteTherapist?: { name: string; clinic?: string; connectionCode: string } | null;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  onSignUpSuccess,
  onNavigateToLogin,
  onNavigateToHome,
  initialRole = 'patient',
  initialInviteCode = '',
  inviteTherapist
}) => {
  const [role, setRole] = useState<'patient' | 'therapist'>(initialRole);
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [clinicName, setClinicName] = useState<string>('');
  const [therapistConnectionCode, setTherapistConnectionCode] = useState<string>(
    initialInviteCode || inviteTherapist?.connectionCode || ''
  );

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!name.trim()) {
      setErrorMessage('이름을 입력해주세요.');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('아이디를 입력해주세요.');
      return;
    }
    if (username.trim().length < 3) {
      setErrorMessage('아이디는 최소 3자 이상이어야 합니다.');
      return;
    }
    if (AuthService.isUsernameTaken(username)) {
      setErrorMessage('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
      return;
    }
    if (!password) {
      setErrorMessage('비밀번호를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('비밀번호는 최소 6자 이상 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const codeToConnect = (therapistConnectionCode || inviteTherapist?.connectionCode || '').trim();
      const result = await AuthService.registerAsync({
        name: name.trim(),
        username: username.trim(),
        email: username.includes('@') ? username.trim() : undefined,
        password,
        role,
        clinic: role === 'therapist' ? clinicName.trim() || '재활센터' : undefined,
        connectionCode: role === 'patient' ? codeToConnect : undefined
      });

      setIsLoading(false);

      if (result.success && result.user) {
        // If patient and provided connection code, automatically issue connection request via Firestore publicTherapists lookup
        if (role === 'patient' && codeToConnect) {
          const foundTherapist = await AuthService.findTherapistByConnectionCodeAsync(codeToConnect);
          if (foundTherapist) {
            await StorageService.sendConnectionRequest(
              result.user.patientId || result.user.id,
              result.user.name,
              foundTherapist,
              inviteTherapist ? 'invite' : 'code'
            );
          }
        }
        onSignUpSuccess(result.user);
      } else {
        setErrorMessage(result.errorMessage || '회원가입 처리 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || '회원가입 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      {/* Top Service Banner */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-900 text-center">
        <span className="font-semibold text-blue-800">Rehab Exercise 맞춤형 재활운동 플랫폼</span>
        <span className="mx-2 text-blue-300">|</span>
        <span className="text-blue-700">신규 회원가입</span>
      </div>

      {/* Main Sign Up Card Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg space-y-6">
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
            <RehabLogo size="md" showText={false} className="mb-2.5" />
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              신규 회원가입
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Rehab Exercise와 함께 맞춤형 재활 솔루션을 시작하세요
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-5">
            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 animate-in fade-in duration-150"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection Segmented Control */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  회원 유형 선택 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('patient');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      role === 'patient'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>환자 (재활 대상자)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole('therapist');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      role === 'therapist'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>물리치료사</span>
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-semibold text-gray-700 mb-1.5"
                >
                  이름 (실명) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 이영희"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Username Input */}
              <div>
                <label
                  htmlFor="signup-username"
                  className="block text-xs font-semibold text-gray-700 mb-1.5"
                >
                  이메일 또는 아이디 <span className="text-rose-500">*</span> (Firebase Auth 계정)
                </label>
                <input
                  id="signup-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="예: user@example.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoComplete="username"
                  required
                />
              </div>

              {/* Password Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password Input */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    비밀번호 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    비밀번호 확인 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호 재입력"
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Physical Therapist Clinic Info (Optional) */}
              {role === 'therapist' && (
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <label
                    htmlFor="signup-clinic"
                    className="block text-xs font-semibold text-blue-900"
                  >
                    소속 병원 / 재활센터명 (선택)
                  </label>
                  <input
                    id="signup-clinic"
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="예: 서울대학병원 재활의학과 또는 바른정형외과"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-blue-700">
                    가입 완료 즉시 전용 환자 연결 코드(예: PT-XXXX)가 자동 발급됩니다.
                  </p>
                </div>
              )}

              {/* Patient connection code input & guidance */}
              {role === 'patient' && (
                <div className="space-y-2">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="signup-therapist-code"
                        className="text-xs font-bold text-blue-900 flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        <span>담당 물리치료사 연결 코드 (선택사항)</span>
                      </label>
                      {inviteTherapist && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                          <span>초대 연동됨</span>
                        </span>
                      )}
                    </div>
                    <input
                      id="signup-therapist-code"
                      type="text"
                      value={therapistConnectionCode}
                      onChange={(e) => setTherapistConnectionCode(e.target.value.toUpperCase())}
                      placeholder="예: PT-1234"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 bg-white font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder:normal-case placeholder:font-sans"
                    />
                    {inviteTherapist ? (
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        🎉 <strong>{inviteTherapist.name} 물리치료사({inviteTherapist.clinic || '재활센터'})</strong>님의 초대로 가입 즉시 담당 치료사에게 연결 요청이 발송됩니다.
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        담당 물리치료사에게 전달받은 코드(예: PT-1234)가 있다면 입력해 주세요. 가입 완료 후 환자 홈 화면에서도 언제든 연결할 수 있습니다.
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      가입 즉시 환자 홈으로 접속되며, 상호 동의 하에 안전하게 연결됩니다.
                    </span>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                <span>{isLoading ? '가입 처리 중...' : `${role === 'therapist' ? '물리치료사' : '환자'}로 즉시 시작하기`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="pt-3 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <span>이미 계정이 있으신가요? 기존 회원 로그인 →</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        <p>© 2026 Rehab Exercise · 환자-물리치료사 맞춤형 재활운동 플랫폼</p>
      </footer>
    </div>
  );
};
