/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ExerciseSvgGuideProps {
  type: string;
  className?: string;
}

export const ExerciseSvgGuide: React.FC<ExerciseSvgGuideProps> = ({ type, className = 'w-full h-48' }) => {
  // Renders clean, clear clinical movement posture diagrams with anatomical direction arrows
  switch (type) {
    case 'knee-chest':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {/* Mat */}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Pillow */}
          <rect x="60" y="175" width="45" height="15" rx="4" fill="#E2E8F0" />
          {/* Head & Torso */}
          <circle cx="82" cy="168" r="14" fill="#3B82F6" />
          <path d="M96 172 Q150 178 200 178" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Other leg resting */}
          <path d="M200 178 Q235 155 270 188" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          {/* Exercising leg pulled to chest */}
          <path d="M200 178 Q180 120 155 130" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <path d="M155 130 Q170 155 185 145" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Hands holding knee */}
          <path d="M120 172 Q140 145 155 130" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 3" />
          {/* Pull direction arrow */}
          <path d="M165 110 L140 125 M140 125 L150 135" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="145" y="100" fill="#EF4444" fontSize="12" fontWeight="600">가슴 방향 당김</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">요추 신장 및 대둔근 이완</text>
        </svg>
      );

    case 'cat-camel':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {/* Floor */}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Hands and Knees points */}
          <line x1="120" y1="190" x2="120" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <line x1="280" y1="190" x2="280" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Cat Arch (Upper curve) */}
          <path d="M120 135 Q200 70 280 135" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <circle cx="105" cy="145" r="13" fill="#3B82F6" />
          {/* Camel Curve (Dotted alternate) */}
          <path d="M120 135 Q200 165 280 135" stroke="#94A3B8" strokeWidth="4" strokeDasharray="4 4" strokeLinecap="round" />
          {/* Up arrow */}
          <path d="M200 80 L200 60 M193 67 L200 60 L207 67" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="215" y="65" fill="#3B82F6" fontSize="12" fontWeight="600">등 둥글게 굴곡 (고양이)</text>
          <text x="215" y="165" fill="#64748B" fontSize="12">복부 부드럽게 신전 (낙타)</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">흉추 및 요추 분절 가동성 증진</text>
        </svg>
      );

    case 'trunk-rotation':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Head & Torso */}
          <circle cx="110" cy="170" r="13" fill="#3B82F6" />
          <path d="M125 174 L220 174" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Arms out T shape */}
          <line x1="150" y1="174" x2="150" y2="120" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" />
          <line x1="150" y1="174" x2="150" y2="188" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" />
          {/* Rotated knees */}
          <path d="M220 174 Q240 140 280 150" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <path d="M280 150 L275 188" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Rotation arc */}
          <path d="M245 130 C265 130 285 140 295 155" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="3 3" />
          <path d="M295 155 L292 145 M295 155 L285 153" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="270" y="120" fill="#EF4444" fontSize="12" fontWeight="600">무릎 측면 회전</text>
          <text x="120" y="110" fill="#0284C7" fontSize="12">어깨 바닥 고정</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">체간 회전 가동성 및 외복사근 신장</text>
        </svg>
      );

    case 'bracing':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Supine posture */}
          <circle cx="95" cy="170" r="13" fill="#3B82F6" />
          <path d="M110 174 L200 174" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Bent knees */}
          <path d="M200 174 L240 125 L275 188" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* Hands on lower abdomen */}
          <path d="M130 172 Q160 145 170 162" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          {/* 360 Abdominal cylinder highlight */}
          <rect x="145" y="152" width="45" height="24" rx="12" fill="#3B82F6" fillOpacity="0.2" stroke="#2563EB" strokeWidth="2" strokeDasharray="2 2" />
          {/* Pressure arrows */}
          <path d="M167 142 L167 150 M164 146 L167 150 L170 146" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M167 186 L167 178 M164 182 L167 178 L170 182" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
          <text x="167" y="125" textAnchor="middle" fill="#2563EB" fontSize="12" fontWeight="600">360도 균일한 복압 형성</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">복횡근·다열근 심부 코어 안정화</text>
        </svg>
      );

    case 'bird-dog':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Supporting hand & knee */}
          <line x1="170" y1="190" x2="170" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <line x1="240" y1="190" x2="240" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Torso straight neutral */}
          <line x1="165" y1="135" x2="245" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <circle cx="155" cy="125" r="12" fill="#3B82F6" />
          {/* Extended arm forward */}
          <line x1="165" y1="135" x2="75" y2="135" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Extended leg backward */}
          <line x1="245" y1="135" x2="335" y2="135" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Alignment guide line */}
          <line x1="60" y1="135" x2="350" y2="135" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="205" y="115" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="600">수평 일직선 정렬 유지</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">체간 회전 제어 및 후면 사슬 협응</text>
        </svg>
      );

    case 'dead-bug':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Head & Torso on mat */}
          <circle cx="110" cy="172" r="13" fill="#3B82F6" />
          <line x1="125" y1="174" x2="215" y2="174" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Left arm up, Left knee up 90 deg */}
          <line x1="150" y1="174" x2="150" y2="110" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          <path d="M215 174 L215 125 L260 125" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Right arm extended back */}
          <line x1="150" y1="174" x2="60" y2="155" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Right leg extended forward low */}
          <path d="M215 174 L310 160" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Lumbar caution point */}
          <rect x="160" y="168" width="40" height="12" rx="4" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" />
          <text x="180" y="155" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="600">허리 들림 방지</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">요추-골반 동적 안정화 훈련</text>
        </svg>
      );

    case 'bridge':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Shoulders on mat */}
          <circle cx="90" cy="174" r="13" fill="#3B82F6" />
          {/* Torso lifted in straight diagonal line */}
          <line x1="105" y1="174" x2="225" y2="115" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Knees to feet */}
          <path d="M225 115 L265 188" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Alignment guide line */}
          <line x1="95" y1="180" x2="235" y2="110" stroke="#059669" strokeWidth="2" strokeDasharray="3 3" />
          {/* Glute contraction indicator */}
          <circle cx="185" cy="135" r="16" fill="#F59E0B" fillOpacity="0.2" stroke="#D97706" strokeWidth="2" />
          <text x="185" y="100" textAnchor="middle" fill="#D97706" fontSize="12" fontWeight="600">둔근 수축 집중</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">대둔근 활성화 및 골반-고관절 신전</text>
        </svg>
      );

    case 'clamshell':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Head & upper torso */}
          <circle cx="100" cy="170" r="13" fill="#3B82F6" />
          <line x1="115" y1="172" x2="200" y2="165" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Lower leg */}
          <path d="M200 165 L255 165 L235 186" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          {/* Upper knee opened up */}
          <path d="M200 165 L250 120 L235 186" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Opening angle arc */}
          <path d="M245 160 C255 150 255 135 248 126" stroke="#EF4444" strokeWidth="2.5" />
          <path d="M248 126 L242 133 M248 126 L254 133" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <text x="270" y="140" fill="#EF4444" fontSize="12" fontWeight="600">무릎 외회전 개방</text>
          <text x="190" y="130" fill="#2563EB" fontSize="11">중둔근 수축</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">중둔근 외회전근 강화 및 골반 흔들림 예방</text>
        </svg>
      );

    case 'side-leg-raise':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Torso straight on side */}
          <circle cx="95" cy="170" r="13" fill="#3B82F6" />
          <line x1="110" y1="172" x2="200" y2="172" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* Bottom leg resting */}
          <line x1="200" y1="172" x2="310" y2="172" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          {/* Top leg abducted 35-45 deg */}
          <line x1="200" y1="172" x2="300" y2="120" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Arrow */}
          <path d="M280 160 C290 150 295 135 295 125" stroke="#EF4444" strokeWidth="2.5" />
          <path d="M295 125 L288 131 M295 125 L298 134" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <text x="270" y="105" fill="#EF4444" fontSize="12" fontWeight="600">30~45도 거상</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">중둔근 고관절 외전 근력 및 편측 지지 안정성</text>
        </svg>
      );

    case 'sit-to-stand':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Chair */}
          <rect x="90" y="130" width="45" height="10" rx="2" fill="#94A3B8" />
          <line x1="95" y1="140" x2="95" y2="190" stroke="#64748B" strokeWidth="4" />
          <line x1="130" y1="140" x2="130" y2="190" stroke="#64748B" strokeWidth="4" />
          <line x1="90" y1="130" x2="90" y2="80" stroke="#64748B" strokeWidth="4" />
          {/* Seated ghost position */}
          <circle cx="120" cy="85" r="11" fill="#CBD5E1" />
          <path d="M120 96 L120 135 L160 135 L160 188" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 3" />
          {/* Standing up movement */}
          <circle cx="230" cy="65" r="13" fill="#3B82F6" />
          <line x1="230" y1="78" x2="230" y2="130" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <line x1="230" y1="130" x2="230" y2="188" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Rising curved arrow */}
          <path d="M150 115 Q180 85 205 75" stroke="#EF4444" strokeWidth="2.5" />
          <path d="M205 75 L196 78 M205 75 L202 85" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <text x="160" y="65" fill="#EF4444" fontSize="12" fontWeight="600">반동 없이 수직 기립</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">대퇴사두근·대둔근 하지 기능적 협응</text>
        </svg>
      );

    case 'chin-tuck':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {/* Wall or back support */}
          <line x1="90" y1="40" x2="90" y2="200" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
          {/* Head & Spine */}
          <circle cx="150" cy="85" r="22" fill="#3B82F6" />
          <path d="M148 107 C148 135, 140 160, 140 190" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
          {/* Horizontal Retraction Arrow */}
          <path d="M185 85 L145 85 M152 78 L145 85 L152 92" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* Hand finger guide */}
          <line x1="210" y1="95" x2="175" y2="95" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 3" />
          <circle cx="175" cy="95" r="4" fill="#0284C7" />
          <text x="195" y="75" fill="#EF4444" fontSize="12" fontWeight="700">턱 수평 후방 당김</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">경추 심부 굴곡근 강화 및 거북목 교정</text>
        </svg>
      );

    case 'scapular-retraction':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {/* Torso Top View */}
          <ellipse cx="200" cy="115" rx="75" ry="35" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="3" />
          <circle cx="200" cy="80" r="18" fill="#3B82F6" />
          {/* Scapulae Left & Right */}
          <path d="M150 110 Q165 125 155 138" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <path d="M250 110 Q235 125 245 138" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Arrows pointing inward */}
          <path d="M140 125 L175 125 M168 120 L175 125 L168 130" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M260 125 L225 125 M232 120 L225 125 L232 130" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="200" y="165" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">날개뼈 뒤쪽 아래로 모음</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">능형근·중하부 승모근 수축 (라운드 숄더 개선)</text>
        </svg>
      );

    case 'codman-pendulum':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {/* Table */}
          <rect x="70" y="110" width="70" height="15" rx="3" fill="#94A3B8" />
          <line x1="85" y1="125" x2="85" y2="190" stroke="#64748B" strokeWidth="4" />
          {/* Bent Torso */}
          <circle cx="150" cy="85" r="13" fill="#3B82F6" />
          <path d="M150 98 L210 115" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <line x1="150" y1="98" x2="110" y2="110" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
          {/* Hanging Pendulum Arm */}
          <line x1="175" y1="105" x2="175" y2="160" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" />
          <circle cx="175" cy="165" r="7" fill="#2563EB" />
          {/* Circular pendulum arc */}
          <ellipse cx="175" cy="170" rx="30" ry="12" stroke="#EF4444" strokeWidth="2.2" strokeDasharray="3 3" />
          <path d="M198 178 L206 172 M198 178 L206 182" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <text x="230" y="165" fill="#EF4444" fontSize="12" fontWeight="700">원형 진자 회전</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">어깨 힘을 빼고 체간 반동으로 회전 가동성 확보</text>
        </svg>
      );

    case 'wrist-stretch':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {/* Forearm extended */}
          <line x1="70" y1="115" x2="230" y2="115" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
          {/* Upward bent palm */}
          <line x1="230" y1="115" x2="230" y2="60" stroke="#2563EB" strokeWidth="7" strokeLinecap="round" />
          {/* Opposite hand gently pulling */}
          <path d="M260 75 Q235 60 220 60" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 3" />
          {/* Arrow */}
          <path d="M245 55 L215 55 M222 48 L215 55 L222 62" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="250" y="45" fill="#EF4444" fontSize="12" fontWeight="700">몸쪽으로 15초 유지</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">손목 수근관 및 전완 굴곡/신전근 이완</text>
        </svg>
      );

    case 'calf-raise':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Wall support */}
          <line x1="80" y1="50" x2="80" y2="190" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          {/* Standing body */}
          <circle cx="160" cy="65" r="12" fill="#3B82F6" />
          <line x1="160" y1="77" x2="160" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <line x1="160" y1="90" x2="85" y2="105" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          {/* Legs with heels raised high */}
          <line x1="160" y1="135" x2="160" y2="175" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <line x1="160" y1="175" x2="185" y2="190" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* Heel elevation arrow */}
          <path d="M150 190 L150 170 M145 175 L150 170 L155 175" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="120" y="160" fill="#EF4444" fontSize="12" fontWeight="700">뒤꿈치 수직 거상</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">비복근·가자미근 강화 및 보행 추진력 회복</text>
        </svg>
      );

    case 'towel-curl':
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* Foot on towel */}
          <path d="M110 145 L135 185 L190 185" stroke="#2563EB" strokeWidth="7" strokeLinecap="round" />
          {/* Towel with ripples */}
          <path d="M130 188 C145 183 155 192 170 188 C185 183 195 192 230 188 L270 188" stroke="#0D9488" strokeWidth="5" strokeLinecap="round" />
          {/* Toes curling inwards arrow */}
          <path d="M210 175 L180 175 M188 170 L180 175 L188 180" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="215" y="165" fill="#EF4444" fontSize="12" fontWeight="700">발가락으로 수건 당김</text>
          <text x="200" y="215" textAnchor="middle" fill="#64748B" fontSize="12">족부 심부 내재근 및 족저근막 강화 (발 아치 회복)</text>
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          <circle cx="200" cy="110" r="30" fill="#3B82F6" opacity="0.1" />
          <circle cx="200" cy="110" r="16" fill="#3B82F6" />
          <text x="200" y="165" textAnchor="middle" fill="#1E293B" fontSize="14" fontWeight="700">전문 재활운동 가이드</text>
          <text x="200" y="185" textAnchor="middle" fill="#64748B" fontSize="12">담당 치료사의 지시에 따라 안전하게 수행하세요</text>
        </svg>
      );
  }
};

