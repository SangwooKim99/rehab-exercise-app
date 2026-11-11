/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Dumbbell, ClipboardList, User } from 'lucide-react';

interface PatientBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const PatientBottomNav: React.FC<PatientBottomNavProps> = ({
  currentTab,
  onTabChange
}) => {
  const tabs = [
    { id: 'home', label: '홈', icon: Home },
    { id: 'program', label: '내 운동', icon: Dumbbell },
    { id: 'history', label: '운동 기록', icon: ClipboardList },
    { id: 'profile', label: '마이페이지', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-1.5 px-3">
      <div className="max-w-md mx-auto grid grid-cols-4 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 min-h-[48px] rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
