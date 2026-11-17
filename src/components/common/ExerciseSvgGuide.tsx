/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

interface ExerciseSvgGuideProps {
  type: string;
  className?: string;
  isPlaying?: boolean;
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * 0 -> 1 (동작 수행) -> 1 유지 (자세 유지) -> 0 (천천히 복귀) -> 0 휴식 사이클 계산
 */
function getCyclePhase(elapsedMs: number, cycleDurationMs = 4800): {
  t: number;
  phaseLabel: string;
} {
  const mod = elapsedMs % cycleDurationMs;
  const p = mod / cycleDurationMs;

  if (p < 0.35) {
    // 부드럽게 목표 자세로 이동 (easeInOutSine)
    const local = p / 0.35;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * local);
    return { t: eased, phaseLabel: '1. 천천히 동작 수행' };
  }
  if (p < 0.6) {
    // 목표 자세 유지
    return { t: 1, phaseLabel: '2. 목표 자세 유지' };
  }
  if (p < 0.9) {
    // 천천히 시작 자세로 복귀
    const local = (p - 0.6) / 0.3;
    const eased = 0.5 + 0.5 * Math.cos(Math.PI * local);
    return { t: eased, phaseLabel: '3. 천천히 제자리로' };
  }
  return { t: 0, phaseLabel: '준비 자세 (호흡 정리)' };
}

export const ExerciseSvgGuide: React.FC<ExerciseSvgGuideProps> = ({
  type,
  className = 'w-full h-48',
  isPlaying = true
}) => {
  const [elapsedMs, setElapsedMs] = useState<number>(1800); // 기본 정지 상태에서도 목표 동작이 잘 보이도록 설정

  useEffect(() => {
    if (!isPlaying) return;
    let animationFrameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setElapsedMs((prev) => prev + delta);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  const { t, phaseLabel } = getCyclePhase(elapsedMs);
  const angleRad = ((elapsedMs % 3000) / 3000) * Math.PI * 2;

  const renderStatusPill = () => (
    <g>
      <rect
        x="12"
        y="10"
        width="148"
        height="24"
        rx="12"
        fill={isPlaying ? '#EFF6FF' : '#F1F5F9'}
        stroke={isPlaying ? '#BFDBFE' : '#CBD5E1'}
        strokeWidth="1.2"
      />
      <circle
        cx="25"
        cy="22"
        r="4"
        fill={isPlaying ? '#2563EB' : '#94A3B8'}
      />
      <text
        x="35"
        y="26"
        fill={isPlaying ? '#1D4ED8' : '#475569'}
        fontSize="11"
        fontWeight="700"
      >
        {isPlaying ? phaseLabel : '일시정지 (동작 가이드)'}
      </text>
    </g>
  );

  switch (type) {
    case 'knee-chest': {
      // 시작 자세(무릎 세움) -> 가슴 쪽으로 무릎 당김
      const kneeX = lerp(225, 152, t);
      const kneeY = lerp(136, 126, t);
      const footX = lerp(255, 184, t);
      const footY = lerp(186, 144, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          {/* 매트 */}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 베개 */}
          <rect x="60" y="175" width="45" height="15" rx="4" fill="#E2E8F0" />
          {/* 머리 및 상체 */}
          <circle cx="82" cy="168" r="14" fill="#3B82F6" />
          <path d="M96 172 Q150 178 200 178" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 반대쪽 다리 (바닥 고정) */}
          <path d="M200 178 L238 148 L272 188" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {/* 시작 자세 잔상 */}
          <path d="M200 178 L225 136 L255 186" stroke="#CBD5E1" strokeWidth="4" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
          {/* 운동하는 다리 (가슴 쪽으로 당김) */}
          <path d={`M200 178 L${kneeX} ${kneeY} L${footX} ${footY}`} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 무릎을 감싸 잡는 팔 */}
          <path d={`M122 172 Q142 145 ${kneeX} ${kneeY}`} stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          {/* 당기는 방향 화살표 */}
          <path d="M185 106 L148 118 M148 118 L158 110 M148 118 L158 124" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="192" y="108" fill="#EF4444" fontSize="12" fontWeight="700">무릎을 가슴 쪽으로 천천히 당김</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">허리 아래쪽과 엉덩이 근육 부드럽게 늘리기</text>
        </svg>
      );
    }

    case 'cat-camel': {
      // 등 둥글게 말기(고양이, controlY=70) <-> 배 아래로 내리기(낙타, controlY=165)
      const spineControlY = lerp(162, 68, t);
      const headY = lerp(126, 150, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          {/* 바닥 */}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 팔과 다리 기둥 */}
          <line x1="120" y1="190" x2="120" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <line x1="280" y1="190" x2="280" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 기준선 잔상 */}
          <path d="M120 135 Q200 70 280 135" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
          <path d="M120 135 Q200 162 280 135" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
          {/* 실제 움직이는 척추 곡선 */}
          <path d={`M120 135 Q200 ${spineControlY} 280 135`} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <circle cx="104" cy={headY} r="13" fill="#3B82F6" />
          {/* 위아래 방향 안내 */}
          <path d="M200 84 L200 62 M193 69 L200 62 L207 69" stroke="#3B82F6" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="215" y="68" fill="#2563EB" fontSize="12" fontWeight="700">등을 둥글게 말아 올리기 (고양이)</text>
          <text x="215" y="172" fill="#64748B" fontSize="12" fontWeight="600">배를 아래로 부드럽게 내리기 (낙타)</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">굳은 등뼈와 허리뼈를 위아래로 부드럽게 움직이기</text>
        </svg>
      );
    }

    case 'trunk-rotation': {
      // 세운 무릎을 옆으로 천천히 기울이기
      const kneeX = lerp(245, 284, t);
      const kneeY = lerp(122, 152, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 머리 및 몸통 */}
          <circle cx="110" cy="170" r="13" fill="#3B82F6" />
          <path d="M125 174 L220 174" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 양팔 벌려 어깨 고정 */}
          <line x1="150" y1="174" x2="150" y2="122" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" />
          <line x1="150" y1="174" x2="150" y2="188" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" />
          {/* 시작 자세 무릎 잔상 */}
          <path d="M220 174 L245 122 L272 188" stroke="#CBD5E1" strokeWidth="4" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
          {/* 옆으로 기울어지는 무릎 */}
          <path d={`M220 174 L${kneeX} ${kneeY} L275 188`} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 회전 화살표 */}
          <path d="M250 116 C272 118 288 130 296 146" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="3 3" />
          <path d="M296 146 L293 136 M296 146 L286 144" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="262" y="110" fill="#EF4444" fontSize="12" fontWeight="700">두 무릎 붙여 옆으로 기울이기</text>
          <text x="115" y="112" fill="#0284C7" fontSize="12" fontWeight="600">양쪽 어깨 바닥에 붙이기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">허리와 옆구리 근육을 좌우로 부드럽게 늘리기</text>
        </svg>
      );
    }

    case 'bracing': {
      // 배 전체에 단단하게 힘을 주어 버티기
      const rectY = lerp(156, 148, t);
      const rectH = lerp(18, 26, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 누운 상체 */}
          <circle cx="95" cy="170" r="13" fill="#3B82F6" />
          <path d="M110 174 L200 174" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 세운 무릎 */}
          <path d="M200 174 L240 125 L275 188" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 아랫배에 얹은 손 */}
          <path d={`M130 172 Q158 142 170 ${rectY + 6}`} stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
          {/* 배 전체 힘주기 영역 */}
          <rect
            x="142"
            y={rectY}
            width="50"
            height={rectH}
            rx="12"
            fill="#3B82F6"
            fillOpacity={lerp(0.12, 0.3, t)}
            stroke="#2563EB"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
          <path d="M167 136 L167 145 M163 141 L167 145 L171 141" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
          <text x="175" y="124" textAnchor="middle" fill="#2563EB" fontSize="12" fontWeight="700">숨을 쉬면서 배 전체에 단단히 힘주기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">배 안쪽 근육에 힘을 주어 허리 든든하게 받쳐주기</text>
        </svg>
      );
    }

    case 'bird-dog': {
      // 네발기기 자세에서 오른팔 앞으로, 왼다리 뒤로 수평 뻗기
      const armEndX = lerp(155, 75, t);
      const armEndY = lerp(188, 135, t);
      const legEndX = lerp(255, 335, t);
      const legEndY = lerp(188, 135, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 바닥을 짚는 팔과 무릎 */}
          <line x1="170" y1="190" x2="170" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <line x1="240" y1="190" x2="240" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 평평한 등과 허리 */}
          <line x1="165" y1="135" x2="245" y2="135" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <circle cx="152" cy="126" r="12" fill="#3B82F6" />
          {/* 수평 기준선 */}
          <line x1="65" y1="135" x2="345" y2="135" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* 앞으로 뻗는 팔 */}
          <line x1="165" y1="135" x2={armEndX} y2={armEndY} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* 뒤로 뻗는 다리 */}
          <line x1="245" y1="135" x2={legEndX} y2={legEndY} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <text x="205" y="112" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">몸통과 팔다리를 수평 일직선으로 유지</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">몸통이 흔들리지 않게 버티며 반대쪽 팔다리 뻗기</text>
        </svg>
      );
    }

    case 'dead-bug': {
      // 테이블탑 자세에서 반대쪽 팔과 다리를 바닥 쪽으로 뻗기
      const armX = lerp(150, 62, t);
      const armY = lerp(110, 156, t);
      const legKneeX = lerp(215, 265, t);
      const legKneeY = lerp(125, 148, t);
      const legFootX = lerp(260, 315, t);
      const legFootY = lerp(125, 162, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 머리 및 바닥에 붙인 허리 */}
          <circle cx="110" cy="172" r="13" fill="#3B82F6" />
          <line x1="125" y1="174" x2="215" y2="174" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 고정된 쪽 팔과 다리 (90도 유지) */}
          <line x1="150" y1="174" x2="150" y2="110" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          <path d="M215 174 L215 125 L260 125" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {/* 머리 위로 뻗는 팔 */}
          <line x1="150" y1="174" x2={armX} y2={armY} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* 앞으로 뻗는 다리 */}
          <path d={`M215 174 L${legKneeX} ${legKneeY} L${legFootX} ${legFootY}`} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 허리 바닥 밀착 표시 */}
          <rect x="158" y="168" width="42" height="12" rx="4" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" />
          <text x="179" y="156" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700">허리가 바닥에서 뜨지 않게 유지</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">허리를 바닥에 붙인 채 반대쪽 팔과 다리 천천히 뻗기</text>
        </svg>
      );
    }

    case 'bridge': {
      // 엉덩이를 들어 올려 무릎-골반-어깨 일직선 만들기
      const hipY = lerp(174, 142, t);
      const kneeY = lerp(122, 115, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 어깨 및 머리 */}
          <circle cx="90" cy="174" r="13" fill="#3B82F6" />
          {/* 시작 자세 잔상 */}
          <path d="M105 174 L175 174 L225 122 L265 188" stroke="#CBD5E1" strokeWidth="4" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
          {/* 들어 올린 몸통·골반·허벅지 */}
          <path d={`M105 174 L172 ${hipY} L225 ${kneeY} L265 188`} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 일직선 정렬 안내선 */}
          <line x1="100" y1="176" x2="230" y2="112" stroke="#059669" strokeWidth="2" strokeDasharray="3 3" />
          {/* 엉덩이 힘주기 표시 */}
          <circle cx="172" cy={hipY} r="14" fill="#F59E0B" fillOpacity={lerp(0.1, 0.3, t)} stroke="#D97706" strokeWidth="2" />
          <text x="172" y="102" textAnchor="middle" fill="#D97706" fontSize="12" fontWeight="700">엉덩이에 힘주며 골반 들어 올리기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">어깨·골반·무릎이 비스듬히 일직선이 되도록 유지</text>
        </svg>
      );
    }

    case 'clamshell': {
      // 뒤꿈치를 붙인 채 위쪽 무릎 열기
      const upperKneeY = lerp(162, 118, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 머리 및 옆으로 누운 몸통 */}
          <circle cx="100" cy="170" r="13" fill="#3B82F6" />
          <line x1="115" y1="172" x2="200" y2="165" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 아래쪽 다리 (바닥 고정) */}
          <path d="M200 165 L255 165 L235 186" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {/* 위쪽 다리 (무릎이 위로 열림) */}
          <path d={`M200 165 L250 ${upperKneeY} L235 186`} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 열리는 방향 화살표 */}
          <path d="M258 158 C266 146 266 132 256 122" stroke="#EF4444" strokeWidth="2.5" />
          <path d="M256 122 L251 130 M256 122 L264 128" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <text x="275" y="142" fill="#EF4444" fontSize="12" fontWeight="700">뒤꿈치 붙인 채 위쪽 무릎 열기</text>
          <text x="186" y="135" fill="#2563EB" fontSize="11" fontWeight="600">엉덩이 옆쪽 힘</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">골반이 뒤로 넘어가지 않게 고정하고 무릎 벌리기</text>
        </svg>
      );
    }

    case 'side-leg-raise': {
      // 옆으로 누워 위쪽 다리 곧게 들어 올리기
      const footX = lerp(310, 300, t);
      const footY = lerp(172, 116, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 옆으로 누운 상체 */}
          <circle cx="95" cy="170" r="13" fill="#3B82F6" />
          <line x1="110" y1="172" x2="200" y2="172" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          {/* 아래쪽 다리 */}
          <line x1="200" y1="172" x2="310" y2="172" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          {/* 위쪽 다리 들어 올리기 */}
          <line x1="200" y1="172" x2={footX} y2={footY} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* 화살표 */}
          <path d="M285 162 C294 150 298 135 296 122" stroke="#EF4444" strokeWidth="2.5" />
          <path d="M296 122 L289 129 M296 122 L301 130" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <text x="260" y="106" fill="#EF4444" fontSize="12" fontWeight="700">다리를 30~45도 천천히 들어 올리기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">발끝이 정면을 향하도록 유지하며 엉덩이 옆 근육 쓰기</text>
        </svg>
      );
    }

    case 'sit-to-stand': {
      // 의자에 앉은 자세 -> 상체 살짝 숙여 곧게 일어서기
      const hipX = lerp(122, 160, t);
      const hipY = lerp(135, 130, t);
      const shoulderX = lerp(128, 160, t);
      const shoulderY = lerp(95, 78, t);
      const headX = lerp(130, 160, t);
      const headY = lerp(80, 62, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 의자 */}
          <rect x="90" y="135" width="45" height="9" rx="2" fill="#94A3B8" />
          <line x1="95" y1="144" x2="95" y2="190" stroke="#64748B" strokeWidth="4" />
          <line x1="130" y1="144" x2="130" y2="190" stroke="#64748B" strokeWidth="4" />
          <line x1="90" y1="135" x2="90" y2="85" stroke="#64748B" strokeWidth="4" />
          {/* 앉은 자세 잔상 */}
          <circle cx="122" cy="82" r="11" fill="#CBD5E1" />
          <path d="M122 95 L122 135 L160 135 L160 188" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 3" />
          {/* 실제 일어서는 동작 */}
          <circle cx={headX} cy={headY} r="13" fill="#3B82F6" />
          <path
            d={`M${shoulderX} ${shoulderY} L${hipX} ${hipY} L160 148 L160 188`}
            stroke="#2563EB"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 일어서는 화살표 */}
          <path d="M180 120 Q195 90 185 68" stroke="#EF4444" strokeWidth="2.5" />
          <path d="M185 68 L180 77 M185 68 L193 74" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <text x="205" y="88" fill="#EF4444" fontSize="12" fontWeight="700">양발로 바닥을 밀며 천천히 일어서기</text>
          <text x="205" y="110" fill="#475569" fontSize="11">앉을 때도 쿵 주저앉지 않고 천천히</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">허벅지와 엉덩이 힘으로 안전하게 일어섰다 앉기</text>
        </svg>
      );
    }

    case 'chin-tuck': {
      // 고개를 숙이지 않고 턱과 머리를 수평으로 뒤로 당기기
      const headX = lerp(164, 142, t);
      const neckTopX = lerp(160, 140, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          {/* 뒤쪽 벽 기준선 */}
          <line x1="108" y1="45" x2="108" y2="195" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
          {/* 거북목 시작 위치 잔상 */}
          <circle cx="164" cy="85" r="21" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="3 3" />
          {/* 움직이는 머리와 목 */}
          <path d={`M${neckTopX} 105 C148 135, 140 160, 140 190`} stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
          <circle cx={headX} cy="85" r="21" fill="#3B82F6" />
          {/* 수평 뒤쪽 이동 화살표 */}
          <path d="M208 85 L170 85 M177 79 L170 85 L177 91" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* 손가락 가이드 */}
          <line x1="215" y1="98" x2="184" y2="98" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="3 3" />
          <circle cx="184" cy="98" r="4" fill="#0284C7" />
          <text x="220" y="82" fill="#EF4444" fontSize="12" fontWeight="700">턱을 수평으로 뒤로 당기기</text>
          <text x="220" y="102" fill="#0284C7" fontSize="11">고개는 숙이지 않고 시선은 정면 유지</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">앞으로 나온 목을 바르게 세우고 뒷목 편안하게 펴기</text>
        </svg>
      );
    }

    case 'scapular-retraction': {
      // 양쪽 날개뼈를 등 가운데 아래로 모으기
      const leftBladeX = lerp(144, 166, t);
      const rightBladeX = lerp(256, 234, t);
      const bladeYOffset = lerp(0, 6, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          {/* 등 상체 윤곽 */}
          <ellipse cx="200" cy="118" rx="76" ry="38" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="3" />
          <circle cx="200" cy="78" r="17" fill="#3B82F6" />
          {/* 척추 중심선 */}
          <line x1="200" y1="95" x2="200" y2="155" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="3 3" />
          {/* 왼쪽·오른쪽 날개뼈 */}
          <path
            d={`M${leftBladeX} ${106 + bladeYOffset} Q${leftBladeX + 12} ${122 + bladeYOffset} ${leftBladeX + 4} ${136 + bladeYOffset}`}
            stroke="#2563EB"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={`M${rightBladeX} ${106 + bladeYOffset} Q${rightBladeX - 12} ${122 + bladeYOffset} ${rightBladeX - 4} ${136 + bladeYOffset}`}
            stroke="#2563EB"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* 안쪽으로 모으는 화살표 */}
          <path d="M135 124 L172 128 M165 122 L172 128 L164 133" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M265 124 L228 128 M235 122 L228 128 L236 133" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="200" y="176" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">어깨는 내리고 양쪽 날개뼈를 가운데로 모으기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">앞으로 말린 어깨를 펴고 등 가운데 근육 힘 기르기</text>
        </svg>
      );
    }

    case 'codman-pendulum': {
      // 늘어뜨린 팔이 시계추처럼 작은 원을 그림
      const handX = isPlaying ? 175 + Math.cos(angleRad) * 20 : 192;
      const handY = isPlaying ? 166 + Math.sin(angleRad) * 8 : 168;
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          {/* 지지용 테이블 */}
          <rect x="70" y="112" width="70" height="14" rx="3" fill="#94A3B8" />
          <line x1="85" y1="126" x2="85" y2="190" stroke="#64748B" strokeWidth="4" />
          {/* 숙인 상체 및 지지하는 팔/다리 */}
          <circle cx="150" cy="86" r="13" fill="#3B82F6" />
          <path d="M150 98 L215 116 L225 188" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="150" y1="98" x2="112" y2="112" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
          {/* 원형 궤도 안내 */}
          <ellipse cx="175" cy="168" rx="26" ry="10" stroke="#EF4444" strokeWidth="2" strokeDasharray="3 3" />
          {/* 힘을 빼고 늘어뜨린 팔 */}
          <line x1="175" y1="105" x2={handX} y2={handY} stroke="#2563EB" strokeWidth="5" strokeLinecap="round" />
          <circle cx={handX} cy={handY} r="6.5" fill="#2563EB" />
          <text x="225" y="160" fill="#EF4444" fontSize="12" fontWeight="700">팔에 힘을 빼고 작게 원 그리기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">몸통의 가벼운 흔들림을 이용해 어깨 관절 부드럽게 풀기</text>
        </svg>
      );
    }

    case 'wrist-stretch': {
      // 손바닥이 앞을 향하게 뻗고 손가락을 몸쪽으로 부드럽게 당기기
      const handTipX = lerp(234, 212, t);
      const handTipY = lerp(62, 66, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          {/* 곧게 뻗은 팔뚝 */}
          <line x1="75" y1="120" x2="230" y2="120" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
          {/* 시작 손목 위치 잔상 */}
          <line x1="230" y1="120" x2="234" y2="62" stroke="#CBD5E1" strokeWidth="6" strokeDasharray="3 3" strokeLinecap="round" />
          {/* 당겨지는 손목과 손가락 */}
          <line x1="230" y1="120" x2={handTipX} y2={handTipY} stroke="#2563EB" strokeWidth="7" strokeLinecap="round" />
          {/* 반대쪽 손으로 부드럽게 당기는 표시 */}
          <path d={`M262 78 Q238 64 ${handTipX} ${handTipY}`} stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 3" />
          {/* 화살표 */}
          <path d="M248 52 L212 52 M219 46 L212 52 L219 58" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="255" y="56" fill="#EF4444" fontSize="12" fontWeight="700">손가락을 몸 쪽으로 15초 당기기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">팔꿈치를 편 상태에서 팔뚝 안쪽·바깥쪽 근육 늘리기</text>
        </svg>
      );
    }

    case 'calf-raise': {
      // 서서 발뒤꿈치를 수직으로 높이 들어 올리기
      const bodyLiftY = lerp(0, -18, t);
      const heelY = lerp(188, 168, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 지지하는 벽 */}
          <line x1="85" y1="50" x2="85" y2="190" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          {/* 몸통 및 다리 (뒤꿈치를 들며 위로 올라감) */}
          <circle cx="165" cy={72 + bodyLiftY} r="12" fill="#3B82F6" />
          <line x1="165" y1={84 + bodyLiftY} x2="165" y2={138 + bodyLiftY} stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
          <line x1="165" y1={96 + bodyLiftY} x2="90" y2="106" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          {/* 다리와 들려 올린 발뒤꿈치 */}
          <line x1="165" y1={138 + bodyLiftY} x2="165" y2={heelY} stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          <line x1="165" y1={heelY} x2="192" y2="188" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
          {/* 상승 화살표 */}
          <path d="M142 186 L142 160 M136 167 L142 160 L148 167" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="208" y="155" fill="#EF4444" fontSize="12" fontWeight="700">발뒤꿈치를 똑바로 높이 들기</text>
          <text x="208" y="175" fill="#475569" fontSize="11">내려올 때도 천천히 버티며 내리기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">종아리와 발목 근육을 키워 걷는 힘과 균형 잡기</text>
        </svg>
      );
    }

    case 'towel-curl': {
      // 발뒤꿈치를 붙이고 발가락으로 수건 움켜쥐어 당기기
      const toeX = lerp(205, 178, t);
      const archY = lerp(185, 176, t);
      const towelEnd = lerp(275, 248, t);
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <line x1="40" y1="190" x2="360" y2="190" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          {/* 발목 · 발뒤꿈치 · 발바닥 아치 · 발가락 */}
          <path
            d={`M125 135 L135 185 Q162 ${archY} ${toeX} 185`}
            stroke="#2563EB"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 주름지며 당겨지는 수건 */}
          <path
            d={`M132 188 C150 ${lerp(187, 178, t)} 162 192 176 ${lerp(187, 179, t)} C190 184 202 191 ${towelEnd} 188`}
            stroke="#0D9488"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* 당기는 방향 화살표 */}
          <path d="M225 170 L188 170 M196 164 L188 170 L196 176" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <text x="232" y="168" fill="#EF4444" fontSize="12" fontWeight="700">발가락으로 수건 움켜쥐어 당기기</text>
          <text x="200" y="218" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">발뒤꿈치는 바닥에 붙이고 발바닥 아치 근육 힘 기르기</text>
        </svg>
      );
    }

    default:
      return (
        <svg viewBox="0 0 400 240" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="240" rx="8" fill="#F8FAFC" />
          {renderStatusPill()}
          <circle cx="200" cy="110" r="30" fill="#3B82F6" opacity="0.1" />
          <circle cx="200" cy="110" r="16" fill="#3B82F6" />
          <text x="200" y="165" textAnchor="middle" fill="#1E293B" fontSize="14" fontWeight="700">맞춤 재활운동 동작 가이드</text>
          <text x="200" y="185" textAnchor="middle" fill="#64748B" fontSize="12">담당 물리치료사의 안내에 따라 천천히 따라 해보세요</text>
        </svg>
      );
  }
};
