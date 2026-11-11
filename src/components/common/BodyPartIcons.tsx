/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BodyPartCategory } from '../../types/rehab';

export const ALL_BODY_PARTS: BodyPartCategory[] = [
  '목',
  '어깨',
  '팔·손',
  '허리·몸통',
  '골반·엉덩관절',
  '무릎',
  '발목·발'
];

interface BodyPartIconProps {
  part: BodyPartCategory;
  className?: string;
}

export const BodyPartIcon: React.FC<BodyPartIconProps> = ({ part, className = 'w-5 h-5' }) => {
  switch (part) {
    case '목':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Head & Neck silhouette */}
          <circle cx="12" cy="7" r="4" />
          <path d="M10 11v4a2 2 0 0 0 4 0v-4" />
          <path d="M7 19a5 5 0 0 1 10 0" />
          {/* Active cervical spine joint points */}
          <circle cx="12" cy="13" r="1" fill="currentColor" />
        </svg>
      );

    case '어깨':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Shoulders & Clavicle arc */}
          <path d="M4 18v-3a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3" />
          <circle cx="12" cy="7" r="3.5" />
          <path d="M6 14h12" strokeDasharray="2 2" />
          <circle cx="6" cy="14" r="1.5" fill="currentColor" />
          <circle cx="18" cy="14" r="1.5" fill="currentColor" />
        </svg>
      );

    case '팔·손':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Arm bending to wrist & hand */}
          <path d="M5 6l6 6-2 5h4l2-4-4-5" />
          <circle cx="15" cy="17" r="1.5" fill="currentColor" />
          <path d="M15 15l3 3" />
        </svg>
      );

    case '허리·몸통':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Torso & Spinal column */}
          <path d="M7 4h10l-2 16H9L7 4z" />
          <path d="M12 5v14" strokeWidth="2.2" />
          <path d="M10 9h4" />
          <path d="M9.5 13h5" />
          <path d="M10 17h4" />
        </svg>
      );

    case '골반·엉덩관절':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Pelvis & Hip joints */}
          <path d="M5 8c0 4 3 7 7 7s7-3 7-7" />
          <path d="M8 15l-2 6" />
          <path d="M16 15l2 6" />
          <circle cx="6" cy="15" r="1.5" fill="currentColor" />
          <circle cx="18" cy="15" r="1.5" fill="currentColor" />
        </svg>
      );

    case '무릎':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Femur, Patella, Tibia */}
          <path d="M10 3l2 8-2 10" />
          <path d="M14 3l2 8-2 10" />
          <circle cx="13" cy="11" r="2.5" fill="currentColor" />
          <path d="M9 11h8" strokeDasharray="1 2" />
        </svg>
      );

    case '발목·발':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Tibia to Ankle joint and Foot arch */}
          <path d="M9 3v11l-3 4c-1 1-1 3 1 3h12c1.5 0 2-1 1-2l-3-4V3" />
          <circle cx="11" cy="14" r="1.8" fill="currentColor" />
        </svg>
      );

    default:
      return null;
  }
};

interface BodyPartBadgeProps {
  part?: BodyPartCategory;
  bodyPart?: BodyPartCategory;
  isSelected?: boolean;
  onClick?: () => void;
  count?: number;
  size?: 'sm' | 'md';
}

export const BodyPartBadge: React.FC<BodyPartBadgeProps> = ({
  part,
  bodyPart,
  isSelected = false,
  onClick,
  count,
  size = 'md'
}) => {
  const activePart: BodyPartCategory = (bodyPart || part || '목') as BodyPartCategory;
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer select-none ${
        isSm ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
      } ${
        isSelected
          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
          : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
      }`}
    >
      <BodyPartIcon part={activePart} className={isSm ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
      <span>{activePart}</span>
      {typeof count === 'number' && (
        <span
          className={`ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
            isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
