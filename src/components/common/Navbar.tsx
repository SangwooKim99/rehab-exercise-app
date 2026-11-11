/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthUser } from '../../types/rehab';
import { 
  Activity, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  User, 
  Stethoscope, 
  LogOut,
  ArrowRightLeft
} from 'lucide-react';
import { RehabLogo } from './RehabLogo';
import { FirebaseService, FirebaseConnectionStatus } from '../../services/firebaseService';

interface NavbarProps {
  currentUser: AuthUser;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenLogoutModal: () => void;
  onResetData: () => void;
  isMobilePreview: boolean;
  onToggleMobilePreview: () => void;
  onQuickSwitchRole?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  onTabChange,
  onOpenLogoutModal,
  onResetData,
  isMobilePreview,
  onToggleMobilePreview,
  onQuickSwitchRole
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

  const therapistTabs = [
    { id: 'dashboard', label: '홈' },
    { id: 'patients', label: '담당 환자' },
    { id: 'prescriptions', label: '운동 처방' },
    { id: 'settings', label: '마이페이지' }
  ];

  const isTherapist = currentUser.role === 'therapist';
  const tabs = isTherapist ? therapistTabs : patientTabs;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      {/* Top Academic Presentation & Cloud Status Banner */}
      <div className="bg-blue-50/80 border-b border-blue-100 px-4 py-1.5 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-blue-800">Rehab Exercise</span>
          <span className="text-blue-300">|</span>
          <span className="text-blue-700 font-medium">
            {isTherapist ? '물리치료사 모드' : '환자 재활 모드'}
          </span>
          <span className="text-blue-300">|</span>
          {/* Live Firebase Connection Status Badge (Requirement 15) */}
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
          {/* Quick Role Switcher for Evaluation */}
          {onQuickSwitchRole && (
            <button
              onClick={onQuickSwitchRole}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs transition-colors cursor-pointer"
              title="상대 역할 계정으로 즉시 전환"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>{isTherapist ? '김민수 환자로 전환' : '박건우 치료사로 전환'}</span>
            </button>
          )}

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
          <button
            onClick={onResetData}
            className="flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-rose-600 transition-colors cursor-pointer"
            title="초기 데모 데이터로 복원"
          >
            <RefreshCw className="w-3 h-3" />
            <span>데모 초기화</span>
          </button>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <RehabLogo size="sm" showText={false} />
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-gray-900 whitespace-nowrap">
                Rehab<span className="text-blue-600">Exercise</span>
              </span>
              <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                {isTherapist ? '물리치료사 포털' : '재활운동 관리 솔루션'}
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6">
            {tabs.map((tab) => {
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
            {/* User Profile Capsule */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/70">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${
                  isTherapist ? 'bg-blue-600' : 'bg-emerald-600'
                }`}
              >
                {isTherapist ? (
                  <Stethoscope className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="text-left text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isTherapist
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isTherapist ? '물리치료사' : '환자'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 font-mono block leading-tight">
                  @{currentUser.username}
                </span>
              </div>
            </div>

            {/* Logout Action Button */}
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

        {/* Mobile Navigation Tabs for Therapist */}
        {isTherapist && (
          <div className="md:hidden flex items-center justify-between gap-1 overflow-x-auto py-2 border-t border-gray-100 no-scrollbar">
            <div className="flex items-center gap-1.5">
              {tabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
