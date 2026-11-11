/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface RehabLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  className?: string;
}

export const RehabLogo: React.FC<RehabLogoProps> = ({
  size = 'md',
  showText = true,
  textColor = 'text-gray-900',
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const subTextSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Professional Medical Movement & Rehabilitation SVG Icon */}
      <div
        className={`${iconSizes[size]} relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500 p-0.5 shadow-md flex items-center justify-center shrink-0 transition-transform hover:scale-105`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Subtle medical grid background */}
          <circle cx="24" cy="24" r="20" fill="url(#rehab-radial)" opacity="0.15" />
          
          {/* Dynamic spine / kinetic movement arc (Rehabilitation flow) */}
          <path
            d="M14 34 C12 24, 18 16, 26 14 C32 12, 36 18, 34 26 C32 32, 22 36, 18 28"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />

          {/* Pulse / Heartbeat vitality line across motion */}
          <path
            d="M11 25 L17 25 L20 18 L24 31 L28 22 L31 25 L37 25"
            stroke="#A7F3D0"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dynamic kinetic nodes (Joint / mobility points) */}
          <circle cx="26" cy="14" r="2.8" fill="#FDE047" />
          <circle cx="34" cy="26" r="2.2" fill="#67E8F9" />
          <circle cx="18" cy="28" r="2.4" fill="#60A5FA" />

          {/* Gradient definitions */}
          <defs>
            <radialGradient
              id="rehab-radial"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(24 24) rotate(90) scale(20)"
            >
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Wordmark & Tagline */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`${textSizes[size]} font-black tracking-tight ${textColor}`}>
              Rehab<span className="text-blue-600">Exercise</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase tracking-wider">
              PT Care
            </span>
          </div>
          <span className={`${subTextSizes[size]} text-gray-500 font-medium tracking-tight -mt-0.5`}>
            맞춤 재활운동 솔루션
          </span>
        </div>
      )}
    </div>
  );
};
