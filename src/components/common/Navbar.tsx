/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthUser } from '../../types/rehab';
import { 
  Smartphone, 
  Monitor, 
  User, 
  Stethoscope, 
  LogOut,
  ArrowLeft,
  Menu
} from 'lucide-react';
import { RehabLogo } from './RehabLogo';
import { FirebaseService, FirebaseConnectionStatus } from '../../services/firebaseService';

interface NavbarProps {
  currentUser: AuthUser;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenLogoutModal: () => void;
  isMobilePreview: boolean;
  onToggleMobilePreview: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  onOpenMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  onTabChange,
  onOpenLogoutModal,
  isMobilePreview,
  onToggleMobilePreview,
  canGoBack = false,
  onGoBack,
  onOpenMobileSidebar
}) => {
  const [fbStatus, setFbStatus] = React.useState<FirebaseConnectionStatus>(() => FirebaseService.getConnectionStatus());

  React.useEffect(() => {
    const unsub = FirebaseService.subscribeToConnectionStatus(setFbStatus);
    FirebaseService.verifyLiveConnection();
    return unsub;
  }, []);

  const patientTabs = [
    { id: 'home', label: '홈' },
    { id: 'program', label: '내 운동' },
    { id: 'history', label: '운동 기록' },
    { id: 'profile', label: '마이페이지' }
  ];

  const isTherapist = currentUser.role === 'therapist';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      {/* Top Cloud Status Banner */}
      <div className="bg-blue-50/80 border-b border-blue-100 px-4 py-1.5 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-blue-800">Rehab Exercise</span>
          <span className="text-blue-300">|</span>
          <span className="text-blue-700 font-medium">
            {isTherapist ? '물리치료사 모드' : '환자 재활 모드'}
          </span>
          <span className="text-blue-300">|</span>
          {/* Live Firebase Connection Status Badge */}
          {fbStatus.isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Firebase 연결 완료 ({fbStatus.projectId})
            </span>
          ) : fbStatus.isConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Firebase 연결 확인 중...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
              로컬 오프라인 모드
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {!isTherapist && (
            <button
              onClick={onToggleMobilePreview}
              className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-gray-700 hover:text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 transition-colors cursor-pointer"
              title="모바일 화면 비율 미리보기 전환"
            >
              {isMobilePreview ? (
                <>
                  <Monitor className="w-3 h-3" />
                  <span>넓은 화면</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3 h-3" />
                  <span>모바일 뷰</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {isTherapist ? (
          /* Therapist Top Header: Left Back Button | Center Brand Logo | Right Therapist Info & Logout */
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 h-16">
            {/* Left: Mobile Sidebar Toggle (on < lg) + Icon-only Back Button (min 44x44px) */}
            <div className="justify-self-start flex items-center gap-2 min-w-0">
              {onOpenMobileSidebar && (
                <button
                  type="button"
                  onClick={onOpenMobileSidebar}
                  className="lg:hidden inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-blue-50/80 border border-gray-200 hover:border-blue-200 shadow-2xs transition-all cursor-pointer shrink-0"
                  title="사이드바 메뉴 열기"
                  aria-label="사이드바 메뉴 열기"
                >
                  <Menu className="w-5 h-5 shrink-0" strokeWidth={2.25} />
                </button>
              )}
              <button
                type="button"
                onClick={onGoBack}
                disabled={!canGoBack}
                className={`inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border transition-all shrink-0 ${
                  canGoBack
                    ? 'text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-blue-50/80 border-gray-200 hover:border-blue-200 shadow-2xs cursor-pointer'
                    : 'text-gray-400 bg-gray-50/60 border-gray-200/70 opacity-50 cursor-not-allowed'
                }`}
                title={canGoBack ? '이전 화면으로 이동' : '현재 홈 화면입니다'}
                aria-label="뒤로가기"
              >
                <ArrowLeft className="w-[25px] h-[25px] shrink-0" strokeWidth={2.5} />
              </button>
            </div>

            {/* Center: Visually Centered RehabExercise Brand Logo & Text */}
            <div className="justify-self-center flex items-center gap-2 sm:gap-3 shrink-0">
              <RehabLogo size="sm" showText={false} />
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-gray-900 whitespace-nowrap leading-tight">
                  Rehab<span className="text-blue-600">Exercise</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap leading-tight">
                  물리치료사 포털
                </span>
              </div>
            </div>

            {/* Right: Therapist Profile Capsule & Logout */}
            <div className="justify-self-end flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/70 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 bg-blue-600">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="hidden min-[400px]:block text-left text-xs min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-900 leading-tight truncate max-w-[56px] sm:max-w-none">
                      {currentUser.name}
                    </span>
                    <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-100 text-blue-800 whitespace-nowrap">
                      물리치료사
                    </span>
                  </div>
                  <span className="hidden sm:block text-[11px] text-gray-500 font-mono leading-tight truncate max-w-[140px]">
                    @{currentUser.username}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenLogoutModal}
                className="inline-flex items-center justify-center gap-1.5 min-w-[38px] min-h-[38px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                title="세션 종료 및 로그아웃"
                aria-label="로그아웃"
              >
                <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        ) : (
          /* Patient Top Header: Unchanged */
          <div className="flex items-center justify-between gap-8 h-16">
            {/* Brand Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <RehabLogo size="sm" showText={false} />
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-gray-900 whitespace-nowrap">
                  Rehab<span className="text-blue-600">Exercise</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                  재활운동 관리 솔루션
                </span>
              </div>
            </div>

            {/* Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-6">
              {patientTabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`text-sm font-bold transition-colors whitespace-nowrap py-1 relative cursor-pointer ${
                      isActive
                        ? 'text-blue-600 font-extrabold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Capsule & Logout */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/70">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 bg-emerald-600">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-900 leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                      환자
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono block leading-tight">
                    @{currentUser.username}
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenLogoutModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors whitespace-nowrap cursor-pointer"
                title="세션 종료 및 로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
