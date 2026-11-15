/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthUser } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Settings,
  LogOut,
  Stethoscope,
  KeyRound,
  Copy
} from 'lucide-react';

interface TherapistSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser: AuthUser;
  onOpenLogoutModal: () => void;
}

export const TherapistSidebar: React.FC<TherapistSidebarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onOpenLogoutModal
}) => {
  const [copied, setCopied] = useState(false);
  const connectionCode = currentUser.connectionCode || '코드 미발급';
  const requests = StorageService.getRequestsForTherapist(currentUser);
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  const handleCopyCode = () => {
    if (!currentUser.connectionCode) return;
    navigator.clipboard?.writeText(currentUser.connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Exactly 4 tabs requested by professor/user
  const menuItems = [
    { 
      id: 'dashboard', 
      label: '홈', 
      icon: LayoutDashboard,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}건 요청` : undefined
    },
    { 
      id: 'patients', 
      label: '담당 환자', 
      icon: Users
    },
    { 
      id: 'prescriptions', 
      label: '운동 처방', 
      icon: ClipboardCheck 
    },
    { 
      id: 'settings', 
      label: '마이페이지', 
      icon: Settings 
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-65px)] sticky top-[65px]">
      <div>
        {/* Therapist Connection Code Box */}
        <div className="p-3.5 mx-3 mt-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-blue-900 flex items-center gap-1 uppercase tracking-wider">
              <KeyRound className="w-3 h-3 text-blue-600" />
              환자 연결 코드
            </span>
            {currentUser.connectionCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? '복사됨!' : '복사'}</span>
              </button>
            )}
          </div>
          <div className="font-mono text-sm font-black text-blue-950 tracking-wider">
            {connectionCode}
          </div>
          <span className="text-[10px] text-blue-700/80 block leading-tight">
            환자에게 코드를 전달하여 등록을 요청하세요.
          </span>
        </div>

        {/* 4 Navigation Menus */}
        <nav className="p-3 space-y-1 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    isActive ? 'bg-white text-blue-700' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Logout */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/60 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-900 truncate flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              {currentUser.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-100 text-blue-800">
              물리치료사
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono block">
            ID: @{currentUser.username} · {currentUser.clinic || '재활센터'}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenLogoutModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
};
